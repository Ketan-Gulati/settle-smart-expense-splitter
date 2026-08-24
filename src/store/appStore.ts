import { create } from 'zustand';
import { UserDTO } from '../services/api/types';
import { SettleApiService } from '../services/api/settleApi';
import { TokenStorage } from '../services/api/tokenStorage';

interface SessionState {
  currentUser: UserDTO | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  activeGroupId: string | null;
  dataVersion: number;
  initSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveGroup: (id: string | null) => void;
  notifyDataChanged: () => void;
}

export const useAppStore = create<SessionState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isSessionLoading: true,
  activeGroupId: null,
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
      dataVersion: get().dataVersion + 1,
    });
  },

  setActiveGroup: (activeGroupId) => set({ activeGroupId }),
  notifyDataChanged: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
}));
