import { Resend } from 'resend';
import { env } from '../../config/env';

export class ResendClient {
  private static instance: Resend | null = null;
  private static mockInstance: Resend | null = null;

  /**
   * Returns a singleton Resend client instance if API key is configured.
   */
  public static getInstance(): Resend | null {
    if (this.mockInstance) {
      return this.mockInstance;
    }

    if (!this.instance && env.RESEND_API_KEY) {
      this.instance = new Resend(env.RESEND_API_KEY);
    }
    return this.instance;
  }

  /**
   * Allows test suites to inject a mocked Resend client
   */
  public static setMockInstance(mock: Resend | null): void {
    this.mockInstance = mock;
  }

  public static isConfigured(): boolean {
    return Boolean(this.mockInstance || env.RESEND_API_KEY);
  }
}
