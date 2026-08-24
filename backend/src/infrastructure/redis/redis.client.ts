import Redis, { RedisOptions } from 'ioredis';
import { env } from '../../config/env';
import { Logger } from '../../utils/logger';

export class RedisService {
  private static instance: Redis | null = null;
  private static isConnected = false;
  private static mockInstance: any = null;

  /**
   * Inject a mock instance (e.g. ioredis-mock) for testing environments.
   */
  public static setMockInstance(mock: any): void {
    this.mockInstance = mock;
    this.isConnected = !!mock;
  }

  /**
   * Get the singleton Redis client instance.
   */
  public static getClient(): Redis {
    if (this.mockInstance) {
      return this.mockInstance as Redis;
    }

    if (!this.instance) {
      const options: RedisOptions = {
        maxRetriesPerRequest: 1,
        connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > 5) {
            // Stop retrying excessively after 5 attempts, throttle backoff
            return 2000;
          }
          return Math.min(times * 200, 2000);
        },
      };

      try {
        this.instance = new Redis(env.REDIS_URL, options);

        this.instance.on('connect', () => {
          this.isConnected = true;
          Logger.info('Redis connection established');
        });

        this.instance.on('ready', () => {
          this.isConnected = true;
          Logger.info('Redis client ready to receive commands');
        });

        this.instance.on('error', (_err: Error) => {
          this.isConnected = false;
          Logger.warn('Redis connection error. Ephemeral operations will use resilient fallback.');
        });

        this.instance.on('close', () => {
          this.isConnected = false;
        });

        this.instance.on('reconnecting', () => {
          // silently reconnect
        });

        // Trigger connection asynchronously
        this.instance.connect().catch((_err: Error) => {
          this.isConnected = false;
          Logger.warn('Initial Redis connection offline. Running in-memory cache for ephemeral auth.');
        });
      } catch (err) {
        Logger.warn('Redis init offline. Ephemeral auth running in memory.');
      }
    }

    return this.instance!;
  }

  /**
   * Healthcheck to determine whether Redis is currently available.
   */
  public static async isHealthy(): Promise<boolean> {
    if (this.mockInstance) return true;
    if (!this.instance || !this.isConnected) return false;
    try {
      const res = await this.instance.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Graceful disconnection on server shutdown.
   */
  public static async quit(): Promise<void> {
    if (this.mockInstance) {
      this.mockInstance = null;
      this.isConnected = false;
      return;
    }

    if (this.instance) {
      try {
        await this.instance.quit();
      } catch {
        this.instance.disconnect();
      } finally {
        this.instance = null;
        this.isConnected = false;
      }
    }
  }
}
