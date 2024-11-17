import { z } from "zod";
import { EventCode } from "../types/types";
import mongoose from "mongoose";

export const ZEmail = z.string().email({
  message: "Invalid email format",
});

export const ZUsername = z
  .string()
  .min(3, { message: "Username must be at least 3 characters long" })
  .max(30, { message: "Username must be at most 30 characters long" })
  .regex(/^[a-zA-Z0-9_]+$/, {
    message:
      "Username can only contain alphanumeric characters and underscores",
  });

export const ZPassword = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .max(64, { message: "Password must be at most 64 characters long" })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[@$!%*?&]/, {
    message: "Password must contain at least one special character (@$!%*?&)",
  });

/* -------------------------------------------------------------------------------------- */

export const ZPage = z.number().min(1, {
  message: "Page Number cannot be less than 1",
});

export const ZItemLimit = z
  .number()
  .min(1, { message: "Item Limit per page cannot be less than 1" })
  .max(50, "Item Limit per page cannot be more than 50");

export const ZStartDate = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val))
  .refine((date) => !isNaN(date.getTime()), {
    message: "Invalid start date format",
  });

export const ZEndDate = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val))
  .refine((date) => !isNaN(date.getTime()), {
    message: "Invalid end date format",
  });

export const ZEventCode = z.enum(
  Object.values(EventCode) as [string, ...string[]]
);

export const ZObjectId = z.instanceof(mongoose.Types.ObjectId).or(z.string());

/* -------------------------------------------------------------------------------------- */

export const ZProjectName = z
  .string()
  .min(4, { message: "Project-Name must be at least 4 characters long" })
  .max(20, { message: "Project-Name must be at most 20 characters long" })
  .regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, {
    message:
      "Project-Name must start with an alphabet and can only contain letters, numbers, and hyphens",
  });
