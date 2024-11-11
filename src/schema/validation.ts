import {
  ZEmail,
  ZEndDate,
  ZEventCode,
  ZItemLimit,
  ZObjectId,
  ZPage,
  ZPassword,
  ZStartDate,
  ZUsername,
} from "./zod.schema";
import { EventCode, ISignupInput, IValidateSignupInput } from "../types/types";
import mongoose from "mongoose";
import { ApiError } from "../utils/custom-api-error";
import { responseType } from "../constants";
import { z, ZodError } from "zod";

export const validateSignupInput = (
  input: ISignupInput
): IValidateSignupInput => {
  let isUsernameValid;
  if (input.username) {
    isUsernameValid = ZUsername.safeParse(input.username);
  }
  const isEmailValid = ZEmail.safeParse(input.email);
  const isPasswordValid = ZPassword.safeParse(input.password);

  let errors: any[] = [];

  if (!isEmailValid.success) {
    isEmailValid.error.errors.map((item) => {
      errors.push(item);
    });
  }
  // Admin Signup structure doesn't have username, hence it is an optional field
  if (!isUsernameValid?.success) {
    isUsernameValid?.error.errors.map((item) => {
      errors.push(item);
    });
  }
  if (!isPasswordValid.success) {
    isPasswordValid.error.errors.map((item) => {
      errors.push(item);
    });
  }

  return {
    success: errors.length > 0 ? false : true,
    errors,
  };
};

/* -------------------------------Input Validation for Logs -------------------------------- */

interface ILogValidationInput {
  page?: number;
  itemLimit?: number;
  startDate?: Date;
  endDate?: Date;
  userId?: mongoose.Types.ObjectId | string;
  projectId?: mongoose.Types.ObjectId | string;
  eventCode?: EventCode;
}

export const validateLogInput = (input: ILogValidationInput) => {
  // If neither the userId and projectId are present => Throw error
  if (!input.projectId && !input.userId) {
    throw new ApiError(
      responseType.NOT_FOUND.code,
      responseType.NOT_FOUND.type,
      "A required field (either Project-ID or User-ID) is missing."
    );
  }

  // Helper Generic function to validate a value according to its schema
  /* 
    NOTE: 
    If the value is undefined => Return an auxillary success response. 
    Else => return the typical SafeParseReturnType 
  */
  const validate = <T>(
    value: T | undefined,
    validationSchema: z.ZodType
  ): z.SafeParseReturnType<T, T> => {
    return value !== undefined
      ? validationSchema.safeParse(value)
      : { success: true, data: {} };
  };

  // Create an object containing the validation-responses corresponding to each value
  const validations = {
    page: validate(input.page, ZPage),
    itemLimit: validate(input.itemLimit, ZItemLimit),
    startDate: validate(input.startDate, ZStartDate),
    endDate: validate(input.endDate, ZEndDate),
    eventCode: validate(input.eventCode, ZEventCode),
  };

  // Check for validation failures
  const errors: z.ZodError["errors"] = [];
  Object.entries(validations).forEach(([key, validationResponse]) => {
    if (!validationResponse.success) {
      errors.push(...validationResponse.error.errors);
    }
  });

  // Check date range if both dates are provided and valid
  if (
    input.startDate &&
    input.endDate &&
    validations.startDate.success &&
    validations.endDate.success &&
    input.startDate >= input.endDate
  ) {
    throw new ApiError(
      responseType.VALIDATION_ERROR.code,
      responseType.VALIDATION_ERROR.type,
      "Start-Date must be earlier than End-Date."
    );
  }

  return errors.length > 0
    ? {
        success: false,
        errors: new z.ZodError(errors),
      }
    : {
        success: true,
        data: input,
      };
};
