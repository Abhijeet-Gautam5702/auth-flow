import { model, Schema } from "mongoose";
import { IUser } from "../types/types";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { responseType } from "../constants";

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpiry: Date,

    resetPasswordToken: String,
    resetPasswordTokenExpiry: Date,
  },
  { timestamps: true, validateBeforeSave: true }
);

// Hash the password everytime before saving
UserSchema.pre("save", async function () {
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

export const User = model<IUser>("User", UserSchema);
