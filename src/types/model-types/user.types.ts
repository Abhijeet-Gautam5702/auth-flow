/* ------------------------------ USER MODEL TYPES ------------------------------------ */

import mongoose, { Model, Schema, Document, Types } from "mongoose";

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
  token?: string;
  tokenExpiry?: Date;
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
export interface IUser
  extends IUserBase,
    IUserMethods,
    Document<Types.ObjectId> {}

// Mongoose: User model type
/*
    NOTE: This defines the shape of the static methods (model level operations)
*/
export type IUserModel = Model<IUser, {}, IUserMethods>;
