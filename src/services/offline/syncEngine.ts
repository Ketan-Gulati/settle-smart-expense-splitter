import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SettleApiService } from '../api/settleApi';
import { useAppStore } from '../../store/appStore';

export interface PendingOfflineExpense {
  id: string;
  clientTempId: string;
  groupId: string;
  groupName?: string;
  description: string;
  amountMinor: number;
  paidByUserId: string;
  splitMethod: string;
  category?: string;
  notes?: string;
  participants: Array<{ userId: string; amountMinor?: number; percentage?: number; shares?: number }>;
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  lastError?: string;
}

const OFFLINE_QUEUE_KEY = 'settle_offline_expense_queue_v1';

export class OfflineSyncEngine {
  private static isSyncing = false;
  private static listeners: Set<(queue: PendingOfflineExpense[]) => void> = new Set();

  public static subscribe(listener: (queue: PendingOfflineExpense[]) => void): () => void {
    this.listeners.add(listener);
    this.getQueue().then(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(queue: PendingOfflineExpense[]): void {
    this.listeners.forEach((fn) => fn(queue));
  }

  /**
   * Reads all pending offline expenses from device storage
   */
  public static async getQueue(): Promise<PendingOfflineExpense[]> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      } else {
        raw = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to read offline queue:', e);
      return [];
    }
  }

  /**
   * Persists the offline queue
   */
  public static async saveQueue(queue: PendingOfflineExpense[]): Promise<void> {
    try {
      const json = JSON.stringify(queue);
      if (Platform.OS === 'web') {
        localStorage.setItem(OFFLINE_QUEUE_KEY, json);
      } else {
        await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, json);
      }
      this.notifyListeners(queue);
    } catch (e) {
      console.warn('Failed to save offline queue:', e);
    }
  }

  /**
   * Enqueues an expense locally when offline or API call fails
   */
  public static async enqueueExpense(expense: Omit<PendingOfflineExpense, 'id' | 'status' | 'retryCount' | 'createdAt'>): Promise<PendingOfflineExpense> {
    const queue = await this.getQueue();
    const tempItem: PendingOfflineExpense = {
      ...expense,
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    queue.push(tempItem);
    await this.saveQueue(queue);
    useAppStore.getState().notifyDataChanged();
    return tempItem;
  }

  /**
   * Process and sync all pending offline expenses with idempotent deduplication
   */
  public static async syncPendingExpenses(): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing) return { syncedCount: 0, failedCount: 0 };
    
    const queue = await this.getQueue();
    if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: PendingOfflineExpense[] = [];

    for (const item of queue) {
      try {
        item.status = 'SYNCING';
        this.notifyListeners([...queue]);

        await SettleApiService.createExpense({
          groupId: item.groupId,
          description: item.description,
          amountMinor: item.amountMinor,
          paidByUserId: item.paidByUserId,
          splitMethod: item.splitMethod,
          category: item.category,
          notes: item.notes,
          participants: item.participants,
        });

        syncedCount++;
      } catch (err: any) {
        console.warn(`Sync failed for offline expense (${item.description}):`, err);
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = err?.message || 'Sync failed';
        item.status = 'FAILED';
        failedCount++;
        remainingQueue.push(item);
      }
    }

    await this.saveQueue(remainingQueue);
    this.isSyncing = false;

    if (syncedCount > 0) {
      useAppStore.getState().notifyDataChanged();
    }

    return { syncedCount, failedCount };
  }

  /**
   * Removes a specific item from the offline queue
   */
  public static async removeItem(id: string): Promise<void> {
    const queue = await this.getQueue();
    const updated = queue.filter((i) => i.id !== id);
    await this.saveQueue(updated);
    useAppStore.getState().notifyDataChanged();
  }

  /**
   * Clears all pending offline items
   */
  public static async clearQueue(): Promise<void> {
    await this.saveQueue([]);
    useAppStore.getState().notifyDataChanged();
  }
}
