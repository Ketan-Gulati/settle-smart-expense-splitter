import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:8081'),
  APP_URL: z.string().default('http://localhost:5000'),
  FRONTEND_URL: z.string().default('http://localhost:8081'),

  // JWT configuration
  ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // Password Security
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/v1/auth/google/callback'),

  // Resend Email Infrastructure
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Settle <no-reply@settle.co>'),
  EMAIL_FROM_NAME: z.string().default('Settle'),
  RESEND_OTP_TEMPLATE_ID: z.string().optional(),

  // OTP Configuration (Redis Ephemeral Auth)
  AUTH_OTP_TTL_SECONDS: z.coerce.number().default(300), // 5 minutes
  AUTH_OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  AUTH_OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60), // 60 seconds
  AUTH_OTP_MAX_REQUESTS_PER_HOUR: z.coerce.number().default(5),

  // Redis configuration (Ephemeral Auth & Rate Limiting)
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().default(5000),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// Fail fast in production if security/email parameters are missing
const validateProductionRequirements = (parsed: z.infer<typeof envSchema>) => {
  if (parsed.NODE_ENV === 'production') {
    if (!parsed.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY must be configured in production environment.');
    }
  }
};

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment configuration validation failed:');
    for (const error of result.error.errors) {
      console.error(`  - ${error.path.join('.')}: ${error.message}`);
    }
    throw new Error('Invalid environment configuration. Fix .env before starting server.');
  }
  validateProductionRequirements(result.data);
  return result.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;
