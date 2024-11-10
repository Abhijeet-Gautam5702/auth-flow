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
  userId: string | mongoose.Types.ObjectId;
  projectId: string | mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  page: number;
  queryItemCount: number;
  eventCode: EventCode;
};

class SecurityLog {
  private logStorageDays: number = 30;
  private defaultItemCount: number = 10;

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
    page,
    queryItemCount,
  }: Omit<ILogInput, "eventCode">) => {
    // Caclulat the number of documents to skip (based on the Page number and query-item-count)
    const skipDocs = (page - 1) * (queryItemCount || this.defaultItemCount);

    // Calculate the total number of logs for the given userId (& projectId)
    const totalDocs = await Log.countDocuments({
      $and: [
        { userId },
        { projectId },
        {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      ],
    });

    // Get all the log-documents based on userId (& projectId)
    /*
      Note: Instead of creating an aggregation pipeline, we can simply use the in-built methods to get the work done
    */
    const queryDocs = await Log.find({
      userId,
      projectId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ createdAt: -1 }) // Sort according to the index (newest first)
      .skip(skipDocs)
      .limit(queryItemCount || this.defaultItemCount);

    return {
      queryDocs,
      pagination: {
        currentPage: page,
        totalDocs,
        totalPages: Math.ceil(
          totalDocs / (queryItemCount || this.defaultItemCount)
        ),
      },
    };
  };

  // Admin & User Method:: Get user logs by event (with date filter and pagination)
  /*
    NOTE: TypeScript doesn't throw an error even if some of the properties are not present in the argument because it performs type-checking on the destructured properties only. It assumes that there might be some properties in the argument object which are not being destructured. Hence it doesn't throw any error.
  */
  public getLogsByEvent = async ({
    projectId,
    eventCode,
    startDate,
    endDate,
    page,
    queryItemCount,
  }: Omit<ILogInput, "userId">) => {
    // Calculate the number of document to skip (according to the page-no. and item-count)
    const skipDocs = (page - 1) * (queryItemCount || this.defaultItemCount);

    // Calculate the total number of documents corresponding to the given event-code (within the project)
    const totalDocs = await Log.countDocuments({
      $and: [
        {
          projectId,
        },
        {
          event: {
            code: eventCode,
          },
        },
        {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      ],
    });

    const queryDocs = await Log.find({
      projectId,
      "event.code": eventCode, // Used for matching nested properties (Can be done using $and as well)
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ createdAt: -1 })
      .skip(skipDocs)
      .limit(queryItemCount || this.defaultItemCount);

    return {
      queryDocs,
      pagination: {
        currentPage: page,
        totalDocs,
        totalPages: Math.ceil(
          totalDocs / (queryItemCount || this.defaultItemCount)
        ),
      },
    };
  };
}

export const securityLog = new SecurityLog();
