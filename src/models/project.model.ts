import { Schema, model } from "mongoose";
import { IProject, IProjectMethods, IProjectModel } from "../types/types";

const ProjectSchema = new Schema<IProject, IProjectModel, IProjectMethods>(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
    },
    config: {
      loginMethods: {
        emailPassword: {
          type: Boolean,
          required: true,
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
        userLimit:{
          type:Number,
          default:1000,
        },
        userSessionLimit:{
          type:Number,
          default:5,
        },
      }
    },
    secret: {
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
