/* ------------------------------ USER MODEL TYPES ------------------------------------ */

import mongoose, { Model, Schema, Document, Types } from "mongoose";

// Mongoose: Base interface for User-document
export interface IUserBase {
  projectId: mongoose.Schema.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  token?: string;
  tokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose: Interface for instance methods on user documents
export interface IUserMethods {
  validatePassword(password: string): Promise<boolean>;
}

// Mongoose: Interface for static methods on user documents
export interface IUserStaticMethods {}

// Mongoose: Combined interface for a User Document
export interface IUser extends IUserBase, Document<Types.ObjectId> {}

// Mongoose: Type for model methods on User Model
export interface IUserModel
  extends Model<IUser, {}, IUserMethods>,
    IUserStaticMethods {}
