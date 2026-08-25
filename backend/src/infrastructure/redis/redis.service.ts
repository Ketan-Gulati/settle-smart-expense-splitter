import { RedisService } from './redis.client';
import { Logger } from '../../utils/logger';

export interface CacheOptions {
  ttlSeconds?: number;
}

export class CacheService {
  private static memoryStore = new Map<string, { value: any; expiresAt: number }>();

  /**
   * Fetch item from Redis cache (or fallback memory store). Returns null on miss.
   */
  public static async get<T>(key: string): Promise<T | null> {
    try {
      if (await RedisService.isHealthy()) {
        const client = RedisService.getClient();
        const raw = await client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      }
    } catch (err) {
      Logger.warn(`Cache get failed for key: ${key}`, { error: err });
    }

    // In-memory fallback
    const item = this.memoryStore.get(key);
    if (item) {
      if (Date.now() > item.expiresAt) {
        this.memoryStore.delete(key);
        return null;
      }
      return item.value as T;
    }

    return null;
  }

  /**
   * Set item in Redis cache (or fallback memory store) with explicit TTL.
   */
  public static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      if (await RedisService.isHealthy()) {
        const client = RedisService.getClient();
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await client.setex(key, ttlSeconds, serialized);
        } else {
          await client.set(key, serialized);
        }
      }
    } catch (err) {
      Logger.warn(`Cache set failed for key: ${key}`, { error: err });
    }

    // Always maintain memory fallback for resilience
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds > 0 ? ttlSeconds * 1000 : 3600 * 1000),
    });
  }

  /**
   * Invalidate specific key or array of keys.
   */
  public static async del(keys: string | string[]): Promise<void> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    if (keyArray.length === 0) return;

    for (const k of keyArray) {
      this.memoryStore.delete(k);
    }

    try {
      if (await RedisService.isHealthy()) {
        const client = RedisService.getClient();
        await client.del(...keyArray);
      }
    } catch (err) {
      Logger.warn(`Cache del failed for keys: ${keyArray.join(', ')}`, { error: err });
    }
  }

  /**
   * Invalidate keys matching a pattern (e.g. `settle:search:users:*`).
   */
  public static async delPattern(pattern: string): Promise<void> {
    try {
      const client = RedisService.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (err) {
      Logger.warn(`Cache delPattern failed for pattern: ${pattern}`, { error: err });
    }
  }
}
