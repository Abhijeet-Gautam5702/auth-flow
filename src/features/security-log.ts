import mongoose, { skipMiddlewareFunction } from "mongoose";
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

type ILogInput = {
  userId?: string | mongoose.Types.ObjectId;
  projectId: string | mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  page: number;
  queryItemCount: number;
  eventCode?: string;
};

class SecurityLog {
  private logStorageDays: number = 30;
  private defaultItemCount: number = 10;

  // Helper function to fetch security-logs using different queries
  private helper_getLogs = async <T extends ILogInput>(
    input: T,
    query: object
  ) => {
    try {
      // Calculate the number of document to skip (according to the page-no. and item-count)
      const skipDocs = (input.page - 1) * input.queryItemCount;

      // Calculate the total number of documents corresponding to the given event-code (within the project)
      const totalDocs = await Log.countDocuments(query);
      if (Math.ceil(totalDocs / input.queryItemCount) < input.page) {
        throw new ApiError(
          responseType.UNSUCCESSFUL.code,
          responseType.UNSUCCESSFUL.type,
          `We do not have enough data for Page-${input.page}`
        );
      }

      // Get all the log-documents based on the event-code
      const queryDocs = await Log.find(query)
        .sort({ createdAt: -1 })
        .skip(skipDocs)
        .limit(input.queryItemCount);

      return {
        queryDocs,
        pagination: {
          currentPageNumber: input.page,
          totalDocs,
          totalPages: Math.ceil(totalDocs / input.queryItemCount),
        },
      };
    } catch (error: any) {
      logger(responseType.SERVER_ERROR.type, error.message);
      throw new ApiError(
        responseType.SERVER_ERROR.code,
        responseType.SERVER_ERROR.type,
        `Could not get User-Logs.`,
        error
      );
    }
  };

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

  // Clear all expired logs (older than `threshold` days)
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

  // Get user logs (with date filter and pagination)
  /*
    NOTE: TypeScript doesn't throw an error even if some of the properties are not present in the argument because it performs type-checking on the destructured properties only. It assumes that there might be some properties in the argument object which are not being destructured. Hence it doesn't throw any error.
  */
  /*
    `Omit<ILogInput, "eventCode">`

    We have to use ILogInput interface in multiple places but with very slight changes (one has `userId` while other doesn't; same with `eventCode` field). So, creating 2 separate interfaces would be an overkill. Therefore, TypeScript provides the `Omit< Type, excludedKey >` generic to exclude some properties from a type/interface.
    
    For example:- 
    To exclude `userId` & `projectId` from ILogInput => Omit<ILogInput, "userId" | "projectId">
    

    ALTERNATIVE METHOD (and Best Practice as well)
    
    interface ILogInputBase = {
      projectId: string | mongoose.Types.ObjectId;
      startDate: Date;
      endDate: Date;
      page: number;
      queryItemCount: number;
    };

    interface ILogByUserId extends ILogInputBase {
      userId: string | mongoose.Types.ObjectId;
    }
    
    interface ILogByEvent extends ILogInputBase {
      eventCode: EventCode;
    }

  */
  public getLogsByUserID = async ({
    userId,
    projectId,
    startDate,
    endDate,
    page = 1,
    queryItemCount = this.defaultItemCount,
  }: Omit<ILogInput, "eventCode">) => {
    // Create query
    const query = {
      userId,
      projectId,
      // Add `createdAt` filter only if at lease one of the dates are non-null
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { $gte: startDate } : {}), // Add startDate property only if it is non-null
              ...(endDate ? { $lte: endDate } : {}), // Add endDate property only if it is non-null
            },
          }
        : {}),
    };

    return await this.helper_getLogs<Omit<ILogInput, "eventCode">>(
      {
        userId,
        projectId,
        startDate,
        endDate,
        page,
        queryItemCount,
      },
      query
    );
  };

  // Get logs by specific event (with date filter and pagination)
  /*
    NOTE: TypeScript doesn't throw an error even if some of the properties are not present in the argument because it performs type-checking on the destructured properties only. It assumes that there might be some properties in the argument object which are not being destructured. Hence it doesn't throw any error.
  */
  public getAllLogsByEvent = async ({
    projectId,
    eventCode,
    startDate,
    endDate,
    page = 1,
    queryItemCount = this.defaultItemCount,
  }: Omit<ILogInput, "userId">) => {
    // Create query
    const query = {
      projectId,
      "event.code": eventCode, // Used for matching nested properties (Can be done using $and as well)
      // Add `createdAt` filter only if at lease one of the dates are non-null
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { $gte: startDate } : {}), // Add startDate property only if it is non-null
              ...(endDate ? { $lte: endDate } : {}), // Add endDate property only if it is non-null
            },
          }
        : {}),
    };

    return await this.helper_getLogs<Omit<ILogInput, "userId">>(
      {
        projectId,
        eventCode,
        startDate,
        endDate,
        page,
        queryItemCount,
      },
      query
    );
  };

  // Get user-logs by specific event (with date filter and pagination)
  public getUserLogsByEvent = async ({
    projectId,
    userId,
    eventCode,
    startDate,
    endDate,
    page = 1,
    queryItemCount = this.defaultItemCount,
  }: ILogInput) => {
    // Create query
    const query = {
      userId,
      projectId,
      "event.code": eventCode,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { $gte: startDate } : {}),
              ...(endDate ? { $lte: endDate } : {}),
            },
          }
        : {}),
    };

    return await this.helper_getLogs<ILogInput>(
      {
        projectId,
        userId,
        eventCode,
        startDate,
        endDate,
        page,
        queryItemCount,
      },
      query
    );
  };
}

export const securityLog = new SecurityLog();
