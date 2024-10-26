import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { IRequest } from "../types/types";
import { ApiError } from "../utils/custom-api-error";
import { env, responseType } from "../constants";
import { Project } from "../models/project.model";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/custom-api-response";

// SECURED ROUTE: CREATE NEW PROJECT
export const createProject = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Admin-auth middleware: Authenticate the admin
    const adminId = req.admin?.id;

    // Get the project-details from the request-body
    const { projectName, config } = req.body;
    if (projectName.trim() === "") {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Please provide a valid name for the project"
      );
    }
    if (!config) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Please provide a valid config details for the project"
      );
    }

    // Check if a project with the same project-name exists in the database
    const projectFromDB = await Project.findOne({
      projectName,
      owner: adminId,
    }).select("-secretKey");
    if (projectFromDB) {
      throw new ApiError(
        responseType.ALREADY_EXISTS.code,
        responseType.ALREADY_EXISTS.type,
        "Project with the same name already exists. Provide a different name."
      );
    }

    // Create a new project (without the project-secret)
    const createdProject = await Project.create({
      projectName,
      owner: adminId,
      config,
      projectKey: "null",
    });

    // Create a new secretKey for the project
    const projectKey = jwt.sign(
      {
        projectId: createdProject._id,
        owner: createdProject.owner,
      },
      env.secret.projectKeyGeneration
    );

    // Update the `projectKey` in the project document
    createdProject.projectKey = projectKey;
    await createdProject.save();

    // Send response with project data
    res
      .status(responseType.CREATED.code)
      .json(
        new ApiResponse(
          responseType.CREATED.code,
          responseType.CREATED.type,
          "New project created successfully",
          createdProject
        )
      );
  }
);

// SECURED ROUTE: UPDATE PROJECT CONFIGURATION
export const updateProjectConfig = asyncHandler(
  async (req: IRequest, res: Response) => {}
);

// SECURED ROUTE: CREATE A NEW PROJECT SECRET-KEY
export const createNewSecretKey = asyncHandler(
  async (req: IRequest, res: Response) => {}
);
