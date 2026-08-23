import { create } from 'zustand';

interface AppState {
  currentUserId: string | null;
  activeGroupId: string | null;
  isInitialized: boolean;
  dataVersion: number;
  setCurrentUser: (id: string | null) => void;
  setActiveGroup: (id: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  notifyDataChanged: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUserId: null,
  activeGroupId: null,
  isInitialized: false,
  dataVersion: 0,
  setCurrentUser: (currentUserId) => set({ currentUserId }),
  setActiveGroup: (activeGroupId) => set({ activeGroupId }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  notifyDataChanged: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
}));
