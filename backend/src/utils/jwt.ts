import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
}

export class JWTUtil {
  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as any,
    });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as TokenPayload;
  }
}
