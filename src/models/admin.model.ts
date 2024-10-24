import { Schema, model } from "mongoose";
import { IAdmin, IAdminMethods, IAdminModel } from "../types/types";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { responseType } from "../constants";
import { ApiError } from "../utils/custom-api-error";

const AdminSchema = new Schema<IAdmin, IAdminModel, IAdminMethods>(
  {
    email: {
      type: String,
      unique: true,
      trim: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    accessToken: String,
    accessTokenExpiry: Date,
    refreshToken: String,
    refreshTokenExpiry: Date,
  },
  { timestamps: true, validateBeforeSave: true }
);

// Hash the password everytime before saving
AdminSchema.pre("save", async function () {
  try {
    // Hash the password only if it was modified
    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  } catch (error: any) {
    logger(
      responseType.DATABASE_ERROR.type,
      "Password could not be hashed before saving"
    );
    throw error;
  }
});

// Mongoose Instance method to validate password
AdminSchema.methods.validatePassword = async function (
  password: string
): Promise<boolean> {
  try {
    const isPasswordCorrect = await bcrypt.compare(password, this.password);
    return isPasswordCorrect;
  } catch (error) {
    logger(
      responseType.DATABASE_ERROR.type,
      "The password could not be compared with the hashed password stored in database"
    );
    throw new ApiError(
      responseType.DATABASE_ERROR.code,
      responseType.DATABASE_ERROR.type,
      "The password could not be compared with the hashed password stored in database",
      error
    );
  }
};

export const Admin = model<IAdmin>("Admin", AdminSchema);
