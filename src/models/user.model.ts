import { model, Schema } from "mongoose";
import { IUser } from "../types/types";

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
    },
    verification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verificationToken: {
        type: String,
        unique: true,
      },
      verificationTokenExpiry: Date,
    },
    resetPassword: {
      resetPasswordToken: {
        type: String,
        unique: true,
      },
      resetPasswordTokenExpiry: Date,
    },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
