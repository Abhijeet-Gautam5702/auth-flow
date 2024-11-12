import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import {
  cookieOptions,
  env,
  frontendDomain,
  ORG_EMAIL,
  ORG_NAME,
  responseType,
} from "../constants";
import { validateSignupInput } from "../schema/validation";
import { User } from "../models/user.model";
import { ApiResponse } from "../utils/custom-api-response";
import { filterObject } from "../utils/filter-object";
import { generateToken } from "../utils/token-generator";
import { Session } from "../models/session.model";
import { EventCode, IProject, IRequest, IUser } from "../types/types";
import { parseUserAgent } from "../utils/user-agent-parser";
import { Project } from "../models/project.model";
import jwt from "jsonwebtoken";
import { ZEmail, ZPassword } from "../schema/zod.schema";
import { otp } from "../features/otp";
import mongoose from "mongoose";
import { accountLockout } from "../features/account-lockout";
import { securityLog } from "../features/security-log";
import { Log } from "../models/security-log.model";
import { emailService } from "../features/email";

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
        "One or more field(s) are not provided. Please enter all fields (i.e., Username, Email & Password)."
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
      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.ACCOUNT_CREATION,
        eventSuccess: false,
        message: "User already exists.",
      });
      // Throw error
      throw new ApiError(
        responseType.ALREADY_EXISTS.code,
        responseType.ALREADY_EXISTS.type,
        "User already present in the database. Please Login."
      );
    }
    // Create a new account
    const createdUser = await User.create({
      projectId: req.project?.id,
      email,
      username,
      password,
    });

    // Remove sensitive data from the user-data (newly created)
    /* Note: Another database call is not made to reduce the number of interactions with the Database */
    const userData = filterObject(createdUser, [], ["password"]);

    // Log an event
    await securityLog.logEvent({
      userId: createdUser._id,
      eventCode: EventCode.ACCOUNT_CREATION,
      eventSuccess: true,
    });

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

// GET CURRENT USER & ACTIVE SESSION
export const getCurrentUser = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-auth-middleware
    const userId = req.user?.id;
    const sessionId = req.session?.id;

    // Get the current user session from the database
    const sessionFromDB = await Session.findById(sessionId).select(
      "-refreshToken -refreshTokenExpiry -accessToken -accessTokenExpiry"
    );
    if (!sessionFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Active session not found in the database"
      );
    }

    // Get the current user from the database
    const userFromDB = await User.findById(userId).select(
      "-password -verificationToken -verificationTokenExpiry -resetPasswordToken -resetPasswordTokenExpiry"
    );
    if (!userFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "User not found in the database"
      );
    }

    // Send response with user and session data
    res.status(responseType.SUCCESSFUL.code).json(
      new ApiResponse(
        responseType.SUCCESSFUL.code,
        responseType.SUCCESSFUL.type,
        "Current user and user-session fetched successfully",
        {
          user: userFromDB,
          session: sessionFromDB,
        }
      )
    );
  }
);

// CREATE USER LOGIN SESSION
export const createLoginSession = asyncHandler(
  async (req: IRequest, res: Response) => {
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
      $and: [{ email }],
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
      // Track the number of failed login attempts
      accountLockout.handleFailedLoginAttempt(req.ip!, email);
      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.PASSWORD_LOGIN,
        eventSuccess: false,
        message: "Incorrect Password.",
      });
      // Throw error
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
        projectId: req.project?.id,
        email: userFromDB.email,
        username: userFromDB.username,
      },
      env.token.accessToken.secret,
      env.token.accessToken.expiry
    );
    const refreshToken = generateToken(
      {
        userId: userFromDB._id,
        projectId: req.project?.id,
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

    // Get the user-agent from request headers and parse it to obtain required details
    const userAgent = req.headers["user-agent"];
    if (!userAgent) {
      throw new ApiError(
        responseType.UNSUCCESSFUL.code,
        responseType.UNSUCCESSFUL.type,
        "User-Agent header missing in the request (mandatory for creating a login-session)"
      );
    }
    const details = { ...parseUserAgent(userAgent), networkIP: req.ip };

    // Check if another login-session from the same device already exists
    /*
      NOTE: Multiple login sessions can be made but there can be only one login-session from one user-agent
    */
    const sessionFromDB = await Session.findOne({
      $and: [{ userId: userFromDB._id }, { details }],
    });
    if (sessionFromDB) {
      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.PASSWORD_LOGIN,
        eventSuccess: false,
        message:
          "There exists a login session corresponding to this user-agent in the database.",
      });
      throw new ApiError(
        responseType.ALREADY_EXISTS.code,
        responseType.ALREADY_EXISTS.type,
        "There exists a login session corresponding to this user-agent in the database"
      );
    }

    // Create a new session-document corresponding to the user-Id
    const createdSession = await Session.create({
      projectId: req.project?.id,
      userId: userFromDB._id,
      refreshToken,
      refreshTokenExpiry,
      accessToken,
      accessTokenExpiry,
      details,
    });
    const sessionId = createdSession._id;

    // Create response-data
    const responseData = await Session.aggregate([
      // Filter all the Session documents and match `_id` with sessionId
      {
        $match: {
          _id: sessionId,
        },
      },
      // Create a new `user` field and populate it with user-details by looking up the `userId` field
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      // Since $lookup returns an array, so unwind the `user` field into individual documents (in this case, it'll be one single document only)
      {
        $unwind: "$user",
      },
      // Remove certain fields from the final result
      {
        $project: {
          userId: 0,
          user: {
            password: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0,
            projectId: 0,
            token: 0,
            tokenExpiry: 0,
          },
          __v: 0,
        },
      },
    ]);

    // Log an event
    await securityLog.logEvent({
      userId: userFromDB._id,
      eventCode: EventCode.PASSWORD_LOGIN,
      eventSuccess: true,
      sessionId,
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
          responseData
        )
      );
  }
);

