import { responseType } from "../../constants";
import { Request, Response } from "express"; // Importing request and response types from Express

// Wrapper for every API-controller
/*
    NOTE: The callback function will be an asynchronous function which returns nothing, so its return type would be Promise<void> (a generic).
*/

// TYPESCRIPT: Express doesn't expect us to return anything in an API-call (instead, just modify the response object)
export const asyncHandler = (
  callback: (req: Request, res: Response) => Promise<void>
) => {
  return async (req: Request, res: Response) => {
    try {
      await callback(req, res);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        statusCode: error.statusCode || responseType.SERVER_ERROR.code,
        message: error.message || "Something went wrong at our end",
        errors: error.errors || [],
        type: responseType.SERVER_ERROR.type,
        success: false,
      });
    }
  };
};
