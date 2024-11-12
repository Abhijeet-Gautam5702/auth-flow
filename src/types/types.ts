export { IApiError, IApiResponse, IRequest } from "./api.types";

export {
  IUser,
  IUserBase,
  IUserMethods,
  IUserModel,
} from "./model-types/user.types";

export {
  ISession,
  ISessionBase,
  ISessionMethods,
  ISessionModel,
  DeviceType,
  UserAgent,
} from "./model-types/session.types";

export {
  IProject,
  IProjectBase,
  IProjectMethods,
  IProjectModel,
  EmailTemplateConfig,
  LoginMethods,
  ProjectConfig,
  SecurityConfig,
} from "./model-types/project.types";

export {
  IAdmin,
  IAdminBase,
  IAdminMethods,
  IAdminModel,
} from "./model-types/admin.types";

export {
  ISecurityLog,
  ISecurityLogBase,
  ISecurityLogMethods,
  ISecurityLogModel,
  EventCode,
} from "./model-types/security-log.types";

/* -------------------------------------------------------------------------- */

// Fn: Validation of Signup Inputs
export interface IValidateSignupInput {
  success: boolean;
  errors?: any[] | undefined;
}

// Signup inputs
export interface ISignupInput {
  username?: string;
  email: string;
  password: string;
}

/* ---------------------- ACCOUNT LOCKOUT CLASS --------------------------------------- */

export type IClientIP = string;
export type IClientUID = string;
export type IFailedAttemptInfo = {
  count: number;
  lockoutExpiry?: Date;
};
