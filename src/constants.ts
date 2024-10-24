import "dotenv/config";
import { CookieOptions } from "express";

// Message codes for the API-responses
export const responseType = {
  SUCCESSFUL: {
    code: 200,
    type: "SUCCESSFUL",
  },
  PASSWORD_RESETTED: {
    code: 200,
    type: "PASSWORD_RESETTED",
  },
  CONNECTION_SUCCESSFUL: {
    code: 200,
    type: "CONNECTION_SUCCESSFUL",
  },
  SESSION_CREATED: {
    code: 201,
    type: "SESSION_CREATED",
  },
  ACCOUNT_CREATED: {
    code: 201,
    type: "ACCOUNT_CREATED",
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

// Environment variables (as constants)
export const env = {
  token: {
    refreshToken: {
      secret: String(process.env.REFRESH_TOKEN_SECRET),
      expiry: "30d",
    },
    accessToken: {
      secret: String(process.env.ACCESS_TOKEN_SECRET),
      expiry: "1d",
    },
  },
  app: {
    port: Number(process.env.PORT),
    corsOrigin: String(process.env.CORS_ORIGIN),
  },
  database: {
    uri: String(process.env.MONGO_DB_URI),
    dbName: "auth-wave-service",
  },
};

// Cookie options
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
};
