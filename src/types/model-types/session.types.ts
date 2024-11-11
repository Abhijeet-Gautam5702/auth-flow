/* ------------------------------ SESSION MODEL TYPES ------------------------------------ */

import mongoose, { Model } from "mongoose";

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
export interface ISessionBase extends Document {
  projectId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  accessToken: string;
  accessTokenExpiry: Date;
  refreshToken: string;
  refreshTokenExpiry: Date;
  details: UserAgent;
}

// Mongoose: Session Methods (instance methods)
export interface ISessionMethods {}

// Mongoose: Session interface (combined)
export interface ISession extends ISessionBase, ISessionMethods, Document {}

// Mongoose: Session Model interface
export type ISessionModel = Model<ISession, {}, ISessionMethods>;
