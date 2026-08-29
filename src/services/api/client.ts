import { TokenStorage } from './tokenStorage';
import { ApiError } from './errors';
import { ApiResponse, AuthTokensDTO } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

// In-Memory Stale-While-Revalidate (SWR) cache for instant 0ms transitions
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute fresh TTL

let activeRefreshPromise: Promise<string | null> | null = null;

export class ApiClient {
  public static clearCache(): void {
    apiCache.clear();
  }

  public static async get<T>(path: string, params?: Record<string, any>, options?: { bypassCache?: boolean }): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);

    // If cached response exists, return it instantly while optionally refreshing in background
    if (!options?.bypassCache && apiCache.has(url)) {
      const cached = apiCache.get(url)!;
      const isFresh = Date.now() - cached.timestamp < CACHE_TTL_MS;
      if (isFresh) {
        // Return cached instantly (0ms) and trigger background revalidation
        this.requestWithAuth<T>(url, { method: 'GET' })
          .then((res) => {
            apiCache.set(url, { data: res, timestamp: Date.now() });
          })
          .catch(() => null);
        return cached.data;
      }
    }

    const res = await this.requestWithAuth<T>(url, { method: 'GET' });
    apiCache.set(url, { data: res, timestamp: Date.now() });
    return res;
  }

  public static async post<T>(path: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    this.clearCache(); // Invalidate stale cache on mutations
    const url = this.buildUrl(path);
    return this.requestWithAuth<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static async patch<T>(path: string, body?: any): Promise<ApiResponse<T>> {
    this.clearCache(); // Invalidate stale cache on mutations
    const url = this.buildUrl(path);
    return this.requestWithAuth<T>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static async delete<T>(path: string): Promise<ApiResponse<T>> {
    this.clearCache(); // Invalidate stale cache on mutations
    const url = this.buildUrl(path);
    return this.requestWithAuth<T>(url, { method: 'DELETE' });
  }

  private static buildUrl(path: string, params?: Record<string, any>): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${BASE_URL}${normalizedPath}`;
    if (params) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      }
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private static async requestWithAuth<T>(
    url: string,
    options: RequestInit,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const accessToken = await TokenStorage.getAccessToken();
    const headers = new Headers(options.headers || {});
    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (err: any) {
      throw new ApiError(
        'Unable to connect to server. Please check your network.',
        'NETWORK_ERROR',
        0
      );
    }

    // Handle 401 Unauthorized & Token Refresh
    if (response.status === 401 && !isRetry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      const newAccessToken = await this.performSingleRefresh();
      if (newAccessToken) {
        // Retry original request with new access token
        return this.requestWithAuth<T>(url, options, true);
      }
    }

    // Handle transient 500 database wake-up / network hiccups
    if (response.status === 500 && !isRetry) {
      await new Promise((r) => setTimeout(r, 600));
      return this.requestWithAuth<T>(url, options, true);
    }

    let json: any;
    try {
      json = await response.json();
    } catch {
      throw new ApiError('Unexpected response from server', 'INVALID_JSON', response.status);
    }

    if (!response.ok || !json.success) {
      const errorMsg = json?.error?.message || response.statusText || 'Request failed';
      const errorCode = json?.error?.code || 'API_ERROR';
      throw new ApiError(errorMsg, errorCode, response.status);
    }

    return json;
  }

  private static async performSingleRefresh(): Promise<string | null> {
    if (!activeRefreshPromise) {
      activeRefreshPromise = (async () => {
        try {
          const refreshToken = await TokenStorage.getRefreshToken();
          if (!refreshToken) {
            await TokenStorage.clearTokens();
            return null;
          }

          const refreshUrl = `${BASE_URL}/auth/refresh`;
          const res = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!res.ok) {
            await TokenStorage.clearTokens();
            return null;
          }

          const json: ApiResponse<AuthTokensDTO> = await res.json();
          if (json.success && json.data) {
            await TokenStorage.setAccessToken(json.data.accessToken);
            await TokenStorage.setRefreshToken(json.data.refreshToken);
            return json.data.accessToken;
          }

          await TokenStorage.clearTokens();
          return null;
        } catch {
          await TokenStorage.clearTokens();
          return null;
        } finally {
          activeRefreshPromise = null;
        }
      })();
    }
    return activeRefreshPromise;
  }
}
