import { ZodIssue } from "zod";

// Utility: ApiError class
export interface IApiError {
  message: string;
  errors?: any[] | undefined;
  statusCode: number;
  type: string;
  data: null;
  success: boolean;
}

// Utility: ApiResponse class
export interface IApiResponse {
  message: string;
  statusCode: number;
  data: any;
  type: string;
  success: boolean;
}

// Mongoose: UserSchema
export interface IUser {
  username: string;
  email: string;
  password: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
}

/* ------------------------------------- */

// Fn: Validation of Signup Inputs
export interface IValidateSignupInput {
  success: boolean;
  errors?: any[] | undefined;
}

// Signup inputs
export interface ISignupInput {
  username: string;
  email: string;
  password: string;
}
