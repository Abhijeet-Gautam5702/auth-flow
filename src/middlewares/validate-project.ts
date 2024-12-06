import { NextFunction, Response } from "express";
import { IRequest } from "../types/types";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import { responseType } from "../constants";
import { Project } from "../models/project.model";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

export const validateProject = asyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    // Skip all endpoints with "/admin/"
    const endpointPath = req.path;
    if (endpointPath.includes("/admin/")) {
      return next(); // Note: `return` keyword is necessary otherwise the code outside the if-block will also be executed
    }

    // Get the project credentials from request headers
    const projectId: string = req.headers["project-id"] as string;
    const projectKey: string = req.headers["project-key"] as string;
    if (!projectId && !projectKey) {
      throw new ApiError(
        responseType.INVALID_PROJECT_CREDENTIALS.code,
        responseType.INVALID_PROJECT_CREDENTIALS.type,
        "Go to the console and get the valid project credentials"
      );
    }

    // Validate the format of the project-Id
    if (!Types.ObjectId.isValid(projectId)) {
      throw new ApiError(
        responseType.INVALID_PROJECT_CREDENTIALS.code,
        responseType.INVALID_PROJECT_CREDENTIALS.type,
        "Invalid Project-ID is provided."
      );
    }

    // Check if the project exists
    const projectFromDB = await Project.findById(projectId);
    if (!projectFromDB) {
      throw new ApiError(
        responseType.INVALID_PROJECT_CREDENTIALS.code,
        responseType.INVALID_PROJECT_CREDENTIALS.type,
        "Project corresponding to credentials not found in the database"
      );
    }
    // Check if the project key is valid
    if (projectFromDB.projectKey !== projectKey) {
      throw new ApiError(
        responseType.INVALID_PROJECT_CREDENTIALS.code,
        responseType.INVALID_PROJECT_CREDENTIALS.type,
        "Project-Key Mismatch. Provide the correct Project-Key."
      );
    }

    // Check if the project-key corresponds to the desired project only
    const decodedProjectKey = jwt.decode(projectKey) as {
      projectId?: string | Types.ObjectId;
    } | null; // jwt.decode( ) always decodes the token without any error (irrespective of the expiry) & we want exactly that.

    if (String(decodedProjectKey?.projectId) != String(projectFromDB._id)) {
      throw new ApiError(
        responseType.INVALID_PROJECT_CREDENTIALS.code,
        responseType.INVALID_PROJECT_CREDENTIALS.type,
        "Project-ID in the database and that of the provided Project-Key do not match. Please provide the correct and valid Project-Key."
      );
    }

    // Attach a project-object to the HTTP-`req` object
    req.project = {
      id: new Types.ObjectId(projectId),
      key: projectKey,
    };
    
    next();
  }
);
