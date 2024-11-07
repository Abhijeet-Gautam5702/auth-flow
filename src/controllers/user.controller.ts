import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import {
  backendDomain,
  cookieOptions,
  defaultEmailTemplates,
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
import { IAdmin, IProject, IRequest, ISession, IUser } from "../types/types";
import { parseUserAgent } from "../utils/user-agent-parser";
import { Project } from "../models/project.model";
import { sendMail } from "../utils/mailer";
import { emailGenerator } from "../utils/email-generator";
import jwt from "jsonwebtoken";
import { ZEmail, ZPassword } from "../schema/zod.schema";
import { otp } from "../services/otp";
import mongoose from "mongoose";
import { accountLockout } from "../services/account-lockout";

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
      projectId: req.project?.id,
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
    const details = parseUserAgent(userAgent);

    // Check if another login-session from the same device already exists
    /*
      NOTE: Multiple login sessions can be made but there can be only one login-session from one user-agent
    */
    const sessionFromDB = await Session.findOne({
      $and: [{ userId: userFromDB._id }, { details }],
    });
    if (sessionFromDB) {
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

// SECURED ROUTE: DELETE USER LOGIN SESSION (CURRENT ONE)
export const deleteCurrentLoginSession = asyncHandler(
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
    const userId = req.user?.id;

    // Delete all sessions whose userId matches with `userId`
    await Session.deleteMany({ userId });

    // Delete the user-document from the database
    await User.findByIdAndDelete(userId);

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
    const userId = req.user?.id;

    // Get all session documents using the userId
    const userSessionsFromDB =
      (await Session.find({ userId }).select(
        "-accessToken -accessTokenExpiry -refreshToken -refreshTokenExpiry"
      )) || [];

    // Send response with list of sessions' data
    res
      .status(responseType.SUCCESSFUL.code)
      .json(
        new ApiResponse(
          responseType.SUCCESSFUL.code,
          responseType.SUCCESSFUL.type,
          "Session List fetched successfully",
          userSessionsFromDB
        )
      );
  }
);

// SECURED ROUTE: DELETE A PARTICULAR USER LOGIN SESSION USING ITS SESSION-ID
export const deleteLoginSessionByID = asyncHandler(
  async (req: IRequest, res: Response) => {
    // User-auth-middleware: Authenticate the user
    const userId = req.user?.id;

    // Get the sessionId from the request params
    const sessionId = req.params.sessionId;

    console.log("sessionId = ", sessionId); // testing

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
    const userId = req.user?.id;

    // Delete the session-document using the access token
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
            "Your email has already been verified",
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
        emailGenerator.userVerification(
          `${frontendDomain}/user/verify?token=${verificationToken}`
        ); // TODO: The frontend website link will be taken from the client (not user) OR the Authwave frontend website link can be used

      // Send email to the user
      const emailResponse = await sendMail({
        organization: `${ORG_NAME} <${ORG_EMAIL}>`,
        userEmail: userFromDB.email,
        subject: "Verify your AuthWave user account",
        template: userVerificationEmail,
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
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Mismatch in User-IDs in verification token and in browser cookies"
        );
      }
      if (verificationToken !== userFromDB.token) {
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "The verification token in database doesn't match with the provided token"
        );
      }
      if (userFromDB.tokenExpiry! < new Date()) {
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
        emailGenerator.resetPassword(
          `${frontendDomain}/user/reset-password?token=${resetPasswordToken}`
        ); // TODO: The frontend website link will be taken from the client (not user) OR the Authwave frontend website link can be used

      // Send email to the user
      const emailResponse = await sendMail({
        organization: `${ORG_NAME} <${ORG_EMAIL}>`,
        userEmail: userFromDB.email,
        subject:
          "Password Reset Request for Your AuthWave Account – Action Required",
        template: resetPasswordEmail,
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
        throw new ApiError(
          responseType.UNSUCCESSFUL.code,
          responseType.UNSUCCESSFUL.type,
          "New Password not found in the request body"
        );
      }

      // Validate Password-schema
      const isPasswordValid = ZPassword.safeParse(newPassword);
      if (!isPasswordValid.success) {
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
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Mismatch in User-IDs in token and in browser cookies"
        );
      }
      if (resetPasswordToken !== userFromDB.token) {
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "The reset-password token in database doesn't match with the provided token"
        );
      }
      if (userFromDB.tokenExpiry! < new Date()) {
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
          sessionFromDB
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
        "MagicURL Authentication is not enabled by the project admin. Enable the setting to continue."
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
      const userFromDB: IUser | null = await User.findOne({ email }).select(
        "-password"
      );
      if (userFromDB) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, email);
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
        emailGenerator.magicURLonEmail(
          `${frontendDomain}/user/auth/magic-url?magicURLToken=${magicURLToken}`
        ); // TODO: The frontend website link will be taken from the client (not user) OR the Authwave frontend website link can be used

      // Send email to the user
      const emailResponse = await sendMail({
        organization: `${ORG_NAME} <${ORG_EMAIL}>`,
        userEmail: createdUser.email,
        subject: "Complete your Magic-URL authentication",
        template: magicURLVerificationEmail,
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
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Magic-URL tokens in the database does not match with the token provided"
        );
      }
      if (userFromDB.tokenExpiry! < new Date()) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
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
      const details = parseUserAgent(userAgent);

      // Check if another login-session from the same device already exists
      /*
        NOTE: Multiple login sessions can be made but there can be only one login-session from one user-agent
      */
      const sessionFromDB = await Session.findOne({
        $and: [{ userId: userFromDB._id }, { details }],
      });
      if (sessionFromDB) {
        throw new ApiError(
          responseType.ALREADY_EXISTS.code,
          responseType.ALREADY_EXISTS.type,
          "There exists a login session corresponding to this user-agent in the database"
        );
      }

      // Create a new corresponding session-document
      const createdSession: ISession = await Session.create({
        projectId,
        userId: userFromDB._id,
        accessToken,
        accessTokenExpiry,
        refreshToken,
        refreshTokenExpiry,
        details,
      });

      // Update the magic-URL verifications status in the user-document
      userFromDB.token = undefined;
      userFromDB.tokenExpiry = undefined;
      await userFromDB.save();

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
            createdSession
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
        emailGenerator.OTPonEmail(newOtp.unhashedOTP);

      // Send email to the user
      const emailResponse = await sendMail({
        organization: `${ORG_NAME} <${ORG_EMAIL}>`,
        userEmail: user.email,
        subject: "Complete your Magic-URL authentication",
        template: otpVerificationEmail,
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
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "Corresponding user not found in the database. Initiate the authentication process again."
        );
      }
      if (String(decodedOTP.projectId) != String(projectFromDB._id)) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);

        throw new ApiError(
          responseType.NOT_FOUND.code,
          responseType.NOT_FOUND.type,
          "Project-ID mismatch in OTP and request headers. Initiate the authentication process again."
        );
      }
      if (!userFromDB.token || !userFromDB.tokenExpiry) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
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
        throw new ApiError(
          responseType.INCORRECT_PASSWORD.code,
          responseType.INCORRECT_PASSWORD.type,
          "One Time Passwords do not match. Initiate the process again."
        );
      }
      if (userFromDB.tokenExpiry < new Date()) {
        // Track the number of failed login attempts
        accountLockout.handleFailedLoginAttempt(req.ip!, userFromDB.email);
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
        throw new ApiError(
          responseType.ALREADY_EXISTS.code,
          responseType.ALREADY_EXISTS.type,
          "There exists a login session corresponding to this user-agent in the database"
        );
      }

      // Create a new corresponding session
      const createdSession: ISession = await Session.create({
        projectId,
        userId: userFromDB._id,
        accessToken,
        accessTokenExpiry,
        refreshToken: undefined,
        refreshTokenExpiry: undefined,
        details,
      });

      // Remove the token and expiry from the user-document
      userFromDB.token = undefined;
      userFromDB.tokenExpiry = undefined;
      await userFromDB.save();

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
            createdSession
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

// AUTHENTICATE USING OTP ON MOBILE

/*
    AUTHENTICATION FEATURES
    - USER LOGIN USING OTPs (ON MOBILE)
*/

/*
    SECURITY FEATURES

    - SECURITY AUDITING (log the activities on the user dashboard & admin dashboards)
*/
