import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { IRequest } from "../types/types";

// SECURED ROUTE: CREATE NEW PROJECT
export const createProject = asyncHandler(
  async (req: Request, res: Response) => {}
);

// SECURED ROUTE: UPDATE PROJECT CONFIGURATION
export const updateProjectConfig = asyncHandler(
  async (req: Request, res: Response) => {}
);
