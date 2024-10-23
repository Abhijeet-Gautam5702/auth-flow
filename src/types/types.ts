import { Request } from "express";
import mongoose, { Document, Model } from "mongoose";

// Utility: ApiError class
export interface IApiError {
  message: string;
  errors?: any[] | undefined;
  statusCode: number;
  type: string;
  data: null;
  success: boolean;
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
  user?: {
    id?: string | mongoose.Schema.Types.ObjectId;
  };
  session?:{
    id?: string | mongoose.Schema.Types.ObjectId;
    token?:string
  }
}

/* ------------------------------ USER MODEL TYPES ------------------------------------ */

// Mongoose: Base interface for User-document
/*
  NOTE: export interface IUser extends Document{ // properties } could also work, but better to separate the types
*/
export interface IUserBase {
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

// Mongoose: SessionBase (base interface)
export interface ISessionBase extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  accessToken: string;
  accessTokenExpiry: Date;
  refreshToken: string;
  refreshTokenExpiry: Date;
}

// Mongoose: Session Methods (instance methods)
export interface ISessionMethods {}

// Mongoose: Session interface (combined)
export interface ISession extends ISessionBase, ISessionMethods, Document {}

// Mongoose: Session Model interface
export type ISessionModel = Model<ISession, {}, ISessionMethods>;

/* -------------------------------------------------------------------------- */

// Fn: Validation of Signup Inputs
export interface IValidateSignupInput {
  success: boolean;
  errors?: any[] | undefined;
}

// Signup inputs
export interface ISignupInput {
  username: string;
  email: string;
  password: string;
}
