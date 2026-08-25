import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1000000n);

    // Development/Diagnostics Log
    if (process.env.NODE_ENV === 'development') {
      Logger.debug(`[API] ${req.method} ${req.originalUrl || req.url} status=${res.statusCode} duration=${durationMs}ms`);
    } else if (durationMs > 500) {
      Logger.warn(`[SLOW_API] ${req.method} ${req.originalUrl || req.url} status=${res.statusCode} duration=${durationMs}ms`);
    }
  });

  next();
};
