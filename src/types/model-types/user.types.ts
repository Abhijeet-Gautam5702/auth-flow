import mongoose, { Model, Document, Types } from "mongoose";

export interface IPagination {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  itemLimit: number;
  currentPageNumber: number;
  totalDocs: number;
  totalPages: number;
}

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
export interface IUserStaticMethods {
  getUsersByProject(input: {
    projectId: Types.ObjectId | string;
    startDate?: Date | string;
    endDate?: Date | string;
    page?: number;
    queryItemCount?: number;
  }): Promise<{
    users: IUser[];
    pagination: IPagination;
  }>;
  searchUsers(input: {
    searchQuery: string;
    projectId: Types.ObjectId | string;
    page?: number;
    queryItemCount?: number;
    startDate?: Date | string;
    endDate?: Date | string;
  }): Promise<{
    users: IUser[];
    pagination: IPagination;
  }>;
}

// Mongoose: Combined interface for a User Document
export interface IUser extends IUserBase, Document<Types.ObjectId> {}

// Mongoose: Type for model methods on User Model
export interface IUserModel
  extends Model<IUser, {}, IUserMethods>,
    IUserStaticMethods {}
