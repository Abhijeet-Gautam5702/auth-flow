import mongoose, { Types } from "mongoose";
import { Project } from "../models/project.model";
import { logger } from "../utils/logger";
import { responseType } from "../constants";
import { User } from "../models/user.model";
import { Session } from "../models/session.model";
import { Log } from "../models/security-log.model";
import { emailService } from "./email";
import { Admin } from "../models/admin.model";
import { IAdmin, IProject } from "../types/types";

export class ProjectLimit {
  private project: IProject;
  private admin: IAdmin;
  public userCount: number;
  public maxUsers: number = 100;
  public userActivityThreshold: number = 90; // Accounts inactive for 3 months will be deleted
  private maxUserSessions: number = 5;


  private constructor(
    project: IProject,
    admin: IAdmin,
    userCount: number,
    maxUsers: number
  ) {
    this.project = project;
    this.admin = admin;
    this.maxUsers = maxUsers;
    this.userCount = userCount;
  }

  /* ------------------------------ STATIC METHODS ------------------------------------- */

  // Static create-method
  /*
    NOTE: 
    The constructor cannot be asynchronous, but we need to make database calls to initialize the class variables. So, we create a static method (that is called on the entire class and not the instances) on the ProjectLimit class which can be asynchronous, execute all the database calls and then invoke the constructor to give an instance of ProjectLimit class. 
  */
  public static create = async (projectId: Types.ObjectId) => {
    try {
      const aggregationResult = await Project.aggregate([
        {
          $match: {
            _id: projectId,
          },
        },
        {
          $lookup: {
            from: "admins",
            localField: "owner",
            foreignField: "_id",
            as: "admin",
          },
        },
        {
          $unwind: "$admin",
        },
        {
          $project: {
            owner: 0,
            __v: 0,
          },
        },
      ]);
      const project = aggregationResult[0];
      const admin = project.admin;
      const userCount = await User.countDocuments({ projectId });
      const maxUsers = project.config.security.userLimit;

      return new ProjectLimit(project, admin, userCount, maxUsers);
    } catch (error: any) {
      logger(
        responseType.UNSUCCESSFUL.type,
        `ProjectLimit class initiaton failed | Error: ${error.message}`
      );
      throw error;
    }
  };

  /* ------------------------------ INSTANCE METHODS ------------------------------------- */

  // Clear all the inactive user-accounts of the project
  public clearInactiveUserAccounts = async () => {
    try {
      // Get all the userIDs enrolled in the project
      const enrolledUsers = await User.aggregate([
        {
          $match: {
            projectId: this.project._id,
          },
        },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);
      if (!enrolledUsers.length) {
        throw new Error("No users in this project.");
      }

      // Create threshold date
      const now = new Date();
      const thresholdDate = new Date(
        now.getTime() - this.userActivityThreshold * 24 * 60 * 60 * 1000
      );

      const BATCH_SIZE = 50; // Process only 50 user-accounts at a time to avoid memory issues
      const inactiveUsers: mongoose.Types.ObjectId[] = [];

      // Process one batch at a time
      for (let i = 0; i < enrolledUsers.length; i += BATCH_SIZE) {
        // Prepare a batch of users to be processed
        const usersInBatch = enrolledUsers.slice(i, i + BATCH_SIZE);

        /*
          NOTE-1: 
          - `forEach` or `map` doesn't wait for the async operation to complete. It will create an array of promises but wont wait for them to resolve.
          - Promise.all(callback) resolves the promises in the array and give an array containing the resolved values.

          NOTE-2:
          SEQUENTIAL PROCESSING USING `for..of` CONSTRUCT
          for (const user of usersInBatch) {
            const session = await Session.findOne({
              userId: user._id,
              updatedAt: {
                $gte: thresholdDate,
              },
            });
            if (session) {
              inactiveUsers.push(user._id);
            }
          }
        */
        const inactiveUsersInBatch = await Promise.all(
          usersInBatch.map(async (user) => {
            const session = await Session.findOne({
              userId: user._id,
              updatedAt: {
                $gte: thresholdDate,
              },
            });
            return session ? null : user._id;
          })
        );

        // Push the batch items to the `inactiveUsers` array
        inactiveUsers.push(
          ...inactiveUsersInBatch.filter((userId) => userId !== null)
        );
      }

      // Delete the user-accounts and related sessions/logs
      if (inactiveUsers.length) {
        // Start a Mongo-DB Session
        const transactionSession = await mongoose.startSession();
        try {
          // Transaction starts
          /*
              NOTE: 
              No need to explicitly write `sessionName.abortTransaction()` & `sessionName.commitTransaction()` as `sessionName.withTransaction(callback)` handles those automatically
          */
          await transactionSession.withTransaction(async () => {
            // Delete inactive users
            await User.deleteMany({
              _id: {
                $in: inactiveUsers,
              },
            }).session(transactionSession);

            // Delete related sessions of the inactive users
            await Session.deleteMany({
              userId: {
                $in: inactiveUsers,
              },
            }).session(transactionSession);

            // Delete the related logs of the inactive users
            await Log.deleteMany({
              userId: {
                $in: inactiveUsers,
              },
            }).session(transactionSession);
          });
        } catch (error: any) {
          logger(
            responseType.DATABASE_ERROR.type,
            `Transaction Failed | ${error.message}`
          );
          throw error;
        } finally {
          transactionSession.endSession(); // End the Mongo-DB Session
        }
      }

      logger(
        responseType.DELETED.type,
        `Deleted ${inactiveUsers.length} inactive user accounts in Project: ${this.project._id}`
      );

      // Return the count of the inactive users deleted
      return inactiveUsers.length;
    } catch (error: any) {
      logger(
        responseType.DATABASE_ERROR.type,
        `Unable to clear inactive accounts | ${error.message}`
      );
      throw error;
    }
  };

  // Clear all the expired sessions of the project
  public clearExpiredSessions = async () => {
    try {
      await Session.deleteMany({
        projectId: this.project._id,
        refreshTokenExpiry: {
          $lte: new Date(),
        },
      });

      logger(
        responseType.DELETED.type,
        `Deleted expired Sessions in Project: ${this.project._id}`
      );
    } catch (error: any) {
      logger(
        responseType.DATABASE_ERROR.type,
        `Unable to delete expired User-Sessions | ${error.message}`
      );
      throw error;
    }
  };

  // Check if the number of users have crossed the upper-limit and send email to the admin
  public handleNewUserAccount = async () => {
    try {
      // Increment the user-count
      this.userCount +=1;

      // If the userCount exceed the maxLimit => Send e-mail to the admin
      if (this.userCount >= this.maxUsers) {
        const project = this.project;
        const projectAdmin = this.admin;

        // Get the email-template (either custom or the default)
        const customEmailTemplate =
          project?.config.emailTemplates?.userLimitExceeded;
        const userLimitExceededEmail =
          customEmailTemplate ||
          emailService.userLimitExceeded({
            id: String(this.project._id),
            name: project.projectName,
          });

        // Send email
        await emailService.send(
          projectAdmin?.email!,
          `⚠️ User Limit Reached`,
          userLimitExceededEmail
        );
      }
    } catch (error: any) {
      logger(
        responseType.DATABASE_ERROR.type,
        `Unable to handle new User-Account | ${error.message}`
      );
      throw error;
    }
  };
}
