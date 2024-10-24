import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import { cookieOptions, env, responseType } from "../constants";
import { validateSignupInput } from "../schema/validation";
import { ApiResponse } from "../utils/custom-api-response";
import { filterObject } from "../utils/filter-object";
import { generateToken } from "../utils/token-generator";
import { IAdmin, IRequest } from "../types/types";
import { Admin } from "../models/admin.model";

// CREATE ADMIN ACCOUNT
export const createAccount = asyncHandler(
  async (req: Request, res: Response) => {
    // Get the user credentials
    const { email, password } = req.body;
    if (!(email && password)) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "One or more field(s) are not provided. Please enter all fields."
      );
    }
    // Validate schema of input fields
    const validation = validateSignupInput({ password, email });
    if (!validation.success) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Please enter all the input field data in valid format",
        validation.errors
      );
    }
    // Verify if admin already exists
    const adminFromDB = await Admin.findOne({
      email,
    });
    if (adminFromDB) {
      throw new ApiError(
        responseType.ALREADY_EXISTS.code,
        responseType.ALREADY_EXISTS.type,
        "Admin already present in the database. Please Login."
      );
    }
    // Create a new account
    const createdAdmin = await Admin.create({
      email,
      password,
    });

    // Remove sensitive data from the user-data (newly created)
    /* Note: Another database call is not made to reduce the number of interactions with the Database */
    const adminData = filterObject(createdAdmin, [], ["password"]);

    // Send response
    res
      .status(200)
      .json(
        new ApiResponse(
          responseType.ACCOUNT_CREATED.code,
          responseType.ACCOUNT_CREATED.type,
          "Admin account created successfully.",
          adminData
        )
      );
  }
);

// SECURED ROUTE: DELETE ADMIN ACCOUNT
export const deleteAccount = asyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    // Authenticate the admin
    // Delete admin-document
    // Delete all projects whose owner is the current admin
    // Clear all browser cookies and send response
  }
);

// CREATE ADMIN LOGIN SESSION
export const createLoginSession = asyncHandler(
  async (req: Request, res: Response) => {
    // Get the admin credentials
    const { email, password } = req.body;
    if (!(email && password)) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "One or more field(s) are not provided. Please enter all fields."
      );
    }
    // Validate schema of input fields
    const validation = validateSignupInput({ password, email });
    if (!validation.success) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Please enter all the input field data in valid format",
        validation.errors
      );
    }

    // Check if the admin exists in the database
    const adminFromDB = await Admin.findOne({ email });
    if (!adminFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Admin not found in database. Enter the correct login credentials"
      );
    }

    // Validate the password
    const isPasswordCorrect = await adminFromDB.validatePassword(password);
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
        adminId: adminFromDB._id,
        email: adminFromDB.email,
      },
      env.token.accessToken.secret,
      env.token.accessToken.expiry
    );
    const refreshToken = generateToken(
      {
        adminId: adminFromDB._id,
        email: adminFromDB.email,
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

    // Update the tokens in the admin-document
    adminFromDB.refreshToken = refreshToken;
    adminFromDB.refreshTokenExpiry = refreshTokenExpiry;
    adminFromDB.accessToken = accessToken;
    adminFromDB.accessTokenExpiry = accessTokenExpiry;
    await adminFromDB.save();

    const adminData = filterObject(adminFromDB, [], ["password"]);

    // Set browser cookies and send response
    res
      .status(responseType.SESSION_CREATED.code)
      .cookie("admin-access-token", accessToken, {
        ...cookieOptions,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .cookie("admin-refresh-token", refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/refresh",
      })
      .json(
        new ApiResponse(
          responseType.SESSION_CREATED.code,
          responseType.SESSION_CREATED.type,
          "Login session created successfully",
          adminData
        )
      );
  }
);

// SECURED ROUTE: DELETE ADMIN LOGIN SESSION
export const deleteLoginSession = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Admin-Auth-Middleware: Authenticate the admin
    const adminId = req.admin?.id;

    // Delete the token details from the admin-document in database
    await Admin.findByIdAndUpdate(adminId, {
      refreshToken: null,
      refreshTokenExpiry: null,
      accessToken: null,
      accessTokenExpiry: null,
    });

    // Clear the browser cookies and send response
    res
      .status(responseType.SESSION_DELETED.code)
      .clearCookie("admin-access-token")
      .clearCookie("admin-refresh-token")
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

// REFRESH THE ACCESS TOKEN

// SECURED ROUTE: CREATE NEW PROJECT

// SECURED ROUTE: UPDATE PROJECT CONFIGURATION
