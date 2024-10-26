import { Schema, model } from "mongoose";
import {
  DeviceType,
  ISession,
  ISessionMethods,
  ISessionModel,
} from "../types/types";

const SessionSchema = new Schema<ISession, ISessionModel, ISessionMethods>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
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
    details: {
      userAgent: {
        type: String,
        required: true,
      },
      os: {
        type: String,
        required: true,
      },
      platform: {
        type: String,
        required: true,
      },
      deviceType: {
        type: String,
        enum: Object.values(DeviceType),
        required: true,
      },
    },
  },
  { timestamps: true, validateBeforeSave: true }
);

export const Session = model<ISession>("Session", SessionSchema);
