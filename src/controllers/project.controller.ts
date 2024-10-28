import { NextFunction, Request, response, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { IProject, IRequest, ProjectConfig } from "../types/types";
import { ApiError } from "../utils/custom-api-error";
import { env, responseType } from "../constants";
import { Project } from "../models/project.model";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/custom-api-response";
import {
  validateEmailTemplates,
  validateLoginMethods,
  validateSecurityObject,
} from "../utils/project-config-validator";
import mongoose from "mongoose";

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
    }).select("-projectKey");
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
      projectKey: `temporary-project-key-${Math.random()}`,
    });

    // Create a new projectKey for the project
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

// SECURED ROUTE: CREATE A NEW PROJECT-KEY
export const createNewProjectKey = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Admin-auth-middleware: Authenticate the admin

    // Validate-project middleware: Validate the project
    const projectId = req.project?.id;

    // Find the project document from the database
    const projectFromDB = await Project.findById(projectId);
    if (!projectFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Project with the given Project-ID not found in the database"
      );
    }

    // Create a new projectKey for the project
    const projectKey = jwt.sign(
      {
        projectId: projectFromDB._id,
        owner: projectFromDB.owner,
      },
      env.secret.projectKeyGeneration
    );

    // Update the `projectKey` in the project document
    projectFromDB.projectKey = projectKey;
    await projectFromDB.save();

    // Send response with updated project data
    res
      .status(responseType.CREATED.code)
      .json(
        new ApiResponse(
          responseType.CREATED.code,
          responseType.CREATED.type,
          "New Project-Key created successfully",
          projectFromDB
        )
      );
  }
);

// SECURED ROUTE: GET A PROJECT (USING ITS PROJECT-ID) [no need to validate project]
export const getProject = asyncHandler(async (req: IRequest, res: Response) => {
  // Admin-auth middleware: Authenticate the admin

  // Get the project-ID from the request params
  const projectId = req.params["projectId"];
  if (!projectId) {
    throw new ApiError(
      responseType.INVALID_FORMAT.code,
      responseType.INVALID_FORMAT.type,
      "Project-ID not provided in Request Params"
    );
  }

  // Get the project document from the database
  const projectFromDB = await Project.findById(projectId);
  if (!projectFromDB) {
    throw new ApiError(
      responseType.NOT_FOUND.code,
      responseType.NOT_FOUND.type,
      "Project with the provided Project-ID not found in the database"
    );
  }

  // Send response with the project data
  res
    .status(responseType.SUCCESSFUL.code)
    .json(
      new ApiResponse(
        responseType.SUCCESSFUL.code,
        responseType.SUCCESSFUL.type,
        "Project details fetched successfully",
        projectFromDB
      )
    );
});

// SECURED ROUTE: UPDATE PROJECT LOGIN-METHODS SETTINGS
export const updateLoginMethods = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Authenticate the admin

    // Validate the project
    const projectId = req.project?.id;

    // Get the login-methods settings object from the request-body
    const { loginMethods } = req.body;
    if (!loginMethods) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Login-Methods object not found in the Request-body"
      );
    }
    if (Object.keys(loginMethods).length === 0) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Login-Methods object is empty. Please provide a valid object."
      );
    }

    // Validate the login-methods object
    validateLoginMethods(loginMethods);

    // Get the project document from the database
    const projectFromDB = await Project.findById(projectId);
    if (!projectFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Project with the given Project-ID not found in the database"
      );
    }

    // Update the project document with the new login-methods settings
    projectFromDB.config.loginMethods = loginMethods;
    await projectFromDB.save();

    // Send response with update project document data
    res
      .status(responseType.SUCCESSFUL.code)
      .json(
        new ApiResponse(
          responseType.SUCCESSFUL.code,
          responseType.SUCCESSFUL.type,
          "Login-Methods updated successfully",
          projectFromDB
        )
      );
  }
);

