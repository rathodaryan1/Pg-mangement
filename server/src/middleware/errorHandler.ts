import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  errors?: any;

  constructor(message: string, statusCode = 400, errors?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response => {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // Handle known application errors
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, undefined, err.errors);
  }

  // Handle Prisma errors
  if (err?.code === 'P2002') {
    return sendError(res, 'A record with this unique value already exists.', 409, 'DUPLICATE_RECORD');
  }

  if (err?.code === 'P2025') {
    return sendError(res, 'The requested resource was not found.', 404, 'NOT_FOUND');
  }

  // Handle JWT errors
  if (err?.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token.', 401, 'INVALID_TOKEN');
  }

  if (err?.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  // Handle Multer upload errors
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File size exceeds maximum allowed limit of 10MB.', 400, 'FILE_TOO_LARGE');
  }

  // Generic fallback
  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'An unexpected error occurred';

  return sendError(res, message, statusCode, 'INTERNAL_SERVER_ERROR');
};

export const notFoundHandler = (req: Request, res: Response): Response => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
};
