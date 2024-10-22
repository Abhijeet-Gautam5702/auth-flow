import { IApiError } from "../types/types";

// ApiError class extends the Error class from NodeJS and implements IApiError interface (ensures type-safety)
export class ApiError extends Error implements IApiError {
  errors?: Error[];
  statusCode: number;
  stack?: string | undefined;
  type: string; // response type
  data: null;
  success: boolean;

  constructor(
    statusCode: number,
    type: string,
    message: string,
    errors?: Error[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors || [];
    this.type = type;
    this.data = null;
    this.success = false;
  }
}
