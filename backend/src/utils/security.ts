import crypto from 'crypto';
import * as argon2 from '@node-rs/argon2';
import bcrypt from 'bcrypt';

export class TokenSecurity {
  /**
   * Hashes an opaque token (refresh token, verification token, reset token) using SHA-256
   * before persisting to the database.
   */
  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a cryptographically secure random token string for refresh tokens.
   */
  public static generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generates a URL-safe high-entropy random token for email verification and password resets.
   */
  public static generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generates a 6-character uppercase user-friendly invite code (e.g. GOA7K2)
   */
  public static generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Unambiguous chars (no 0, O, 1, I)
    let result = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      result += chars[bytes[i]! % chars.length];
    }
    return result;
  }

  /**
   * Generates an opaque high-entropy invite token for link sharing
   */
  public static generateInviteToken(): string {
    return crypto.randomBytes(24).toString('base64url');
  }

  /**
   * Securely hashes user passwords using Argon2id (OWASP recommended parameters).
   */
  public static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      algorithm: argon2.Algorithm.Argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  }

  /**
   * Verifies a plain text password against a stored hash.
   * Transparently supports Argon2id and fallback bcrypt for existing hashes.
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, password);
      }
      if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        return await bcrypt.compare(password, hash);
      }
      return false;
    } catch {
      return false;
    }
  }
}
