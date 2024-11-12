import mongoose from "mongoose";
import { Project } from "../models/project.model";
import { logger } from "../utils/logger";
import { responseType } from "../constants";

export class ProjectLimit {
  private maxUsers: number = 100;
  private maxUserSessions: number = 5;
  private projectId: mongoose.Types.ObjectId | string;

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
  public handleExcessiveUserSessions = async (userId:mongoose.Types.ObjectId | string) => {
    // Count the user-sessions of the given userId
    // If the user-sessions exceed the maxLimit => Send e-mail to the admin
  };
}
