/* --------------------------- SECURITY-LOG MODEL TYPES ------------------------------------ */

import mongoose, { Model } from "mongoose";

export enum EventCode {
    PASSWORD_LOGIN,
    OTP_AUTHENTICATION,
    MAGIC_URL_AUTHENTICATION,
    LOGOUT,
    PASSWORD_RESET_REQUEST,
    PASSWORD_RESET_COMPLETION,
    USER_VERIFICATION_REQUEST,
    USER_VERIFICATION_COMPLETION,
    ACCOUNT_CREATION,
    ACCOUNT_DELETION,
    ACCOUNT_LOCKOUT,
    SESSION_CREATION,
    SESSION_TERMINATION,
    ACCESS_DENIAL,
  }
  
  export interface ISecurityLogBase {
    projectId: mongoose.Schema.Types.ObjectId;
    userId: mongoose.Schema.Types.ObjectId;
    event: {
      code: EventCode;
      success: boolean;
    };
    message?: string;
    sessionId: mongoose.Schema.Types.ObjectId;
  }
  
  export interface ISecurityLogMethods {}
  
  export interface ISecurityLog
    extends ISecurityLogBase,
      ISecurityLogMethods,
      Document {}
  
  export type ISecurityLogModel = Model<ISecurityLog, {}, ISecurityLogMethods>;