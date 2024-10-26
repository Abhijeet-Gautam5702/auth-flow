// Middleware for authenticating the admin (to grant access to secured routes)

import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model";
import { ApiError } from "../utils/custom-api-error";
import { responseType } from "../constants";
import { IRequest, IAdmin } from "../types/types";
import mongoose from "mongoose";

export const authenticateAdmin = asyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    // Get access-token from browser cookies or authorization header
    const accessToken =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies["admin-access-token"];
    if (!accessToken) {
      throw new ApiError(
        responseType.ACCESS_TOKEN_INVALID.code,
        responseType.ACCESS_TOKEN_INVALID.type,
        "Admin access token not found in request-header or browser cookies"
      );
    }

    // Decode token to get admin-ID
    const decodedToken = jwt.decode(accessToken) as { adminId: string } | null;

    // Check if the admin exists in the database
    const adminId = decodedToken?.adminId;
    const adminFromDB: IAdmin = await Admin.findById(adminId).select(
      "-password -refreshToken"
    );
    if (!adminFromDB) {
      throw new ApiError(
        responseType.ACCESS_TOKEN_INVALID.code,
        responseType.ACCESS_TOKEN_INVALID.type,
        "Admin corresponding to the token not found in the database"
      );
    }

    // Check if the token is expired
    if (adminFromDB.accessTokenExpiry < new Date()) {
      throw new ApiError(
        responseType.ACCESS_TOKEN_EXPIRED.code,
        responseType.ACCESS_TOKEN_EXPIRED.type,
        "Refresh the admin access token"
      );
    }

    // Attach additional admin-object to HTTP-req object
    req.admin = {
      id: adminFromDB._id as mongoose.Schema.Types.ObjectId,
    };

    // Pass control to next middleware/controller
    next();
  }
);
