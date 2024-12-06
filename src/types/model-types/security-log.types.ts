import mongoose, { Model, Document, Types } from "mongoose";

export enum EventCode {
  PASSWORD_LOGIN = "PASSWORD_LOGIN",
  OTP_AUTHENTICATION = "OTP_AUTHENTICATION",
  MAGIC_URL_AUTHENTICATION = "MAGIC_URL_AUTHENTICATION",
  LOGOUT = "LOGOUT",
  PASSWORD_RESET = "PASSWORD_RESET",
  USER_VERIFICATION = "USER_VERIFICATION",
  ACCOUNT_CREATION = "ACCOUNT_CREATION",
  ACCOUNT_DELETION = "ACCOUNT_DELETION",
  ACCOUNT_LOCKOUT = "ACCOUNT_LOCKOUT",
  ACCOUNT_UPDATE = "ACCOUNT_UPDATE",
}

export interface ISecurityLogBase {
  projectId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  event: {
    code: EventCode;
    success: boolean;
  };
  message?: string;
  sessionId?: mongoose.Schema.Types.ObjectId;
}

// Mongoose: Interface for instance methods on security log documents
export interface ISecurityLogMethods {}

// Mongoose: Interface for static methods on security log documents
export interface ISecurityLogStaticMethods {}

// Mongoose: Combined interface for a Security Log Document
export interface ISecurityLog
  extends ISecurityLogBase,
    Document<Types.ObjectId> {}

// Mongoose: Type for model methods on Security Log Model
export interface ISecurityLogModel
  extends Model<ISecurityLog, {}, ISecurityLogMethods>,
    ISecurityLogStaticMethods {}
