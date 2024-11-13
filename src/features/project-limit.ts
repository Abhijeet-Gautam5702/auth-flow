import mongoose from "mongoose";
import { Project } from "../models/project.model";
import { logger } from "../utils/logger";
import { responseType } from "../constants";
import { User } from "../models/user.model";
import { Session } from "../models/session.model";
import { Log } from "../models/security-log.model";

export class ProjectLimit {
  private maxUsers: number = 100;
  private maxUserSessions: number = 5;
  private projectId: mongoose.Types.ObjectId | string;
  public userActivityThreshold: number = 90; // Accounts inactive for 3 months will be deleted

  constructor(projectId: mongoose.Types.ObjectId | string) {
    this.projectId = projectId;
    (async () => {
      try {
        const project = await Project.findById(projectId);
        this.maxUsers = project?.config.security?.userLimit!;
        this.maxUserSessions = project?.config.security?.userSessionLimit!;
      } catch (error: any) {
        logger(
          responseType.UNSUCCESSFUL.type,
          `ProjectLimit class initiaton failed | Error: ${error.message}`
        );
        throw error;
      }
    })();
  }

  // Clear all the inactive user-accounts of the project
  public clearInactiveUserAccounts = async () => {
    try {
      // Get all the userIDs enrolled in the project
      const enrolledUsers = await User.aggregate([
        {
          $match: {
            projectId: new mongoose.Types.ObjectId(this.projectId),
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

      // Create threshold date
      const now = new Date();
      const thresholdDate = new Date(
        // now.getTime() - this.userActivityThreshold * 24 * 60 * 60 * 1000
        now.getTime() - 60 * 60 * 1000 // TESTING ONLY
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

          logger(
            responseType.DELETED.type,
            `Deleted ${inactiveUsers.length} inactive user accounts successfully.`
          );
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

  // Clear all the sessions of the project whose refresh token has expired
  public clearExpiredSessions = async () => {
    // Get all the user-IDs enrolled in the project
    // Delete all the sessions of each user-ID
  };

  // Check if the number of users have crossed the upper-limit and send email to the admin
  public handleExcessiveUserAccounts = async () => {
    // Count the users enrolled in the project
    // If the users exceed the maxLimit => Send e-mail to the admin
  };

  // Check if the number of sessions have crossed the upper-limit and send email to the user
  public handleExcessiveUserSessions = async (
    userId: mongoose.Types.ObjectId | string
  ) => {
    // Count the user-sessions of the given userId
    // If the user-sessions exceed the maxLimit => Send e-mail to the admin
  };
}
