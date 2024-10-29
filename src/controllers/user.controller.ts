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
import { IProject, IRequest, IUser } from "../types/types";
import { parseUserAgent } from "../utils/user-agent-parser";
import { Project } from "../models/project.model";
import { sendMail } from "../utils/mailer";
import { emailGenerator } from "../utils/email-generator";
import jwt from "jsonwebtoken";
import { ZPassword } from "../schema/zod.schema";

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
    const userFromDB: IUser | null = await User.findById(userId).select(
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
    const { email, verificationToken } = req.query;

    // Initiate the verification process
    if (email && !verificationToken) {
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
      userFromDB.verificationToken = verificationToken;
      userFromDB.verificationTokenExpiry = verificationTokenExpiry;
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
    else if (verificationToken && !email) {
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
      if (verificationToken !== userFromDB.verificationToken) {
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "The verification token in database doesn't match with the provided token"
        );
      }
      if (userFromDB.verificationTokenExpiry! < new Date()) {
        throw new ApiError(
          responseType.TOKEN_EXPIRED.code,
          responseType.TOKEN_EXPIRED.type,
          "Initiate the verification process again."
        );
      }
      // Update the user document with the verification-status
      userFromDB.isVerified = true;
      userFromDB.verificationToken = undefined;
      userFromDB.verificationTokenExpiry = undefined;
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
    const userFromDB: IUser | null = await User.findById(userId);
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
      userFromDB.resetPasswordToken = resetPasswordToken;
      userFromDB.resetPasswordTokenExpiry = resetPasswordTokenExpiry;
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
      if (resetPasswordToken !== userFromDB.resetPasswordToken) {
        throw new ApiError(
          responseType.TOKEN_INVALID.code,
          responseType.TOKEN_INVALID.type,
          "The reset-password token in database doesn't match with the provided token"
        );
      }
      if (userFromDB.resetPasswordTokenExpiry! < new Date()) {
        throw new ApiError(
          responseType.TOKEN_EXPIRED.code,
          responseType.TOKEN_EXPIRED.type,
          "Initiate the password-reset process again."
        );
      }

      // Update the user-document
      userFromDB.password = newPassword;
      userFromDB.resetPasswordToken = undefined;
      userFromDB.resetPasswordTokenExpiry = undefined;
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

/*
    AUTHENTICATION FEATURES

    - USER LOGIN USING MAGIC-URL (ON EMAIL)
    - USER LOGIN USING OTPs (ON EMAIL)
    - USER LOGIN USING OTPs (ON MOBILE)

*/

/*
    SECURITY FEATURES

    - RATE LIMITING OF HTTP REQUESTS 
    - ACCOUNT LOCKOUT (FOR SOME TIME) ON CERTAIN NUMBER OF FAILED LOGIN ATTEMPTS
    - SECURITY AUDITING (log the activities on the user dashboard & admin dashboards)
*/
