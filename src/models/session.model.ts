import { Schema, Types, model } from "mongoose";
import {
  DeviceType,
  IProject,
  ISession,
  ISessionMethods,
  ISessionModel,
} from "../types/types";
import { logger } from "../utils/logger";
import { responseType } from "../constants";
import { Project } from "./project.model";

const SessionSchema = new Schema<ISession, ISessionModel, ISessionMethods>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accessToken: {
      type: String,
      unique: true,
    },
    accessTokenExpiry: {
      type: Date,
    },
    refreshToken: {
      type: String,
      unique: true,
    },
    refreshTokenExpiry: {
      type: Date,
    },
    details: {
      userAgent: {
        type: String,
        required: true,
      },
      os: {
        type: String,
        required: true,
      },
      deviceType: {
        type: String,
        enum: Object.values(DeviceType),
        required: true,
      },
      networkIP: {
        type: String,
        required: false,
      },
    },
  },
  { timestamps: true, validateBeforeSave: true }
);

/* ------------------------------ STATIC METHODS ------------------------------- */

// Static method: Clear expired sessions of a user in a project
SessionSchema.statics.clearExpiredSessions = async function (
  userId: Types.ObjectId,
  projectId: Types.ObjectId
): Promise<number> {
  try {
    const result = await this.deleteMany({
      projectId,
      userId,
      refreshTokenExpiry: {
        $lte: new Date(),
      },
    });
    return result.deletedCount;
  } catch (error: any) {
    logger(
      responseType.DATABASE_ERROR.type,
      `Unable to clear expired sessions | ${error.message}`
    );
    throw error;
  }
};

// Static method: Handle a new user-session
SessionSchema.statics.handleNewSession = async function (
  userId: Types.ObjectId,
  projectId: Types.ObjectId
): Promise<{
  success: boolean;
  project: IProject;
}> {
  try {
    // Clear the expired sessions of the user
    const deletedExpiredSessionCount = await this.clearExpiredSessions(
      userId,
      projectId
    );

    // Count the sessions of the user
    const sessionCount = await this.countDocuments({ userId, projectId });

    // Get the userSessionsLimit of the project
    const project = await Project.findById(projectId);
    const userSessionsLimit = project?.config.security?.userSessionLimit;

    if (sessionCount >= userSessionsLimit!) {
      logger(
        responseType.DATABASE_ERROR.type,
        `User-Sessions Limit for the user (as defined for the project) has exceeded. Cannot add another user-session.`
      );
      return { success: false, project: project! };
    }

    return { success: true, project: project! };
  } catch (error: any) {
    logger(
      responseType.DATABASE_ERROR.type,
      `Unable to handle a new session | ${error.message}`
    );
    throw error;
  }
};

/*
  The `model<>` generic incorporates the information regarding the document type and the model type.
  Document type (ISession): ISession extends ISessionBase, Document
  Model type (IsessionModel): ISessionModel extends ISessionMethods, ISessionStaticMethods

  NOTE-1: The static methods will be recognized by TypeScript only if ISessionModel is provided
*/
export const Session = model<ISession, ISessionModel, {}>(
  "Session",
  SessionSchema
);
