import "dotenv/config";
import { CookieOptions } from "express";
import { envConfig } from "./config/env-config";

// Message codes for the API-responses
export const responseType = {
  SUCCESSFUL: {
    code: 200,
    type: "SUCCESSFUL",
  },
  PASSWORD_RESET_SUCCESSFUL: {
    code: 200,
    type: "PASSWORD_RESET_SUCCESSFUL",
  },
  CONNECTION_SUCCESSFUL: {
    code: 200,
    type: "CONNECTION_SUCCESSFUL",
  },
  CREATED: {
    code: 201,
    type: "CREATED",
  },
  SESSION_CREATED: {
    code: 201,
    type: "SESSION_CREATED",
  },
  ACCOUNT_CREATED: {
    code: 201,
    type: "ACCOUNT_CREATED",
  },
  INITIATED: {
    code: 202,
    type: "INITIATED",
  },
  EMAIL_VERIFIED: {
    code: 200,
    type: "EMAIL_VERIFIED",
  },
  SESSION_DELETED: {
    code: 200,
    type: "SESSION_DELETED",
  },
  ACCOUNT_DELETED: {
    code: 200,
    type: "ACCOUNT_DELETED",
  },
  DELETED: {
    code: 200,
    type: "DELETED",
  },
  INVALID_PROJECT_CREDENTIALS: {
    code: 401,
    type: "INVALID_PROJECT_CREDENTIALS",
  },
  INCORRECT_PASSWORD: {
    code: 401,
    type: "INCORRECT_PASSWORD",
  },
  TOKEN_EXPIRED: {
    code: 401,
    type: "TOKEN_EXPIRED",
  },
  REFRESH_TOKEN_EXPIRED: {
    code: 401,
    type: "REFRESH_TOKEN_EXPIRED",
  },
  ACCESS_TOKEN_EXPIRED: {
    code: 401,
    type: "ACCESS_TOKEN_EXPIRED",
  },
  TOKEN_INVALID: {
    code: 401,
    type: "TOKEN_INVALID",
  },
  REFRESH_TOKEN_INVALID: {
    code: 401,
    type: "REFRESH_TOKEN_INVALID",
  },
  ACCESS_TOKEN_INVALID: {
    code: 401,
    type: "ACCESS_TOKEN_INVALID",
  },
  INVALID_API_KEY: {
    code: 401,
    type: "INVALID_API_KEY",
  },
  UNSUCCESSFUL: {
    code: 400,
    type: "UNSUCCESSFUL",
  },
  ALREADY_EXISTS: {
    code: 400,
    type: "ALREADY_EXISTS",
  },
  INVALID_FORMAT: {
    code: 400,
    type: "INVALID_FORMAT",
  },
  ADMIN_PERMISSION_REQUIRED: {
    code: 403,
    type: "ADMIN_PERMISSION_REQUIRED",
  },
  NOT_FOUND: {
    code: 404,
    type: "NOT_FOUND",
  },
  VALIDATION_ERROR: {
    code: 422,
    type: "VALIDATION_ERROR",
  },
  ACCOUNT_LOCKED: {
    code: 423,
    type: "ACCOUNT_LOCKED",
  },
  API_LIMIT_EXCEEDED: {
    code: 429,
    type: "API_LIMIT_EXCEEDED",
  },
  DATABASE_ERROR: {
    code: 500,
    type: "DATABASE_ERROR",
  },
  SERVER_ERROR: {
    code: 500,
    type: "SERVER_ERROR",
  },
  SERVICE_UNAVAILABLE: {
    code: 503,
    type: "SERVICE_UNAVAILABLE",
  },
};

// API version
export const API_VERSION: string = "v1";

// Organization Name and email (TODO: Change this in production)
export const ORG_NAME: string = envConfig.ORG_NAME;
export const ORG_EMAIL: string = envConfig.ORG_EMAIL;

// Environment variables (as constants)
export const env = {
  token: {
    refreshToken: {
      secret: envConfig.REFRESH_TOKEN_SECRET,
      expiry: envConfig.REFRESH_TOKEN_EXP,
    },
    accessToken: {
      secret: envConfig.ACCESS_TOKEN_SECRET,
      expiry: envConfig.ACCESS_TOKEN_EXP,
    },
    verificationToken: {
      secret: envConfig.VERIFICATION_TOKEN_SECRET,
      expiry: envConfig.VERFIICATION_TOKEN_EXP,
    },
    resetPasswordToken: {
      secret: envConfig.RESET_PASSWORD_TOKEN_SECRET,
      expiry: envConfig.RESET_PASSWORD_TOKEN_EXP,
    },
    magicURLToken: {
      secret: envConfig.MAGIC_URL_TOKEN_SECRET,
      expiry: envConfig.MAGIC_URL_TOKEN_EXP,
    },

  },
  app: {
    port: envConfig.PORT,
    corsOrigin: envConfig.CORS_ORIGIN,
  },
  database: {
    uri: envConfig.MONGO_DB_URI,
    dbName: envConfig.DB_NAME,
  },
  secret: {
    projectKeyGeneration: envConfig.PROJECT_KEY_GENERATION_SECRET,
    resendApiKey: envConfig.RESEND_API_KEY,
  },
};

// Cookie options
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
};

// Domains of AuthWave
export const backendDomain: string = envConfig.BACKEND_DOMAIN;
export const frontendDomain: string = envConfig.FRONTEND_DOMAIN;
