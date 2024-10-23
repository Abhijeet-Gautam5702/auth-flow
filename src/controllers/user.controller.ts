import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import { env, responseType } from "../constants";
import { validateSignupInput } from "../schema/validation";
import { User } from "../models/user.model";
import { ApiResponse } from "../utils/custom-api-response";
import { IUser } from "../types/types";
import { generateToken } from "../utils/token-generator";

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
    const userData = await User.findById(createdUser._id).select("-password");

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
