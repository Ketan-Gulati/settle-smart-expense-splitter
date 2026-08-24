export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code = 'NETWORK_ERROR', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
