import { Schema, model } from "mongoose";
import { IProject, IProjectMethods, IProjectModel } from "../types/types";

const ProjectSchema = new Schema<IProject, IProjectModel, IProjectMethods>(
  {
    projectName: {
      type: String,
      required: true,
      lowercase: true,
    },
    config: {
      loginMethods: {
        emailPassword: {
          type: Boolean,
          required: true,
          default: true,
        },
        OTPonEmail: {
          type: Boolean,
          default: false,
        },
        OTPonMobile: {
          type: Boolean,
          default: false,
        },
        magicURLonEmail: {
          type: Boolean,
          default: false,
        },
      },
      security: {
        userLimit: {
          type: Number,
          default: 100,
          min: 100,
          max: 1000,
        },
        userSessionLimit: {
          type: Number,
          default: 5,
          min: 5,
          max: 10,
        },
      },
      emailTemplates: {
        userVerification: {
          type: String,
          required: false,
        },
        resetPassword: {
          type: String,
          required: false,
        },
        userLimitExceeded: {
          type: String,
          required: false,
        },
        userSessionLimitExceeded: {
          type: String,
          required: false,
        },
        OTPonEmail: {
          type: String,
          required: false,
        },
        magicURLonEmail: {
          type: String,
          required: false,
        },
      },
    },
    projectKey: {
      type: String,
      required: true,
      unique: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true, validateBeforeSave: true }
);

export const Project = model<IProject>("Project", ProjectSchema);
