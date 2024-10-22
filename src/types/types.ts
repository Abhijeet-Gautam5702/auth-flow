// Interface for ApiError class
export interface IApiError {
  message: string;
  errors?: Error[];
  statusCode: number;
  type: string;
  data: null;
  success: boolean;
}

// Interface of ApiResponse class
export interface IApiResponse {
  message: string;
  statusCode: number;
  data: any;
  type: string;
  success: boolean;
}
