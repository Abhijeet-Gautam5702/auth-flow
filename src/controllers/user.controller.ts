import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import { cookieOptions, env, responseType } from "../constants";
import { validateSignupInput } from "../schema/validation";
import { User } from "../models/user.model";
import { ApiResponse } from "../utils/custom-api-response";
import { filterObject } from "../utils/filter-object";
import { generateToken } from "../utils/token-generator";
import { Session } from "../models/session.model";
import { IRequest } from "../types/types";

// CREATE USER ACCOUNT
export const createAccount = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Project-validation middleware: Authenticate the Project

    // Get the user credentials
    const { username, email, password } = req.body;
    if (!(username && email && password)) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "One or more field(s) are not provided. Please enter all fields."
      );
    }
    // Validate schema of input fields
    const validation = validateSignupInput({ username, password, email });
    if (!validation.success) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "One or more input fields do not conform the prescribed format",
        validation.errors
      );
    }
    // Verify if user already exists
    const userFromDB = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (userFromDB) {
      throw new ApiError(
        responseType.ALREADY_EXISTS.code,
        responseType.ALREADY_EXISTS.type,
        "User already present in the database. Please Login."
      );
    }
    // Create a new account
    const createdUser = await User.create({
      projectId:req.project?.id ,
      email,
      username,
      password,
    });

    // Remove sensitive data from the user-data (newly created)
    /* Note: Another database call is not made to reduce the number of interactions with the Database */
    const userData = filterObject(createdUser, [], ["password"]);

    // Send response
    res
      .status(200)
      .json(
        new ApiResponse(
          responseType.ACCOUNT_CREATED.code,
          responseType.ACCOUNT_CREATED.type,
          "User account created successfully.",
          userData
        )
      );
  }
);

// CREATE USER LOGIN SESSION
export const createLoginSession = asyncHandler(
  async (req: Request, res: Response) => {
    // Get the user credentials
    const { username, email, password } = req.body;
    if (!(username && email && password)) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "One or more field(s) are not provided. Please enter all fields."
      );
    }
    // Validate schema of input fields
    const validation = validateSignupInput({ username, password, email });
    if (!validation.success) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "One or more input fields do not conform the prescribed format",
        validation.errors
      );
    }

    // Check if the user exists in the database
    const userFromDB = await User.findOne({
      $and: [{ email }, { username }],
    });
    if (!userFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "User not found in database. Enter the correct login credentials"
      );
    }

    // Validate the password
    const isPasswordCorrect = await userFromDB.validatePassword(password);
    if (!isPasswordCorrect) {
      throw new ApiError(
        responseType.INCORRECT_PASSWORD.code,
        responseType.INCORRECT_PASSWORD.type,
        "Please provide valid credentials"
      );
    }

    // Generate access and refresh tokens
    const accessToken = generateToken(
      {
        userId: userFromDB._id,
        email: userFromDB.email,
        username: userFromDB.username,
      },
      env.token.accessToken.secret,
      env.token.accessToken.expiry
    );
    const refreshToken = generateToken(
      {
        userId: userFromDB._id,
        email: userFromDB.email,
        username: userFromDB.username,
      },
      env.token.refreshToken.secret,
      env.token.refreshToken.expiry
    );
    // Generate token expiries (in Date format)
    const accessTokenExpiry = new Date(
      new Date().getTime() + 24 * 60 * 60 * 1000
    );
    const refreshTokenExpiry = new Date(
      new Date().getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Get the device-details from req.body
    const { details } = req.body;
    const { deviceType, os, userAgent } = details;
    if(!(deviceType && os && userAgent)){
      throw new ApiError(
        responseType.UNSUCCESSFUL.code,
        responseType.UNSUCCESSFUL.type,
        "One or more device/browser details missing in the request body"
      )
    }

    // Create a new session-document corresponding to the user-Id
    const createdSession = await Session.create({
      userId: userFromDB._id,
      refreshToken,
      refreshTokenExpiry,
      accessToken,
      accessTokenExpiry,
      details
    });

    // Set browser cookies and send response
    res
      .status(responseType.SESSION_CREATED.code)
      .cookie("user-access-token", accessToken, {
        ...cookieOptions,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .cookie("user-refresh-token", refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json(
        new ApiResponse(
          responseType.SESSION_CREATED.code,
          responseType.SESSION_CREATED.type,
          "Login session created successfully",
          createdSession
        )
      );
  }
);

// SECURED ROUTE: DELETE USER LOGIN SESSION
export const deleteLoginSession = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-Auth-Middleware: Authenticate the user

    // Delete the session-document using the access token
    await Session.findByIdAndDelete(req.session?.id);

    // Clear the browser cookies and send response
    res
      .status(responseType.SESSION_DELETED.code)
      .clearCookie("user-access-token")
      .clearCookie("user-refresh-token")
      .json(
        new ApiResponse(
          responseType.SESSION_DELETED.code,
          responseType.SESSION_DELETED.type,
          "User login session deleted successfully",
          {}
        )
      );
  }
);

// SECURED ROUTE: DELETE USER ACCOUNT
export const deleteAccount = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-auth-middleware: Authenticate the user

    // Get the user-Id
    const userId = req.user?.id;
    // Delete all sessions whose userId matches with `userId`
    await Session.deleteMany({ userId });

    // Delete the user-document from the database
    await User.findByIdAndDelete(userId);

    // Clear all browser cookies and send response
    res
      .status(responseType.ACCOUNT_DELETED.code)
      .json(
        new ApiResponse(
          responseType.ACCOUNT_DELETED.code,
          responseType.ACCOUNT_DELETED.type,
          "User account successfully deleted",
          {}
        )
      );
  }
);

// SECURED ROUTE: DELETE ALL USER LOGIN SESSIONS

// SECURED ROUTE: GET ALL ACTIVE LOGIN SESSIONS

// SECURED ROUTE: DELETE A SESSION (USING ITS SESSION-ID)

//
