// Middleware to validate project credentials (to grant access to the API-endpoints)

import { NextFunction, Response } from "express";
import { IRequest } from "../types/types";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/custom-api-error";
import { responseType } from "../constants";
import { Project } from "../models/project.model";
import jwt from "jsonwebtoken";

export const validateProject = asyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    // Skip all endpoints with "/admin/"
    const endpointPath = req.path;
    if (endpointPath.includes("/admin/") || endpointPath.includes("/project/create")) {
      return next(); // Note: `return` keyword is necessary otherwise the code outside the if-block will also be executed
    }

    // Get the project credentials from request headers
    const projectId: string = req.headers["project-Id"] as string;
    const projectSecret: string = req.headers["project-secret"] as string;
    if (!projectId && !projectSecret) {
      throw new ApiError(
        responseType.INVALID_PROJECT_CREDENTIALS.code,
        responseType.INVALID_PROJECT_CREDENTIALS.type,
        "Go to the console and get the valid project credentials"
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

    // Check if the project-secret is valid
    const decodedProjectSecret = jwt.decode(projectSecret); // jwt.decode( ) always decodes the token without any error (irrespective of the expiry) & we want exactly that.
    if (decodedProjectSecret !== projectId) {
      throw new ApiError(
        responseType.INVALID_PROJECT_CREDENTIALS.code,
        responseType.INVALID_PROJECT_CREDENTIALS.type,
        "IDs of the provided Project-ID and the Project-Secret do not match"
      );
    }

    // Attach a project-object to the HTTP-`req` object
    req.project = {
      id: projectId,
      secret: projectSecret,
    };

    // Pass control to next middleware/controller
    next();
  }
);
