import { IApiResponse } from "../types/types";

// ApiResponse class implements the IApiResponse interface to ensure type-safety
export class ApiResponse implements IApiResponse {
  message: string;
  statusCode: number;
  data: any;
  type: string; // response type
  success: boolean;

  constructor(statusCode: number, message: string, data: any, type: string) {
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
    this.type = type;
    this.success = true;
  }
}
