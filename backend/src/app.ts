import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { requestTimingMiddleware } from './middleware/timing.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler';

// Module Route Imports
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { groupRoutes } from './modules/groups/group.routes';
import { expenseRoutes, groupExpenseRoutes } from './modules/expenses/expense.routes';
import { balanceRoutes } from './modules/balances/balance.routes';
import { settlementRoutes } from './modules/settlements/settlement.routes';
import { activityRoutes } from './modules/activity/activity.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';

export const createApp = (): Express => {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxies/Neon
  app.set('trust proxy', 1);

  // Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:8081', 'http://localhost:19006'],
      credentials: true,
    })
  );

  // Request ID, Timing & Body Parsing
  app.use(requestIdMiddleware);
  app.use(requestTimingMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // General API Rate Limiting
  app.use('/api', apiRateLimiter);

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'settle-backend',
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    });
  });

  // API v1 Sub-routers
  const apiV1 = express.Router();
  apiV1.use('/auth', authRoutes);
  apiV1.use('/users', userRoutes);
  apiV1.use('/groups', groupRoutes);
  apiV1.use('/groups', groupExpenseRoutes);
  apiV1.use('/groups', balanceRoutes);
  apiV1.use('/groups', settlementRoutes);
  apiV1.use('/expenses', expenseRoutes);
  apiV1.use('/activity', activityRoutes);
  apiV1.use('/dashboard', dashboardRoutes);
  apiV1.use('/notifications', notificationRoutes);

  // Mount API v1
  app.use('/api/v1', apiV1);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
