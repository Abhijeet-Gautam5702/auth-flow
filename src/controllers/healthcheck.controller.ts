// Test-controller to check whether the backend APIs are working

import { responseType } from "../constants";
import { asyncHandler } from "../utils/async-handler";
import { ApiResponse } from "../utils/custom-api-response";
import { Request, Response } from "express";

// TYPESCRIPT: Express doesn't expect us to return anything in an API-call (instead, just modify the response object)

export const healthCheck = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
     res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Health check OK",
          {},
          responseType.SUCCESSFUL.type
        )
      );
  }
);
