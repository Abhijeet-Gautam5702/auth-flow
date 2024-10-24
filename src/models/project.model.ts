import { Schema, model } from "mongoose";
import { IProject, IProjectMethods, IProjectModel } from "../types/types";

const ProjectSchema = new Schema<IProject, IProjectModel, IProjectMethods>(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
    },
    config:{
        // Project configurations and settings
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
