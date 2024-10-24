import { Schema, model } from "mongoose";
import { IProject, IProjectMethods, IProjectModel } from "../types/types";

const ProjectSchema = new Schema<IProject, IProjectModel, IProjectMethods>(
  {
    secret: {
      type: String,
      required: true,
      unique: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, validateBeforeSave: true }
);

export const Project = model<IProject>("Project", ProjectSchema);