// SECURED ROUTE: DELETE USER LOGIN SESSION (CURRENT ONE)
export const deleteCurrentLoginSession = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-Auth-Middleware: Authenticate the user
    const userId = req.user?.id;

    // Delete the session-document using the access token
    await Session.findByIdAndDelete(req.session?.id);

    // Log an event
    await securityLog.logEvent({
      userId: userId!,
      eventCode: EventCode.LOGOUT,
      eventSuccess: true,
    });

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
    /*
    NOTE: Since this controller is used by Admin as well as the user, so userId will either come from the request-params (when request is sent by Admin) or from req.user.id (when request is sent from user)
    */
    let userId = req.user?.id;
    if (!userId) {
      userId = req.params.userId as string;
    }

    // Delete all sessions whose userId matches with `userId`
    await Session.deleteMany({ userId });

    // Delete the user-document from the database
    await User.findByIdAndDelete(userId);

    // Delete all the logs corresponding to the userId
    await Log.deleteMany({ userId });

    // Clear all browser cookies and send response
    res
      .status(responseType.ACCOUNT_DELETED.code)
      .clearCookie("user-access-token")
      .clearCookie("user-refresh-token")
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

// SECURED ROUTE: GET ALL ACTIVE LOGIN SESSIONS
export const getAllLoginSessions = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-auth-middleware: Authenticate the user
    /*
      NOTE: Since this controller is used by Admin as well as the user, so userId will either come from the request-params (when request is sent by Admin) or from req.user.id (when request is sent from user)
    */
    let userId = req.user?.id;
    if (!userId) {
      userId = req.params.userId as string;
    }

    // MONGODB AGGREGATION: Get all session documents
    const sessions = await Session.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          projectId: 0,
          userId: 0,
          updatedAt: 0,
          refreshToken: 0,
          refreshTokenExpiry: 0,
          accessToken: 0,
          accessTokenExpiry: 0,
          __v: 0,
        },
      },
    ]);

    // Create the response-data
    const user = await User.findById(userId).select(
      "-password -createdAt -updatedAt -__v -projectId -token -tokenExpiry"
    );
    const responseData = {
      projectId: req.project?.id,
      user,
      sessionCount:sessions.length,
      sessions,
    };

    // Send response with list of sessions' data
    res
      .status(responseType.SUCCESSFUL.code)
      .json(
        new ApiResponse(
          responseType.SUCCESSFUL.code,
          responseType.SUCCESSFUL.type,
          "Session List fetched successfully",
          responseData
        )
      );
  }
);

// SECURED ROUTE: DELETE A PARTICULAR USER LOGIN SESSION USING ITS SESSION-ID
export const deleteLoginSessionByID = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-auth-middleware: Authenticate the user
    /*
      NOTE: Since this controller is used by Admin as well as the user, so userId will either come from the request-body (when request is sent by Admin) or from req.user.id (when request is sent from user)
    */
    let userId = req.user?.id;
    if (!userId) {
      userId = req.body.userId as string;
    }

    // Get the sessionId from the request params
    const sessionId = req.params.sessionId as string;

    // Delete the session using its sessionId
    await Session.findByIdAndDelete(sessionId);

    // Clear the browser cookies and send response
    /*
      NOTE: Since we are deleting some other login-session and not the current one, so do not clear the cookies
    */
    res
      .status(responseType.SESSION_DELETED.code)
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

// SECURED ROUTE: DELETE ALL USER LOGIN SESSIONS (INCLUDING THE CURRENT ONE)
export const deleteAllLoginSessions = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-Auth-Middleware: Authenticate the user
    /*
      NOTE: Since this controller is used by Admin as well as the user, so userId will either come from the request-params (when request is sent by Admin) or from req.user.id (when request is sent from user)
    */
    let userId = req.user?.id;
    if (!userId) {
      userId = req.params.userId as string;
    }

    // Delete all session-documents
    await Session.deleteMany({ userId });

    // Clear the browser cookies and send response
    res
      .status(responseType.SESSION_DELETED.code)
      .clearCookie("user-access-token")
      .clearCookie("user-refresh-token")
      .json(
        new ApiResponse(
          responseType.SESSION_DELETED.code,
          responseType.SESSION_DELETED.type,
          "All user login sessions deleted successfully",
          {}
        )
      );
  }
);

