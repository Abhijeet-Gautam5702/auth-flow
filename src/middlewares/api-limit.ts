// Middleware to limit the API-requests from a particular IP-address
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/async-handler";
import { IRequest } from "../types/types";
import { NextFunction, Response } from "express";
import { ApiError } from "../utils/custom-api-error";
import { responseType } from "../constants";

/* ------------------------ API RATE LIMITER CLASS ------------------------------------- */

class ApiRateLimiter {
  // Overall Rate Limiter for the entire app
  overall(interval: number, requestLimit: number) {
    return rateLimit({
      windowMs: interval,
      limit: requestLimit,
      handler: asyncHandler(
        async (req: IRequest, res: Response, next: NextFunction) => {
          throw new ApiError(
            responseType.API_LIMIT_EXCEEDED.code,
            responseType.API_LIMIT_EXCEEDED.type,
            "Too many requests from this IP-address. Please try again after some time"
          );
        }
      ),
    });
  }
}

export const apiRateLimiter = new ApiRateLimiter();
