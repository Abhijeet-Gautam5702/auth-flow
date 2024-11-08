import { Schema, model } from "mongoose";
import {
  EventCode,
  ISecurityLog,
  ISecurityLogMethods,
  ISecurityLogModel,
} from "../types/types";

const SecurityLogSchema = new Schema<
  ISecurityLog,
  ISecurityLogModel,
  ISecurityLogMethods
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
    },
    event: {
      code: {
        type: String,
        enum: Object.values(EventCode),
        required: true,
      },
      success: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
    message: {
      type: String,
      required: false,
    },
  },
  { timestamps: true, validateBeforeSave: true }
);

// Create an index on `createdAt` property (descending order) for the documents to get sorted according to the `createdAt` property
SecurityLogSchema.index({ createdAt: -1 });

export const Log = model<ISecurityLog>("Log", SecurityLogSchema);