// SECURED ROUTE: VERIFY THE USER EMAIL
export const verifyEmail = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-auth middleware: Authenticate the user
    const userId = req.user?.id;

    // If the user is already verified => return
    const userFromDB = await User.findById(userId).select(
      "-password -refreshToken -refreshTokenExpiry -accessToken -accessTokenExpiry"
    );
    if (!userFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "User corresponding to the provided Email-ID not found in the database"
      );
    }
    if (userFromDB.isVerified) {
      res
        .status(responseType.EMAIL_VERIFIED.code)
        .json(
          new ApiResponse(
            responseType.EMAIL_VERIFIED.code,
            responseType.EMAIL_VERIFIED.type,
            "This email has already been verified",
            {}
          )
        );
      return; // Do not execute any code further than this
    }

    // Grab the request query
    const { initiate, verificationToken } = req.query;

    // Initiate the verification process
    if (initiate && !verificationToken) {
      // Generate a new verification token with expiry
      const verificationToken = generateToken(
        {
          userId: userFromDB._id,
          email: userFromDB.email,
          projectId: userFromDB.projectId,
        },
        env.token.verificationToken.secret,
        env.token.verificationToken.expiry
      );
      // Generate expiry in JS-Date format
      const verificationTokenExpiry = new Date(
        new Date().getTime() + 15 * 60 * 1000
      );

      // Store the token & expiry in the user-document
      userFromDB.token = verificationToken;
      userFromDB.tokenExpiry = verificationTokenExpiry;
      await userFromDB.save();

      // Find project-document & extract the email-template
      const projectFromDB: IProject | null = await Project.findById(
        userFromDB.projectId
      );
      const customEmailTemplate =
        projectFromDB?.config.emailTemplates?.userVerification;

      // Generate an email to be sent to the user-inbox (either the custom one or default)
      const userVerificationEmail =
        customEmailTemplate ||
        emailService.userVerification(
          `${frontendDomain}/user/verify?token=${verificationToken}`
        ); // TODO: The frontend website link will be taken from the client (not user) OR the Authwave frontend website link can be used

      // Send email to the user
      const emailResponse = await emailService.send(
        userFromDB.email,
        "Verify your AuthWave Account",
        userVerificationEmail
      )


      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.USER_VERIFICATION,
        eventSuccess: true,
        message: "User Verification process initated successfully.",
      });

      // Send response
      res
        .status(responseType.INITIATED.code)
        .json(
          new ApiResponse(
            responseType.INITIATED.code,
            responseType.INITIATED.type,
            "Please check your registered email (within 15 minutes) to continue verification.",
            {}
          )
        );
    }
    // Complete the verification process
    else if (verificationToken && !initiate) {
      // Decode the verification token
      const decodedToken = jwt.decode(String(verificationToken)) as {
        projectId: string;
        userId: string;
        email: string;
      } | null;

      const userIdFromToken = decodedToken?.userId;

      if (userIdFromToken != userId) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.USER_VERIFICATION,
          eventSuccess: false,
          message:
            "Mismatch in User-IDs in verification token and in browser cookies",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Mismatch in User-IDs in verification token and in browser cookies"
        );
      }
      if (verificationToken !== userFromDB.token) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.USER_VERIFICATION,
          eventSuccess: false,
          message:
            "The verification token in database doesn't match with the provided token.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "The verification token in database doesn't match with the provided token."
        );
      }
      if (userFromDB.tokenExpiry! < new Date()) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.USER_VERIFICATION,
          eventSuccess: false,
          message: "Verification token expired.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_EXPIRED.code,
          responseType.TOKEN_EXPIRED.type,
          "Initiate the verification process again."
        );
      }
      // Update the user document with the verification-status
      userFromDB.isVerified = true;
      userFromDB.token = undefined;
      userFromDB.tokenExpiry = undefined;
      await userFromDB.save();

      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.USER_VERIFICATION,
        eventSuccess: true,
      });

      // Send response
      res
        .status(responseType.EMAIL_VERIFIED.code)
        .json(
          new ApiResponse(
            responseType.EMAIL_VERIFIED.code,
            responseType.EMAIL_VERIFIED.type,
            "User Email has been verified successfully",
            {}
          )
        );
    } else {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Request query parameters not sent correctly"
      );
    }
  }
);

