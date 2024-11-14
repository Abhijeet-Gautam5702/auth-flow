import { IApiResponse } from "../types/types";

export class ApiResponse implements IApiResponse {
  message: string;
  statusCode: number;
  data: any;
  type: string; // response type
  success: boolean;

  constructor(statusCode: number, type: string, message: string, data: any) {
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
    this.type = type;
    this.success = true;
  }
}
