import mongoose, { Model, Document, Types } from "mongoose";
import { IProject } from "./project.types";

// Device-type enum
export enum DeviceType {
  mobile = "mobile",
  desktop = "desktop",
}

// User-Agent interface
export interface UserAgent {
  userAgent: string;
  deviceType: DeviceType;
  os: string;
  networkIP: string;
}

// Mongoose: SessionBase (base interface)
export interface ISessionBase {
  projectId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  accessToken: string;
  accessTokenExpiry: Date;
  refreshToken: string;
  refreshTokenExpiry: Date;
  details: UserAgent;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose: Session interface (combined)
export interface ISession extends ISessionBase, Document<Types.ObjectId> {}

// Mongoose: Session Methods (instance methods)
export interface ISessionMethods {}

// Mongoose: Session Static Methods
export interface ISessionStaticMethods {
  clearExpiredSessions(
    userId: Types.ObjectId,
    projectId: Types.ObjectId
  ): Promise<number>;
  handleNewSession(
    userId: Types.ObjectId,
    projectId: Types.ObjectId
  ): Promise<{
    success: boolean;
    project: IProject;
  }>;
}

// Mongoose: Session Model interface
/*
  NOTE: ISessionModel must extend the instance-method interface & static-method interface both
*/
export interface ISessionModel
  extends Model<ISession, {}, ISessionMethods>,
    ISessionStaticMethods {}
