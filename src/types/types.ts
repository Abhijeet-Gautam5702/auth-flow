import { Request } from "express";
import mongoose, { Document, Model } from "mongoose";

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
export interface IRequest extends Request {
  project?: {
    id: string | mongoose.Schema.Types.ObjectId;
    secret: string;
  };
  user?: {
    id?: string | mongoose.Schema.Types.ObjectId;
  };
  admin?: {
    id?: string | mongoose.Schema.Types.ObjectId;
  };
  session?: {
    id?: string | mongoose.Schema.Types.ObjectId;
    token?: string;
  };
}

/* ------------------------------ USER MODEL TYPES ------------------------------------ */

// Mongoose: Base interface for User-document
/*
  NOTE: export interface IUser extends Document{ // properties } could also work, but better to separate the types
*/
export interface IUserBase {
  projectId: mongoose.Schema.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
}

// Mongoose: Interface for User-document methods
/* 
  Note: Not defining the interface for document-methods, typescript will not recognize mongoose methods and throw errors
*/
export interface IUserMethods {
  validatePassword(password: string): Promise<boolean>;
}

// Mongoose: Combined interface for defining the user-document type
/* 
  Note: This says that a mongoose user-document will have this structure 
*/
export interface IUser extends IUserBase, IUserMethods, Document {}

// Mongoose: User model type
/*
  NOTE: This defines the shape of the static methods (model level operations)
*/
export type IUserModel = Model<IUser, {}, IUserMethods>;

/* ------------------------------ SESSION MODEL TYPES ------------------------------------ */

// Device-type enum
export enum DeviceType {
  mobile = "mobile",
  desktop = "desktop",
}

// Mongoose: SessionBase (base interface)
export interface ISessionBase extends Document {
  projectId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  accessToken: string;
  accessTokenExpiry: Date;
  refreshToken: string;
  refreshTokenExpiry: Date;
  details: {
    userAgent: string;
    deviceType: DeviceType;
    os: string;
  };
}

// Mongoose: Session Methods (instance methods)
export interface ISessionMethods {}

// Mongoose: Session interface (combined)
export interface ISession extends ISessionBase, ISessionMethods, Document {}

// Mongoose: Session Model interface
export type ISessionModel = Model<ISession, {}, ISessionMethods>;

/* ------------------------------ PROJECT MODEL TYPES ------------------------------------ */

// Mongoose: Base interface for the Project Document
export interface IProjectBase {
  projectName: string;
  projectKey: string;
  config: {
    loginMethods: {
      emailPassword: boolean;
      OTPonEmail?: boolean;
      OTPonMobile?: boolean;
      magicURLonEmail?: boolean;
    };
    security?: {
      userLimit?: number;
      userSessionLimit?: number;
    };
    emailTemplates?: {
      userVerification?: string;
      resetPassword?: string;
      userLimitExceeded?: string;
      userSessionLimitExceeded?: string;
      OTPonEmail?: string;
      magicURLonEmail?: string;
    };
  };
  owner: mongoose.Schema.Types.ObjectId;
}

// Mongoose: Interface for instance methods on project documents
export interface IProjectMethods {}

// Mongoose: Combined interface for a Project Document
export interface IProject extends IProjectBase, IProjectMethods, Document {}

// Mongoose: Type for model methods on Project Model
export type IProjectModel = Model<IProject, {}, IProjectMethods>;

/* ------------------------------ PROJECT MODEL TYPES ------------------------------------ */

export interface IAdminBase {
  email: string;
  password: string;
  accessToken: string;
  accessTokenExpiry: Date;
  refreshToken: string;
  refreshTokenExpiry: Date;
}

export interface IAdminMethods {
  validatePassword(password: string): Promise<boolean>;
}

export interface IAdmin extends IAdminBase, IAdminMethods, Document {}

export type IAdminModel = Model<IAdmin, {}, IAdminMethods>;

/* -------------------------------------------------------------------------- */

// Fn: Validation of Signup Inputs
export interface IValidateSignupInput {
  success: boolean;
  errors?: any[] | undefined;
}

// Signup inputs
export interface ISignupInput {
  username?: string;
  email: string;
  password: string;
}
