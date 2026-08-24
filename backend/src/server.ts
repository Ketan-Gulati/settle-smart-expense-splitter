import { createApp } from './app';
import { env } from './config/env';
import { checkDatabaseConnection, disconnectDatabase } from './infrastructure/database/prisma';
import { Logger } from './utils/logger';

const startServer = async () => {
  try {
    Logger.info('Connecting to Neon PostgreSQL database...');
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      Logger.error('Failed to establish database connection. Exiting process.');
      process.exit(1);
    }
    Logger.info('✅ Neon PostgreSQL database connection verified successfully.');

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      Logger.info(`🚀 Settle Backend Server running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    });

    const shutdown = async (signal: string) => {
      Logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        Logger.info('HTTP server closed.');
        await disconnectDatabase();
        Logger.info('Database disconnected. Process terminating cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    Logger.error('Fatal error during backend server startup', err);
    process.exit(1);
  }
};

startServer();
