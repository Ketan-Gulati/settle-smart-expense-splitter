import { create } from 'zustand';
import { UserDTO } from '../services/api/types';
import { SettleApiService } from '../services/api/settleApi';
import { TokenStorage } from '../services/api/tokenStorage';

interface SessionState {
  currentUser: UserDTO | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  activeGroupId: string | null;
  unreadNotificationCount: number;
  dataVersion: number;
  initSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveGroup: (id: string | null) => void;
  fetchUnreadNotificationCount: () => Promise<void>;
  notifyDataChanged: () => void;
}

export const useAppStore = create<SessionState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isSessionLoading: true,
  activeGroupId: null,
  unreadNotificationCount: 0,
  dataVersion: 0,

  initSession: async () => {
    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (!refreshToken) {
        set({ currentUser: null, isAuthenticated: false, isSessionLoading: false });
        return;
      }

      const user = await SettleApiService.getMe();
      set({
        currentUser: user,
        isAuthenticated: true,
        isSessionLoading: false,
      });

      // Connect to Real-time Sync SSE Stream
      try {
        const { RealtimeClient } = require('../services/realtimeClient');
        RealtimeClient.connect();
      } catch {}
    } catch {
      await TokenStorage.clearTokens();
      set({ currentUser: null, isAuthenticated: false, isSessionLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await SettleApiService.login(email, password);
    set({
      currentUser: res.user,
      isAuthenticated: true,
      dataVersion: get().dataVersion + 1,
    });

    try {
      const { RealtimeClient } = require('../services/realtimeClient');
      RealtimeClient.connect();
    } catch {}
  },

  register: async (name, email, password) => {
    const res = await SettleApiService.register(name, email, password);
    set({
      currentUser: res.user,
      isAuthenticated: true,
      dataVersion: get().dataVersion + 1,
    });
  },

  logout: async () => {
    await SettleApiService.logout();
    set({
      currentUser: null,
      isAuthenticated: false,
      unreadNotificationCount: 0,
      dataVersion: get().dataVersion + 1,
    });
  },

  setActiveGroup: (activeGroupId) => set({ activeGroupId }),

  fetchUnreadNotificationCount: async () => {
    try {
      const notifs = await SettleApiService.getNotifications();
      const count = notifs.filter((n) => n.status !== 'READ').length;
      set({ unreadNotificationCount: count });
    } catch {
      // Ignore network failures for notification count
    }
  },

  notifyDataChanged: () => {
    try {
      const { ApiClient } = require('../services/api/client');
      ApiClient.clearCache();
    } catch {}
    try {
      const { homeFeedService } = require('../services/homeFeedService');
      homeFeedService.clearCache();
    } catch {}

    set((state) => ({ dataVersion: state.dataVersion + 1 }));
    get().fetchUnreadNotificationCount();
  },
}));