// SECURED ROUTE: RESET PASSWORD
export const resetPassword = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Project-Validation middleware: Validate the project
    const projectId = req.project?.id;
    const projectFromDB: IProject | null = await Project.findById(projectId);
    if (!projectFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Corresponding project not found in the database"
      );
    }

    // User-auth middleware: Authenticate the user
    const userId = req.user?.id;
    const userFromDB = await User.findById(userId);
    if (!userFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "User (corresponding to the browser cookies) not found in the database."
      );
    }

    // Get the request-queries
    const { resetPasswordToken, initiate } = req.query;

    // Initiate the Password-reset process
    if (initiate && !resetPasswordToken) {
      // Generate a new token
      const resetPasswordToken = generateToken(
        {
          userId: userFromDB._id,
          email: userFromDB.email,
          projectId: userFromDB.projectId,
        },
        env.token.resetPasswordToken.secret,
        env.token.resetPasswordToken.expiry
      );
      // Generate token expiry in JS-Date format
      const resetPasswordTokenExpiry = new Date(
        new Date().getTime() + 15 * 60 * 1000
      );

      // Store the token and expiry in the user-document
      userFromDB.token = resetPasswordToken;
      userFromDB.tokenExpiry = resetPasswordTokenExpiry;
      await userFromDB.save();

      // Generate the email to be sent to the user inbox (either default or custom)
      const resetPasswordEmail =
        projectFromDB.config.emailTemplates?.resetPassword ||
        emailService.resetPassword(
          `${frontendDomain}/user/reset-password?token=${resetPasswordToken}`
        ); // TODO: The frontend website link will be taken from the client (not user) OR the Authwave frontend website link can be used

      // Send email to the user
      const emailResponse = await emailService.send(
        userFromDB.email,
        "Verify your AuthWave Account",
        resetPasswordEmail
      )

      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.PASSWORD_RESET,
        eventSuccess: true,
        message: "Password Reset process initiated.",
      });

      // Send response
      res
        .status(responseType.INITIATED.code)
        .json(
          new ApiResponse(
            responseType.INITIATED.code,
            responseType.INITIATED.type,
            "Please check your registered email (within 15 minutes) to continue with the password reset",
            {}
          )
        );
    }

    // Complete the Password-reset process
    else if (resetPasswordToken && !initiate) {
      // Get the new password from the request-body
      const { newPassword } = req.body;
      if (!newPassword) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.PASSWORD_RESET,
          eventSuccess: false,
          message: "New Password not found in the request body.",
        });
        // Throw error
        throw new ApiError(
          responseType.UNSUCCESSFUL.code,
          responseType.UNSUCCESSFUL.type,
          "New Password not found in the request body."
        );
      }

      // Validate Password-schema
      const isPasswordValid = ZPassword.safeParse(newPassword);
      if (!isPasswordValid.success) {
        // Throw error
        throw new ApiError(
          responseType.INVALID_FORMAT.code,
          responseType.INVALID_FORMAT.type,
          "Please provide a valid password that conforms to the prescribed format.",
          isPasswordValid.error.errors
        );
      }

      // Decode the verification token
      const decodedToken = jwt.decode(String(resetPasswordToken)) as {
        projectId: string;
        userId: string;
        email: string;
      } | null;

      const userIdFromToken = decodedToken?.userId;

      if (userIdFromToken != userId) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.PASSWORD_RESET,
          eventSuccess: false,
          message: "Mismatch in User-IDs in token and in browser cookies.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Mismatch in User-IDs in token and in browser cookies"
        );
      }
      if (resetPasswordToken !== userFromDB.token) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.PASSWORD_RESET,
          eventSuccess: false,
          message:
            "The reset-password token in database doesn't match with the provided token.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "The reset-password token in database doesn't match with the provided token"
        );
      }
      if (userFromDB.tokenExpiry! < new Date()) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.PASSWORD_RESET,
          eventSuccess: false,
          message: "Password Reset Token expired.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_EXPIRED.code,
          responseType.TOKEN_EXPIRED.type,
          "Initiate the password-reset process again."
        );
      }

      // Update the user-document
      userFromDB.password = newPassword;
      userFromDB.token = undefined;
      userFromDB.tokenExpiry = undefined;
      await userFromDB.save();

      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.PASSWORD_RESET,
        eventSuccess: true,
      });

      // Send response
      res
        .status(responseType.PASSWORD_RESET_SUCCESSFUL.code)
        .json(
          new ApiResponse(
            responseType.PASSWORD_RESET_SUCCESSFUL.code,
            responseType.PASSWORD_RESET_SUCCESSFUL.type,
            "User Password has been reset successfully",
            {}
          )
        );
    }

    // Send error response
    else {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Request query parameters not sent correctly"
      );
    }
  }
);

