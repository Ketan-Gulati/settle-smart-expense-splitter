import { TokenStorage } from './api/tokenStorage';
import { useAppStore } from '../store/appStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export class RealtimeClient {
  private static eventSource: any = null;
  private static reconnectTimer: any = null;
  private static isConnecting = false;

  /**
   * Connect to server real-time event stream
   */
  public static async connect(): Promise<void> {
    if (this.eventSource || this.isConnecting) return;

    try {
      this.isConnecting = true;
      const token = await TokenStorage.getAccessToken();
      if (!token) {
        this.isConnecting = false;
        return;
      }

      // Check if browser EventSource / Fetch streaming is supported
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        const sseUrl = `${BASE_URL}/realtime/events`;
        
        // Native EventSource doesn't allow custom headers in browser, so connect with auth param or fetch reader
        this.connectViaFetchStream(sseUrl, token);
      }
    } catch (err) {
      console.warn('Realtime client connection error:', err);
    } finally {
      this.isConnecting = false;
    }
  }

  private static async connectViaFetchStream(url: string, token: string): Promise<void> {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || !response.body) {
        this.scheduleReconnect();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const readChunk = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.scheduleReconnect();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const rawData = line.slice(6).trim();
              try {
                const event = JSON.parse(rawData);
                this.handleIncomingEvent(event);
              } catch {}
            }
          }

          readChunk();
        } catch {
          this.scheduleReconnect();
        }
      };

      readChunk();
    } catch {
      this.scheduleReconnect();
    }
  }

  private static handleIncomingEvent(event: any): void {
    if (event.type === 'DATA_CHANGED' || event.type === 'EXPENSE_ADDED' || event.type === 'SETTLEMENT_RECORDED') {
      useAppStore.getState().notifyDataChanged();
    }
  }

  private static scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  public static disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
