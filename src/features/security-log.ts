import mongoose from "mongoose";
import { EventCode } from "../types/types";
import { logger } from "../utils/logger";
import { responseType } from "../constants";
import { ApiError } from "../utils/custom-api-error";
import { User } from "../models/user.model";
import { Log } from "../models/security-log.model";

type IEventInput = {
  userId: mongoose.Types.ObjectId | string;
  eventCode: EventCode;
  eventSuccess: boolean;
  message?: string;
  sessionId?: mongoose.Types.ObjectId | string;
};

class SecurityLog {
  private logStorageDays: number = 30;

  // Create a log-event of a user and project
  public logEvent = async ({
    userId,
    eventCode,
    eventSuccess,
    message,
    sessionId,
  }: IEventInput) => {
    try {
      const userFromDB = await User.findById(userId).select("-password");
      if (!userFromDB) {
        throw new ApiError(
          responseType.NOT_FOUND.code,
          responseType.NOT_FOUND.type,
          `Could not log event | User not found.`
        );
      }

      const createdLog = await Log.create({
        userId,
        projectId: userFromDB.projectId,
        event: {
          code: eventCode,
          success: eventSuccess,
        },
        sessionId,
        message,
      });

      return createdLog;
    } catch (error: any) {
      logger(
        responseType.UNSUCCESSFUL.type,
        `Unable to log event | Error: ${error.message}`
      );
      throw new ApiError(
        responseType.UNSUCCESSFUL.code,
        responseType.UNSUCCESSFUL.type,
        `Unable to log event to the database.`,
        error
      );
    }
  };

  // Admin Method:: Clear all expired logs (older than `threshold` days)
  public clearExpiredLogs = async () => {
    try {
      const thresholdDate = new Date(
        new Date().getTime() - this.logStorageDays * 24 * 60 * 60 * 1000
      );

      // Delete all entries in the collection older than the threshold date
      await Log.deleteMany({
        createdAt: {
          $lt: thresholdDate,
        },
      });
    } catch (error: any) {
      logger(
        responseType.UNSUCCESSFUL.type,
        `Could not clear expired logs | Error: ${error.message}`
      );
      throw new ApiError(
        responseType.UNSUCCESSFUL.code,
        responseType.UNSUCCESSFUL.type,
        `Could not clear expired logs.`,
        error
      );
    }
  };

  // Admin & User Method:: Get user logs (with date filter and pagination)
  public getUserLogs = async() => {}

  // Admin & User Method:: Get user logs by event (with date filter and pagination)

  // Admin Method:: Get logs by projectId (with date filter and pagination)
}

export const securityLog = new SecurityLog();
