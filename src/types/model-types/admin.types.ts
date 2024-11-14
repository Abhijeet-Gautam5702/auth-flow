/* ------------------------------ ADMIN MODEL TYPES ------------------------------------ */

import { Model, Document, Schema, Types } from "mongoose";

export interface IAdminBase {
  email: string;
  password: string;
  accessToken: string;
  accessTokenExpiry: Date;
  refreshToken: string;
  refreshTokenExpiry: Date;
}

// Mongoose: Interface for instance methods on admin documents
export interface IAdminMethods {
  validatePassword(password: string): Promise<boolean>;
}

// Mongoose: Interface for static methods on admin documents
export interface IAdminStaticMethods {}

// Mongoose: Combined interface for an Admin Document
export interface IAdmin extends IAdminBase, Document<Types.ObjectId> {}

// Mongoose: Type for model methods on Admin Model
export interface IAdminModel
  extends Model<IAdmin, {}, IAdminMethods>,
    IAdminStaticMethods {}
