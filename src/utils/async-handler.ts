import { responseType } from "../constants";
import { NextFunction, Request, Response } from "express"; // Importing request and response types from Express
import { IRequest } from "../types/types";

// Wrapper for every API-controller
/*
    NOTE: The callback function will be an asynchronous function which returns nothing, so its return type would be Promise<void> (a generic).
*/

// TYPESCRIPT: Express doesn't expect us to return anything in an API-call (instead, just modify the response object)
export const asyncHandler = (
  callback: (req: IRequest, res: Response, next: NextFunction) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await callback(req, res, next);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        statusCode: error.statusCode || responseType.SERVER_ERROR.code,
        message: error.message || "Something went wrong at our end",
        errors: error.errors || [],
        type: error.type || responseType.SERVER_ERROR.type,
        success: false,
      });
    }
  };
};
