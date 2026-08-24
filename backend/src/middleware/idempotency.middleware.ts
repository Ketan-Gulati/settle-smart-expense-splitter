import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ConflictError } from '../errors/AppError';

interface CachedResponse {
  requestHash: string;
  statusCode: number;
  body: any;
  timestamp: number;
}

// In-memory idempotency store with TTL (1 hour)
const idempotencyStore = new Map<string, CachedResponse>();
const TTL_MS = 60 * 60 * 1000;

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const idempotencyKey = req.header('Idempotency-Key');

  // If no idempotency key is provided, proceed normally
  if (!idempotencyKey) {
    return next();
  }

  // Create hash of the incoming request payload + path + method
  const payloadToHash = JSON.stringify({
    method: req.method,
    path: req.originalUrl,
    body: req.body,
    userId: req.user?.id || 'anonymous',
  });
  const currentHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

  // Check existing entry
  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    // Check if expired
    if (Date.now() - cached.timestamp > TTL_MS) {
      idempotencyStore.delete(idempotencyKey);
    } else if (cached.requestHash === currentHash) {
      // Return cached identical response
      res.setHeader('X-Idempotency-Replay', 'true');
      res.status(cached.statusCode).json(cached.body);
      return;
    } else {
      // Same key but conflicting request payload
      throw new ConflictError(
        'Idempotency key was already used with a different request payload',
        'IDEMPOTENCY_CONFLICT'
      );
    }
  }

  // Intercept json response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body: any): Response => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(idempotencyKey, {
        requestHash: currentHash,
        statusCode: res.statusCode,
        body,
        timestamp: Date.now(),
      });
    }
    return originalJson(body);
  };

  next();
};
