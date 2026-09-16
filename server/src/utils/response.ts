import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response => {
  const body: ApiResponse<T> = {
    success: true,
  };

  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  if (meta) body.meta = meta;

  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  error?: string,
  errors?: any
): Response => {
  const body: ApiResponse = {
    success: false,
    message,
    error: error || message,
  };

  if (errors) body.errors = errors;

  return res.status(statusCode).json(body);
};
