import { Schema, Types, model } from "mongoose";
import { ISession } from "../types/types";

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    accessToken: {
      type: String,
      unique: true,
    },
    accessTokenExpiry: {
      type: Date,
    },
    refreshToken: {
      type: String,
      unique: true,
    },
    refreshTokenExpiry: {
      type: Date,
    },
  },
  { timestamps: true, validateBeforeSave: true }
);

export const Session = model<ISession>("Session", SessionSchema);
