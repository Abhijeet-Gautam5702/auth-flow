import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import { cookieOptions, env, responseType } from "../constants";
import { validateSignupInput } from "../schema/validation";
import { User } from "../models/user.model";
import { ApiResponse } from "../utils/custom-api-response";
import { filterObject } from "../utils/filter-object";
import { generateToken } from "../utils/token-generator";
import { Session } from "../models/session.model";
import { IRequest, IUser } from "../types/types";

// CREATE USER ACCOUNT
export const createAccount = asyncHandler(
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
    // Verify if user already exists
    const userFromDB = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (userFromDB) {
      throw new ApiError(
        responseType.ALREADY_EXISTS.code,
        responseType.ALREADY_EXISTS.type,
        "User already present in the database. Please try with different credentials."
      );
    }
    // Create a new account
    const createdUser = await User.create({
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

// SECURED ROUTE: DELETE USER ACCOUNT

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

    // Create a new session-document corresponding to the user-Id
    const createdSession = await Session.create({
      userId: userFromDB._id,
      refreshToken,
      refreshTokenExpiry,
      accessToken,
      accessTokenExpiry,
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
        path: "/refresh",
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
          "User login session delete successfully",
          {}
        )
      );
  }
);
