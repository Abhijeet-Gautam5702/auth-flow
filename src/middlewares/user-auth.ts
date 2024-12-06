import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { ApiError } from "../utils/custom-api-error";
import { responseType } from "../constants";
import { Session } from "../models/session.model";
import { IRequest} from "../types/types";

export const authenticateUser = asyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    // Get access-token from browser cookies or authorization header
    const accessToken =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies["user-access-token"];
    if (!accessToken) {
      throw new ApiError(
        responseType.ACCESS_TOKEN_INVALID.code,
        responseType.ACCESS_TOKEN_INVALID.type,
        "Access token not found in request-header or browser cookies"
      );
    }

    // Check if the corresponding session-document exists in database
    const sessionFromDB = await Session.findOne({
      accessToken,
    });
    if (!sessionFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Session corresponding to access-token not found in database"
      );
    }

    // Check if the token is expired
    if (sessionFromDB.accessTokenExpiry < new Date()) {
      throw new ApiError(
        responseType.ACCESS_TOKEN_EXPIRED.code,
        responseType.ACCESS_TOKEN_EXPIRED.type,
        "Refresh the access token"
      );
    }

    // Decode the token to get userId
    const decodedToken = jwt.decode(accessToken) as { userId: string } | null;

    // Check if user exists in database
    const userId = decodedToken?.userId;
    const userFromDB = await User.findById(userId).select(
      "-password -verificationToken -resetPasswordToken"
    );
    if (!userFromDB) {
      throw new ApiError(
        responseType.ACCESS_TOKEN_INVALID.code,
        responseType.ACCESS_TOKEN_INVALID.type,
        "User corresponding to the token not found in the database"
      );
    }

    // Attach a additional object(s) to the HTTP-`req` object
    req.user = {
      id: userFromDB._id,
    };
    req.session = {
      id: sessionFromDB._id,
      token: accessToken,
    };

    next();
  }
);