// SECURED ROUTE: UPDATE PROJECT SECURITY SETTINGS
export const updateSecurity = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Authenticate the admin

    // Validate the project
    const projectId = req.project?.id;

    // Get the security settings object from the request-body
    const { security } = req.body;
    if (!security) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Security object not found in the Request-body"
      );
    }
    if (Object.keys(security).length === 0) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Security object is empty. Please provide a valid object."
      );
    }

    // Validate the security object
    validateSecurityObject(security);

    // Get the project document from the database
    const projectFromDB = await Project.findById(projectId);
    if (!projectFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Project with the given Project-ID not found in the database"
      );
    }

    // Update the project document with the new login-methods settings
    projectFromDB.config.security = security;
    await projectFromDB.save();

    // Send response with update project document data
    res
      .status(responseType.SUCCESSFUL.code)
      .json(
        new ApiResponse(
          responseType.SUCCESSFUL.code,
          responseType.SUCCESSFUL.type,
          "Security settings updated successfully",
          projectFromDB
        )
      );
  }
);

// SECURED ROUTE: UPDATE PROJECT EMAIL-TEMPLATE SETTINGS
export const updateEmailTemplates = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Authenticate the admin

    // Validate the project
    const projectId = req.project?.id;

    // Get the Email-Templates settings object from the request-body
    const { emailTemplates } = req.body;
    if (!emailTemplates) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Email-Template object not found in the Request-body"
      );
    }
    if (Object.keys(emailTemplates).length === 0) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Email-Template object is empty. Please provide a valid object."
      );
    }

    // Validate the Email-Templates object
    validateEmailTemplates(emailTemplates);

    // Get the project document from the database
    const projectFromDB = await Project.findById(projectId);
    if (!projectFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "Project with the given Project-ID not found in the database"
      );
    }

    // Update the project document with the new login-methods settings
    projectFromDB.config.emailTemplates = emailTemplates;
    await projectFromDB.save();

    // Send response with update project document data
    res
      .status(responseType.SUCCESSFUL.code)
      .json(
        new ApiResponse(
          responseType.SUCCESSFUL.code,
          responseType.SUCCESSFUL.type,
          "Email-Templates updated successfully",
          projectFromDB
        )
      );
  }
);

// SECURED ROUTE: DELETE A PROJECT (USING ITS PROJECT-ID) [no need to validate project]
export const deleteProject = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Admin-auth middleware: Authenticate the admin

    // Get the projectId from the request-params
    const { projectId } = req.params;
    if (!projectId) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        "Valid Project-ID not found in the request parameters"
      );
    }

    // Find the project and delete it
    await Project.findByIdAndDelete(projectId);

    // Send response
    res
      .status(responseType.DELETED.code)
      .json(
        new ApiResponse(
          responseType.DELETED.code,
          responseType.DELETED.type,
          "Project deleted successfully",
          {}
        )
      );
  }
);

// SECURED ROUTE: DELETE ALL CREATED PROJECTS [no need to validate project]
export const deleteAllProjects = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Admin-auth middleware: Authenticate the admin
    const adminId = req.admin?.id;

    // Delete all projects created by the admin
    await Project.deleteMany({ owner: adminId });

    // Send response
    res
      .status(responseType.DELETED.code)
      .json(
        new ApiResponse(
          responseType.DELETED.code,
          responseType.DELETED.type,
          "All projects deleted successfully",
          {}
        )
      );
  }
);

// SECURED ROUTE: GET ALL CREATED PROJECTS [no need to validate project]
export const getAllProjects = asyncHandler(
  async (req: IRequest, res: Response) => {
    // Admin-auth middleware: Authenticate the admin
    const adminId = req.admin?.id;

    // Find all the projects created by the admin
    const projectsFromDB: IProject[] | null = await Project.find({
      owner: adminId,
    });
    if (!projectsFromDB) {
      throw new ApiError(
        responseType.NOT_FOUND.code,
        responseType.NOT_FOUND.type,
        "No projects found in the database"
      );
    }

    // Send response
    res
      .status(responseType.SUCCESSFUL.code)
      .json(
        new ApiResponse(
          responseType.SUCCESSFUL.code,
          responseType.SUCCESSFUL.type,
          "Projects fetched successfully",
          projectsFromDB
        )
      );
  }
);
