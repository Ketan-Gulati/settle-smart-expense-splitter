import crypto from 'crypto';
import { RedisService } from './redis.client';
import { Logger } from '../../utils/logger';
import { AppError } from '../../errors/AppError';
import { env } from '../../config/env';

export type OtpPurpose = 'email_verification' | 'password_reset' | 'password_change' | 'login' | 'signup';

export interface OtpRecord {
  hash: string;
  attempts: number;
  createdAt: number;
}

export class OtpRedisRepository {
  // Local in-memory fallback store when standalone Redis is offline
  private static memoryStore = new Map<string, { val: string; exp: number }>();

  private static getMemory(key: string): string | null {
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.exp) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.val;
  }

  private static setMemory(key: string, val: string, ttlSeconds: number): void {
    this.memoryStore.set(key, { val, exp: Date.now() + ttlSeconds * 1000 });
  }

  private static deleteMemory(key: string): void {
    this.memoryStore.delete(key);
  }

  /**
   * Helper to normalize purpose to versioned key standard (e.g., auth:otp:v1:email_verification:email)
   */
  public static normalizePurpose(purpose: string): string {
    const p = purpose.toLowerCase().replace('-', '_');
    if (p === 'signup' || p === 'email_verification') return 'email_verification';
    if (p === 'password_reset') return 'password_reset';
    if (p === 'login') return 'login';
    return p;
  }

  /**
   * Helper to compute SHA-256 hash of plaintext OTP
   */
  public static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
  }

  /**
   * Generates a cryptographically secure 6-digit OTP string (allowing leading zeroes, e.g. "000421").
   */
  public static generateSecure6DigitOtp(): string {
    const num = crypto.randomInt(0, 1000000);
    return num.toString().padStart(6, '0');
  }

  /**
   * Key formats
   */
  public static getOtpKey(purpose: string, emailNormalized: string): string {
    const p = this.normalizePurpose(purpose);
    return `auth:otp:v1:${p}:${emailNormalized}`;
  }

  public static getCooldownKey(purpose: string, emailNormalized: string): string {
    const p = this.normalizePurpose(purpose);
    return `auth:otp:cooldown:${p}:${emailNormalized}`;
  }

  public static getEmailRateKey(emailNormalized: string): string {
    return `auth:otp:rate:email:${emailNormalized}`;
  }

  public static getIpRateKey(ip: string): string {
    return `auth:otp:rate:ip:${ip}`;
  }

  public static getOAuthStateKey(state: string): string {
    return `auth:oauth:google:${state}`;
  }

  public static getInviteHandoffKey(handoffId: string): string {
    return `auth:invite:handoff:${handoffId}`;
  }

  /**
   * Check rate limits and resend cooldown before sending OTP.
   */
  public static async checkSendLimits(
    purpose: string,
    emailNormalized: string,
    ip: string
  ): Promise<{ allowed: boolean; reason?: string; retryAfterSeconds?: number }> {
    const cooldownKey = this.getCooldownKey(purpose, emailNormalized);
    const emailRateKey = this.getEmailRateKey(emailNormalized);
    const ipRateKey = this.getIpRateKey(ip);

    try {
      const redis = RedisService.getClient();

      // Check cooldown first
      const cooldownTtl = await redis.ttl(cooldownKey);
      if (cooldownTtl > 0) {
        return {
          allowed: false,
          reason: 'COOLDOWN_ACTIVE',
          retryAfterSeconds: cooldownTtl,
        };
      }

      // Check email hourly count
      const emailCountStr = await redis.get(emailRateKey);
      const emailCount = emailCountStr ? parseInt(emailCountStr, 10) : 0;
      if (emailCount >= env.AUTH_OTP_MAX_REQUESTS_PER_HOUR) {
        const ttl = await redis.ttl(emailRateKey);
        return {
          allowed: false,
          reason: 'EMAIL_RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: Math.max(ttl, 1),
        };
      }

      // Check IP hourly count
      const ipCountStr = await redis.get(ipRateKey);
      const ipCount = ipCountStr ? parseInt(ipCountStr, 10) : 0;
      if (ipCount >= env.AUTH_OTP_MAX_REQUESTS_PER_HOUR * 3) {
        const ttl = await redis.ttl(ipRateKey);
        return {
          allowed: false,
          reason: 'IP_RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: Math.max(ttl, 1),
        };
      }

      return { allowed: true };
    } catch (err) {
      Logger.warn('Redis checkSendLimits failed, using memory fallback');
      const cooldownVal = this.getMemory(cooldownKey);
      if (cooldownVal) {
        return {
          allowed: false,
          reason: 'COOLDOWN_ACTIVE',
          retryAfterSeconds: 60,
        };
      }
      return { allowed: true };
    }
  }

  /**
   * Stores hashed OTP in Redis with configured TTL and records rate limits.
   */
  public static async storeOtp(
    purpose: string,
    emailNormalized: string,
    ip: string,
    otpHash: string
  ): Promise<void> {
    const otpKey = this.getOtpKey(purpose, emailNormalized);
    const cooldownKey = this.getCooldownKey(purpose, emailNormalized);
    const emailRateKey = this.getEmailRateKey(emailNormalized);
    const ipRateKey = this.getIpRateKey(ip);

    const record: OtpRecord = {
      hash: otpHash,
      attempts: 0,
      createdAt: Date.now(),
    };

    // Always dual-write to local memoryStore for dev resilience
    this.setMemory(otpKey, JSON.stringify(record), env.AUTH_OTP_TTL_SECONDS);
    this.setMemory(cooldownKey, '1', env.AUTH_OTP_RESEND_COOLDOWN_SECONDS);

    try {
      const redis = RedisService.getClient();
      const pipeline = redis.pipeline();

      // 1. Store OTP value with configured TTL (defaults to 300s / 5 min)
      pipeline.set(otpKey, JSON.stringify(record), 'EX', env.AUTH_OTP_TTL_SECONDS);

      // 2. Set cooldown (defaults to 60s)
      pipeline.set(cooldownKey, '1', 'EX', env.AUTH_OTP_RESEND_COOLDOWN_SECONDS);

      // 3. Increment email hourly counter
      pipeline.incr(emailRateKey);

      // 4. Increment IP hourly counter
      pipeline.incr(ipRateKey);

      const results = await pipeline.exec();

      // Ensure TTLs for counters if they are newly created (3600s / 1 hour)
      const emailCount = results?.[2]?.[1] as number;
      if (emailCount === 1) {
        await redis.expire(emailRateKey, 3600);
      }

      const ipCount = results?.[3]?.[1] as number;
      if (ipCount === 1) {
        await redis.expire(ipRateKey, 3600);
      }
    } catch (err) {
      Logger.warn('Redis storeOtp failed, kept in memory fallback');
    }
  }

  /**
   * Deletes an active OTP from Redis (used on verification success, invalidation, or send failure).
   */
  public static async deleteOtp(purpose: string, emailNormalized: string): Promise<void> {
    const otpKey = this.getOtpKey(purpose, emailNormalized);
    this.deleteMemory(otpKey);
    try {
      const redis = RedisService.getClient();
      await redis.del(otpKey);
    } catch (err) {
      Logger.warn('Redis deleteOtp failed');
    }
  }

  /**
   * Atomic Lua script for OTP Verification.
   */
  public static async verifyOtpAtomically(
    purpose: string,
    emailNormalized: string,
    submittedOtpHash: string
  ): Promise<{ status: 'SUCCESS' | 'NOT_FOUND' | 'INVALID_OTP' | 'MAX_ATTEMPTS_EXCEEDED'; attemptsLeft?: number }> {
    const otpKey = this.getOtpKey(purpose, emailNormalized);
    const maxAttempts = env.AUTH_OTP_MAX_ATTEMPTS;

    // Check memory store first for immediate local dev consistency
    const rawData = this.getMemory(otpKey);
    if (rawData) {
      try {
        const record: OtpRecord = JSON.parse(rawData);
        if (record.hash === submittedOtpHash) {
          this.deleteMemory(otpKey);
          try {
            const redis = RedisService.getClient();
            await redis.del(otpKey);
          } catch {}
          return { status: 'SUCCESS' };
        }
        record.attempts += 1;
        if (record.attempts >= maxAttempts) {
          this.deleteMemory(otpKey);
          try {
            const redis = RedisService.getClient();
            await redis.del(otpKey);
          } catch {}
          return { status: 'MAX_ATTEMPTS_EXCEEDED' };
        }
        this.setMemory(otpKey, JSON.stringify(record), env.AUTH_OTP_TTL_SECONDS);
        return { status: 'INVALID_OTP', attemptsLeft: maxAttempts - record.attempts };
      } catch {}
    }

    const luaScript = `
      local key = KEYS[1]
      local submittedHash = ARGV[1]
      local maxAttempts = tonumber(ARGV[2])

      local data = redis.call('get', key)
      if not data then
        return "NOT_FOUND"
      end

      -- Simple string search for hash, attempts, and createdAt in JSON format
      local attemptsStr = string.match(data, '"attempts"%s*:%s*(%d+)')
      local hashStr = string.match(data, '"hash"%s*:%s*"([^"]+)"')
      local createdAtStr = string.match(data, '"createdAt"%s*:%s*(%d+)') or "0"
      local currentAttempts = tonumber(attemptsStr) or 0

      if submittedHash == hashStr then
        redis.call('del', key)
        return "SUCCESS"
      end

      currentAttempts = currentAttempts + 1
      if currentAttempts >= maxAttempts then
        redis.call('del', key)
        return "MAX_ATTEMPTS_EXCEEDED"
      end

      -- Reconstruct JSON and keep existing TTL
      local ttl = redis.call('ttl', key)
      if ttl <= 0 then
        ttl = 300
      end

      local updatedData = string.format('{"hash":"%s","attempts":%d,"createdAt":%s}', hashStr, currentAttempts, createdAtStr)
      redis.call('setex', key, ttl, updatedData)
      return string.format("INVALID_OTP:%d", maxAttempts - currentAttempts)
    `;

    try {
      const redis = RedisService.getClient();
      const rawResult = (await redis.eval(luaScript, 1, otpKey, submittedOtpHash, maxAttempts)) as string;

      if (rawResult === 'SUCCESS') return { status: 'SUCCESS' };
      if (rawResult === 'NOT_FOUND') return { status: 'NOT_FOUND' };
      if (rawResult === 'MAX_ATTEMPTS_EXCEEDED') return { status: 'MAX_ATTEMPTS_EXCEEDED' };
      if (rawResult.startsWith('INVALID_OTP')) {
        const parts = rawResult.split(':');
        return { status: 'INVALID_OTP', attemptsLeft: parseInt(parts[1] || '0', 10) };
      }
      return { status: 'NOT_FOUND' };
    } catch (err) {
      Logger.warn('Redis verifyOtpAtomically offline');
      return { status: 'NOT_FOUND' };
    }
  }

  /**
   * OAuth State Storage & Validation
   */
  public static async storeOAuthState(state: string, metadata: Record<string, any> = {}): Promise<void> {
    const key = this.getOAuthStateKey(state);
    this.setMemory(key, JSON.stringify(metadata), 600);

    if (await RedisService.isHealthy()) {
      try {
        const redis = RedisService.getClient();
        await redis.set(key, JSON.stringify(metadata), 'EX', 600);
      } catch (err) {
        Logger.warn('Redis storeOAuthState failed, memory store saved');
      }
    }
  }

  public static async consumeOAuthState(state: string): Promise<Record<string, any> | null> {
    const key = this.getOAuthStateKey(state);

    if (await RedisService.isHealthy()) {
      const luaScript = `
        local key = KEYS[1]
        local val = redis.call('get', key)
        if val then
          redis.call('del', key)
          return val
        else
          return nil
        end
      `;

      try {
        const redis = RedisService.getClient();
        const raw = await redis.eval(luaScript, 1, key);
        if (raw) {
          this.deleteMemory(key);
          return JSON.parse(raw as string);
        }
      } catch (err) {
        Logger.warn('Redis consumeOAuthState failed, reading from memory store');
      }
    }

    const raw = this.getMemory(key);
    if (!raw) return null;
    this.deleteMemory(key);
    return JSON.parse(raw);
  }

  /**
   * Invite Handoff Context Storage
   */
  public static async storeInviteHandoff(inviteCode: string): Promise<string> {
    const redis = RedisService.getClient();
    const handoffId = crypto.randomUUID();
    const key = this.getInviteHandoffKey(handoffId);
    try {
      await redis.set(key, JSON.stringify({ inviteCode }), 'EX', 900);
      return handoffId;
    } catch (err) {
      Logger.error('Redis storeInviteHandoff error', err);
      throw new AppError('Authentication service temporarily unavailable.', 503, 'REDIS_UNAVAILABLE');
    }
  }

  public static async getInviteHandoff(handoffId: string): Promise<string | null> {
    const redis = RedisService.getClient();
    const key = this.getInviteHandoffKey(handoffId);
    try {
      const val = await redis.get(key);
      if (!val) return null;
      const parsed = JSON.parse(val);
      return parsed.inviteCode || null;
    } catch (err) {
      Logger.error('Redis getInviteHandoff error', err);
      return null;
    }
  }
}
