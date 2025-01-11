import { z } from "zod";

// The schema for the environment variables
const envSchema = z.object({
  // Organization Details
  ORG_NAME: z
    .string()
    .min(1, "ORG_NAME is required"),
  ORG_EMAIL: z
    .string()
    .email(),

  // Database configuration
  MONGO_DB_URI: z
    .string()
    .min(1, "MONGO_DB_URI is required"),
  DB_NAME: z
    .string()
    .default("auth-wave-service"),

  // CORS configuration
  CORS_ORIGIN: z
    .string()
    .min(1, "CORS_ORIGIN is required"),

  // Server configuration
  PORT: z.coerce
    .number()
    .positive("PORT must be a positive number"),

  // Domain configuration
  FRONTEND_DOMAIN: z
    .string()
    .url("FRONTEND_DOMAIN must be a valid URL"),
  BACKEND_DOMAIN: z
    .string()
    .url("BACKEND_DOMAIN must be a valid URL"),

  // Token secrets and expiration
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(1, "ACCESS_TOKEN_SECRET is required"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(1, "REFRESH_TOKEN_SECRET is required"),
  ACCESS_TOKEN_EXP: z
    .string()
    .default("15m"),
  REFRESH_TOKEN_EXP: z
    .string()
    .default("30d"),

  PROJECT_KEY_GENERATION_SECRET: z
    .string()
    .min(1, "PROJECT_KEY_GENERATION_SECRET is required"),

  VERIFICATION_TOKEN_SECRET: z
    .string()
    .min(1, "VERIFICATION_TOKEN_SECRET is required"),
  VERFIICATION_TOKEN_EXP: z.string().default("15m"),

  RESET_PASSWORD_TOKEN_SECRET: z
    .string()
    .min(1, "RESET_PASSWORD_TOKEN_SECRET is required"),
  RESET_PASSWORD_TOKEN_EXP: z.string().default("15m"),

  MAGIC_URL_TOKEN_SECRET: z
    .string()
    .min(1, "MAGIC_URL_TOKEN_SECRET is required"),
  MAGIC_URL_TOKEN_EXP: z
    .string()
    .default("15m"),

  // Resend API configuration
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY is required"),
});

// Parse and validate the environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:", parsedEnv.error.format());
  process.exit(1); // Exit the application if validation fails
}

export const envConfig = parsedEnv.data;