// REFRESH THE EXPIRED ACCESS TOKEN
export const refreshAccessToken = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Project validation middleware: Validate the project

    // Get the refresh token from the request-headers or browser cookies
    const refreshToken =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies["user-refresh-token"];
    if (!refreshToken) {
      throw new ApiError(
        responseType.REFRESH_TOKEN_INVALID.code,
        responseType.REFRESH_TOKEN_INVALID.type,
        "Refresh token not found in browser cookies or request headers"
      );
    }

    // Decode the refresh token and get the userId
    const decodedToken = jwt.decode(refreshToken) as {
      userId: string;
      projectId: string;
    } | null;
    if (!decodedToken || !decodedToken.userId) {
      throw new ApiError(
        responseType.REFRESH_TOKEN_INVALID.code,
        responseType.REFRESH_TOKEN_INVALID.type,
        "User-ID could not be fetched from the refresh token"
      );
    }

    // Check if the project exists in the database
    const projectId = decodedToken.projectId;
    const projectFromDB: IProject | null = await Project.findById(projectId);
    if (!projectFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Project corresponding to the refresh token not found in the database"
      );
    }

    // Check if the user exists in the database
    const userId = decodedToken.userId;
    const userFromDB: IUser | null = await User.findById(userId).select(
      "-password"
    );
    if (!userFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "User corresponding to the refresh token not found in the database"
      );
    }

    // Check if the user-login-session exists in the database
    const sessionFromDB = await Session.findOne({
      refreshToken,
    });
    if (!sessionFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Login session corresponding to provided refresh token not found in the database"
      );
    }

    // Verify the expiry of the refresh token from the session-document in the database
    if (sessionFromDB.refreshTokenExpiry < new Date()) {
      throw new ApiError(
        responseType.REFRESH_TOKEN_EXPIRED.code,
        responseType.REFRESH_TOKEN_EXPIRED.type,
        "Please log in again using credentials"
      );
    }

    // Generate a new access token
    const accessToken = generateToken(
      {
        projectId,
        userId,
        email: userFromDB.email,
      },
      env.token.accessToken.secret,
      env.token.accessToken.expiry
    );
    // Generate a new access token expiry (in JS-format)
    const accessTokenExpiry = new Date(
      new Date().getTime() + 24 * 60 * 60 * 1000
    );

    // Update the token in session document
    sessionFromDB.accessToken = accessToken;
    sessionFromDB.accessTokenExpiry = accessTokenExpiry;
    await sessionFromDB.save();

    // Create response-data
    const responseData = await Session.aggregate([
      {
        $match: {
          _id: sessionFromDB._id,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userId: 0,
          user: {
            password: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0,
            projectId: 0,
          },
          __v: 0,
        },
      },
    ]);

    // Set browser cookies and send response
    res
      .status(responseType.SUCCESSFUL.code)
      .cookie("user-access-token", accessToken, {
        ...cookieOptions,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json(
        new ApiResponse(
          responseType.SUCCESSFUL.code,
          responseType.SUCCESSFUL.type,
          "Access token has been refreshed successfully",
          responseData
        )
      );
  }
);

