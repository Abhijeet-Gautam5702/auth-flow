
/* ------------------------------ PROJECT MODEL TYPES ------------------------------------ */

import mongoose, { Model } from "mongoose";

// LoginMethods interface
export interface LoginMethods {
    emailPassword: boolean;
    OTPonEmail?: boolean;
    OTPonMobile?: boolean;
    magicURLonEmail?: boolean;
  }
  
  // Security interface
  export interface SecurityConfig {
    userLimit?: number;
    userSessionLimit?: number;
  }
  
  // EmailTemplate interface
  export interface EmailTemplateConfig {
    userVerification?: string;
    resetPassword?: string;
    userLimitExceeded?: string;
    userSessionLimitExceeded?: string;
    OTPonEmail?: string;
    magicURLonEmail?: string;
  }
  
  // Project config interface
  export interface ProjectConfig {
    loginMethods: LoginMethods;
    security?: SecurityConfig;
    emailTemplates?: EmailTemplateConfig;
  }
  
  // Mongoose: Base interface for the Project Document
  export interface IProjectBase {
    projectName: string;
    projectKey: string;
    config: ProjectConfig;
    owner: mongoose.Schema.Types.ObjectId;
  }
  
  // Mongoose: Interface for instance methods on project documents
  export interface IProjectMethods {}
  
  // Mongoose: Combined interface for a Project Document
  export interface IProject extends IProjectBase, IProjectMethods, Document {}
  
  // Mongoose: Type for model methods on Project Model
  export type IProjectModel = Model<IProject, {}, IProjectMethods>;
  