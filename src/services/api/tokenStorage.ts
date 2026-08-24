import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'settle_refresh_token';
const ACCESS_TOKEN_KEY = 'settle_access_token';

// In-memory fallback for web platforms where SecureStore is not supported
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export class TokenStorage {
  public static async getAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return memoryAccessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return memoryAccessToken;
    }
  }

  public static async setAccessToken(token: string): Promise<void> {
    memoryAccessToken = token;
    if (Platform.OS === 'web') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      return;
    }
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch {
      // Fallback in memory
    }
  }

  public static async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return memoryRefreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return memoryRefreshToken;
    }
  }

  public static async setRefreshToken(token: string): Promise<void> {
    memoryRefreshToken = token;
    if (Platform.OS === 'web') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      return;
    }
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch {
      // Fallback in memory
    }
  }

  public static async clearTokens(): Promise<void> {
    memoryAccessToken = null;
    memoryRefreshToken = null;
    if (Platform.OS === 'web') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Fallback clear
    }
  }
}
