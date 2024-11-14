import mongoose, { Types } from "mongoose";
import { Request } from "express";

// Utility: ApiError class
export interface IApiError {
  message: string;
  errors?: any[] | any | undefined;
  statusCode: number;
  type: string;
  data: null;
  success: boolean;
  stack?: string | undefined;
}

// Utility: ApiResponse class
export interface IApiResponse {
  message: string;
  statusCode: number;
  data: any;
  type: string;
  success: boolean;
}

// Utility: Custom ApiRequest interface (used when a middleware attaches additional data to the HTTP Request object)
/*
    NOTE:
    1. `Schema.Types.ObjectId` is used to define the type in a Schema
    2. `**Types.ObjectId` is used to define the typescript type for ObjectId
    3. `**Types.ObjectId()` is a method used to create an mongoose-ObjectId from a valid Hex string
  */
export interface IRequest extends Request {
  project?: {
    id?: mongoose.Types.ObjectId;
    key?: string;
  };
  user?: {
    id?: mongoose.Types.ObjectId;
  };
  admin?: {
    id?: mongoose.Types.ObjectId;
  };
  session?: {
    id?: mongoose.Types.ObjectId;
    token?: string;
  };
}
