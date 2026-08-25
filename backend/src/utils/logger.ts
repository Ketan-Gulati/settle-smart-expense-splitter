export class Logger {
  public static debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        JSON.stringify({
          level: 'debug',
          timestamp: new Date().toISOString(),
          message,
          ...this.sanitize(meta),
        })
      );
    }
  }

  public static info(message: string, meta?: Record<string, any>): void {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...this.sanitize(meta),
      })
    );
  }

  public static warn(message: string, meta?: Record<string, any>): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...this.sanitize(meta),
      })
    );
  }

  public static error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        error: error instanceof Error ? { name: error.name, message: error.message } : error,
        ...this.sanitize(meta),
      })
    );
  }

  private static sanitize(meta?: Record<string, any>): Record<string, any> {
    if (!meta) return {};
    const sanitized = { ...meta };
    const sensitiveKeys = [
      'password',
      'password_hash',
      'passwordHash',
      'secret',
      'token',
      'tokenHash',
      'authorization',
    ];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