// AUTHENTICATE USING MAGIC-URL
export const magicURLAuth = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Project Validation middleware: Validate the project
    const projectId = req.project?.id;
    const projectFromDB: IProject = (await Project.findById(
      projectId
    )) as IProject;

    // Check if magic-URL is enabled in the project
    if (!projectFromDB.config.loginMethods.magicURLonEmail) {
      throw new ApiError(
        responseType.SERVICE_UNAVAILABLE.code,
        responseType.SERVICE_UNAVAILABLE.type,
        "MagicURL Authentication is not enabled by the project admin."
      );
    }

    // Get the request query parameters
    const { initiate, magicURLToken } = req.query;

    // Initiate the magicURL authentication process
    if (initiate && !magicURLToken) {
      // Get the user email from request body
      const { email } = req.body;
      if (!email) {
        throw new ApiError(
          responseType.INVALID_FORMAT.code,
          responseType.INVALID_FORMAT.type,
          "Email not sent correctly in the request body"
        );
      }

      // Validate the email-schema
      const isEmailValid = ZEmail.safeParse(email);
      if (!isEmailValid.success) {
        throw new ApiError(
          responseType.INVALID_FORMAT.code,
          responseType.INVALID_FORMAT.type,
          "Please provide a valid email that conforms to the Email-format",
          isEmailValid.error.errors
        );
      }

      // Check if user already exists in the database
      const userFromDB = await User.findOne({ email }).select("-password");
      if (userFromDB) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, email);
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.MAGIC_URL_AUTHENTICATION,
          eventSuccess: false,
          message: "User already exists in the database",
        });
        // Throw error
        throw new ApiError(
          responseType.ALREADY_EXISTS.code,
          responseType.ALREADY_EXISTS.type,
          "User corresponding to this email already exists in the database. Please provide a different email to continue with MagicURL."
        );
      }

      // Create a new user-document with the email only
      const createdUser = await User.create({
        projectId,
        username: undefined,
        email,
        password: undefined,
      });

      // Create magicURLToken
      const magicURLToken = generateToken(
        {
          projectId,
          userId: createdUser._id,
          email: createdUser.email,
        },
        env.token.magicURLToken.secret,
        env.token.magicURLToken.expiry
      );
      // Create magicURLToken Expiry (in JS-format)
      const magicURLTokenExpiry = new Date(
        new Date().getTime() + 15 * 60 * 1000
      );

      // Update the user document with the magicURLToken and its expiry
      createdUser.token = magicURLToken;
      createdUser.tokenExpiry = magicURLTokenExpiry;
      await createdUser.save();

      // Generate the email to be sent to the user inbox (either default or custom)
      const magicURLVerificationEmail =
        projectFromDB.config.emailTemplates?.magicURLonEmail ||
        emailService.magicURLonEmail(
          `${frontendDomain}/user/auth/magic-url?magicURLToken=${magicURLToken}`
        ); // TODO: The frontend website link will be taken from the client (not user) OR the Authwave frontend website link can be used

      // Send email to the user
      const emailResponse = await emailService.send(
        createdUser.email,
        "Verify your AuthWave Account",
        magicURLVerificationEmail
      )

      // Log an event
      await securityLog.logEvent({
        userId: createdUser._id,
        eventCode: EventCode.MAGIC_URL_AUTHENTICATION,
        eventSuccess: true,
        message: "Magic-URL Authentication process initiated.",
      });

      // Send response
      res
        .status(responseType.INITIATED.code)
        .json(
          new ApiResponse(
            responseType.INITIATED.code,
            responseType.INITIATED.type,
            "Magic-URL sent to your registered email.",
            {}
          )
        );
    }

    // Complete the magicURL authentication process
    else if (magicURLToken && !initiate) {
      const decodedToken = jwt.decode(String(magicURLToken)) as {
        userId: string;
        projectId: string;
        email: string;
      } | null;
      if (!decodedToken) {
        // Throw error
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Please provide a valid Magic-URL Token"
        );
      }

      const userFromDB = await User.findById(decodedToken.userId).select(
        "-password"
      );
      if (!userFromDB) {
        throw new ApiError(
          responseType.NOT_FOUND.code,
          responseType.NOT_FOUND.type,
          "User corresponding to the Magic-URL token not found in the database. Initiate the Magic-URL authentication process again."
        );
      }
      if (userFromDB.token !== magicURLToken) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.MAGIC_URL_AUTHENTICATION,
          eventSuccess: false,
          message:
            "Magic-URL tokens in the database does not match with the token provided.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Magic-URL token in the database does not match with the token provided"
        );
      }
      if (userFromDB.tokenExpiry! < new Date()) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.MAGIC_URL_AUTHENTICATION,
          eventSuccess: false,
          message: "Magic-URL Authentication Token expired.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_EXPIRED.code,
          responseType.TOKEN_EXPIRED.type,
          "Initiate the verification process again."
        );
      }

      // Create access and refresh tokens
      const accessToken = generateToken(
        {
          projectId,
          userId: userFromDB._id,
          email: userFromDB.email,
        },
        env.token.accessToken.secret,
        env.token.accessToken.expiry
      );
      const refreshToken = generateToken(
        {
          projectId,
          userId: userFromDB._id,
          email: userFromDB.email,
        },
        env.token.accessToken.secret,
        env.token.accessToken.expiry
      );
      // Generate new token expiries (in JS-format)
      const accessTokenExpiry = new Date(
        new Date().getTime() + 24 * 60 * 60 * 1000
      );
      const refreshTokenExpiry = new Date(
        new Date().getTime() + 30 * 24 * 60 * 60 * 1000
      );

      // Get the user-agent from request headers and parse it to obtain required session-details
      const userAgent = req.headers["user-agent"];
      if (!userAgent) {
        throw new ApiError(
          responseType.UNSUCCESSFUL.code,
          responseType.UNSUCCESSFUL.type,
          "User-Agent header missing in the request (mandatory for creating a login-session)"
        );
      }
      const details = { ...parseUserAgent(userAgent), networkIP: req.ip };

      // Check if another login-session from the same device already exists
      /*
        NOTE: Multiple login sessions can be made but there can be only one login-session from one user-agent
      */
      const sessionFromDB = await Session.findOne({
        $and: [{ userId: userFromDB._id }, { details }],
      });
      if (sessionFromDB) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.MAGIC_URL_AUTHENTICATION,
          eventSuccess: false,
          message: "Session corresponding to this User-Agent already exists.",
        });
        // Throw error
        throw new ApiError(
          responseType.ALREADY_EXISTS.code,
          responseType.ALREADY_EXISTS.type,
          "There exists a login session corresponding to this user-agent in the database"
        );
      }

      // Create a new corresponding session-document
      const createdSession = await Session.create({
        projectId,
        userId: userFromDB._id,
        accessToken,
        accessTokenExpiry,
        refreshToken,
        refreshTokenExpiry,
        details,
      });
      const sessionId = createdSession._id;

      // Update the magic-URL verifications status in the user-document
      userFromDB.token = undefined;
      userFromDB.tokenExpiry = undefined;
      await userFromDB.save();

      // Create response-data
      const responseData = await Session.aggregate([
        // Filter all the Session documents and match `_id` with sessionId
        {
          $match: {
            _id: sessionId,
          },
        },
        // Create a new `user` field and populate it with user-details by looking up the `userId` field
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        // Since $lookup returns an array, so unwind the `user` field into individual documents (in this case, it'll be one single document only)
        {
          $unwind: "$user",
        },
        // Remove certain fields from the final result
        {
          $project: {
            userId: 0,
            user: {
              password: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
              projectId: 0,
              token: 0,
              tokenExpiry: 0,
            },
            __v: 0,
          },
        },
      ]);

      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.MAGIC_URL_AUTHENTICATION,
        eventSuccess: true,
        sessionId: createdSession._id,
      });

      // Send response with created-session
      res
        .status(responseType.SUCCESSFUL.code)
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
            responseType.SUCCESSFUL.code,
            responseType.SUCCESSFUL.type,
            "Magic-URL Authentication completed.",
            responseData
          )
        );
    }

    // Send error response
    else {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Request query parameters not sent correctly"
      );
    }
  }
);

