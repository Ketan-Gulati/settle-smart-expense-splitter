import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { Logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError || env.NODE_ENV !== 'production' ? err.message : 'An unexpected error occurred';

  Logger.error(`API Error on ${req.method} ${req.originalUrl}: ${err.message}`, err, {
    statusCode,
    code,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};