// AUTHENTICATE USING OTP ON EMAILS
export const emailOTPAuth = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Project-Validation middleware: Validate the project
    const projectId = req.project?.id;
    const projectFromDB = await Project.findById(projectId);

    // Check if magic-URL is enabled in the project
    if (!projectFromDB?.config.loginMethods.OTPonEmail) {
      throw new ApiError(
        responseType.SERVICE_UNAVAILABLE.code,
        responseType.SERVICE_UNAVAILABLE.type,
        "Authentication via OTP (on Email) is not enabled by the project admin. Enable the setting to continue."
      );
    }

    // Get the request query params
    const { initiate, otpToken } = req.query;

    // Initiate the email authentication process
    if (initiate && !otpToken) {
      // Get the user email from request body
      const { email } = req.body;
      if (!email) {
        throw new ApiError(
          responseType.INVALID_FORMAT.code,
          responseType.INVALID_FORMAT.type,
          "Email not sent correctly in the request body"
        );
      }

      // Validate the email-schema
      const isEmailValid = ZEmail.safeParse(email);
      if (!isEmailValid.success) {
        throw new ApiError(
          responseType.INVALID_FORMAT.code,
          responseType.INVALID_FORMAT.type,
          "Please provide a valid email that conforms to the Email-format",
          isEmailValid.error.errors
        );
      }

      // If the user doesn't exist in the database, create a new user document (with email only)
      const userFromDB = await User.findOne({ email }).select("-password");
      if (!userFromDB) {
        await User.create({
          projectId,
          username: undefined,
          email,
          password: undefined,
        });
      }

      // Get the user from the database
      const user = await User.findOne({ email }).select("-password");
      if (!user) {
        throw new ApiError(
          responseType.UNSUCCESSFUL.code,
          responseType.UNSUCCESSFUL.type,
          "User could not be created in the database."
        );
      }
      const userId = user._id as string | mongoose.Types.ObjectId;

      // Create a fresh OTP
      const newOtp = (await otp.authentication.generate({
        userId,
        projectId,
      })) as { hashedOTP: string; unhashedOTP: string };
      // Create the expiry of OTP (in JS-format)
      const otpExpiry = new Date(new Date().getTime() + 15 * 60 * 1000);

      // Update the user document with the OTP and its expiry
      user.token = newOtp.hashedOTP;
      user.tokenExpiry = otpExpiry;
      await user.save();

      // Generate the email to be sent to the user inbox (either default or custom)
      const otpVerificationEmail =
        projectFromDB.config.emailTemplates?.OTPonEmail ||
        emailService.OTPonEmail(newOtp.unhashedOTP);

      // Send email to the user
      const emailResponse = await emailService.send(
        user.email,
        "Verify your AuthWave Account",
        otpVerificationEmail
      )

      // Log an event
      await securityLog.logEvent({
        userId: userId,
        eventCode: EventCode.OTP_AUTHENTICATION,
        eventSuccess: true,
        message: "OTP-on-Email Authentication process initiated.",
      });

      // Send response
      res
        .status(responseType.INITIATED.code)
        .json(
          new ApiResponse(
            responseType.INITIATED.code,
            responseType.INITIATED.type,
            "OTP has been sent to your registered email.",
            {}
          )
        );
    }

    // Complete the email authentication process
    else if (otpToken && !initiate) {
      // Decode the unhashed-OTP
      const decodedOTP = otp.authentication.decode(otpToken as string);

      // Verify the user and project details stored in the unhashed-OTP
      const userFromDB = await User.findById(decodedOTP.userId).select(
        "-password"
      );
      if (!userFromDB) {
        // Throw error
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Corresponding user not found in the database. Initiate the authentication process again."
        );
      }
      if (String(decodedOTP.projectId) != String(projectFromDB._id)) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.OTP_AUTHENTICATION,
          eventSuccess: false,
          message:
            "Project-ID mismatch in OTP and request headers. Initiate the authentication process again.",
        });
        // Throw error
        throw new ApiError(
          responseType.NOT_FOUND.code,
          responseType.NOT_FOUND.type,
          "Project-ID mismatch in OTP and request headers. Initiate the authentication process again."
        );
      }
      if (!userFromDB.token || !userFromDB.tokenExpiry) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.OTP_AUTHENTICATION,
          eventSuccess: false,
          message:
            "OTP-Token and/or OTP-expiry not found in the database. Initiate the authentication process again.",
        });
        // Throw error
        throw new ApiError(
          responseType.NOT_FOUND.code,
          responseType.NOT_FOUND.type,
          "OTP-Token and/or OTP-expiry not found in the database. Initiate the authentication process again."
        );
      }

      // Validate the hashedOTP (and its expiry) from the database
      const isOTPCorrect = await otp.authentication.match(
        otpToken as string,
        userFromDB.token
      );
      if (!isOTPCorrect) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.OTP_AUTHENTICATION,
          eventSuccess: false,
          message: "OTPs do not match.",
        });
        // Throw error
        throw new ApiError(
          responseType.INCORRECT_PASSWORD.code,
          responseType.INCORRECT_PASSWORD.type,
          "One Time Passwords do not match. Initiate the process again."
        );
      }
      if (userFromDB.tokenExpiry < new Date()) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.OTP_AUTHENTICATION,
          eventSuccess: false,
          message: "OTP-Verification Token expired.",
        });
        // Throw error
        throw new ApiError(
          responseType.TOKEN_EXPIRED.code,
          responseType.TOKEN_EXPIRED.type,
          "Initiate the verification process again."
        );
      }

      // Create an access token
      const accessToken = generateToken(
        {
          projectId,
          userId: decodedOTP.userId,
          email: userFromDB.email,
        },
        env.token.accessToken.secret,
        env.token.accessToken.expiry
      );
      // Create access token expiry (in JS-format)
      const accessTokenExpiry = new Date(
        new Date().getTime() + 24 * 60 * 60 * 1000
      );

      // Get the user-agent from request headers and parse it to obtain required session-details
      const userAgent = req.headers["user-agent"];
      if (!userAgent) {
        throw new ApiError(
          responseType.UNSUCCESSFUL.code,
          responseType.UNSUCCESSFUL.type,
          "User-Agent header missing in the request (mandatory for creating a login-session)"
        );
      }
      const details = parseUserAgent(userAgent);

      // Check if another login-session from the same device already exists
      /*
        NOTE: Multiple login sessions can be made but there can be only one login-session from one user-agent
      */
      const sessionFromDB = await Session.findOne({
        $and: [{ userId: userFromDB._id }, { details }],
      });
      if (sessionFromDB) {
        // Log an event
        await securityLog.logEvent({
          userId: userFromDB._id,
          eventCode: EventCode.OTP_AUTHENTICATION,
          eventSuccess: false,
          message:
            "There exists a login session corresponding to this User-Agent.",
        });
        // Throw error
        throw new ApiError(
          responseType.ALREADY_EXISTS.code,
          responseType.ALREADY_EXISTS.type,
          "There exists a login session corresponding to this user-agent in the database"
        );
      }

      // Create a new corresponding session
      const createdSession = await Session.create({
        projectId,
        userId: userFromDB._id,
        accessToken,
        accessTokenExpiry,
        refreshToken: undefined,
        refreshTokenExpiry: undefined,
        details,
      });
      const sessionId = createdSession._id;

      // Remove the token and expiry from the user-document
      userFromDB.token = undefined;
      userFromDB.tokenExpiry = undefined;
      await userFromDB.save();

      // Create response-data
      const responseData = await Session.aggregate([
        // Filter all the Session documents and match `_id` with sessionId
        {
          $match: {
            _id: sessionId,
          },
        },
        // Create a new `user` field and populate it with user-details by looking up the `userId` field
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        // Since $lookup returns an array, so unwind the `user` field into individual documents (in this case, it'll be one single document only)
        {
          $unwind: "$user",
        },
        // Remove certain fields from the final result
        {
          $project: {
            userId: 0,
            user: {
              password: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
              projectId: 0,
              token: 0,
              tokenExpiry: 0,
            },
            __v: 0,
          },
        },
      ]);

      // Log an event
      await securityLog.logEvent({
        userId: userFromDB._id,
        eventCode: EventCode.OTP_AUTHENTICATION,
        eventSuccess: true,
        sessionId: createdSession._id,
      });

      // Send response with browser cookie (Access token) & created session
      res
        .status(responseType.SUCCESSFUL.code)
        .cookie("user-access-token", accessToken, {
          ...cookieOptions,
          maxAge: 1 * 24 * 60 * 60 * 1000,
        })
        .json(
          new ApiResponse(
            responseType.SUCCESSFUL.code,
            responseType.SUCCESSFUL.type,
            "OTP-based Authentication completed.",
            responseData
          )
        );
    }

    // Send error response
    else {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Request query parameters not sent correctly"
      );
    }
  }
);
