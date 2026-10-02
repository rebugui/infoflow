import { create } from 'zustand';

interface StorageState {
  storageStatus: 'empty' | 'ready' | 'blocked' | 'unavailable';
  rawBackup: string | null;
  saveStatus: 'saved' | 'saving' | 'failed' | 'conflict' | 'unsupported';
}
interface UiState extends StorageState {
  selected: string | null;
  focusId: string | null;
  toast: string;
  editEpoch: number;
  mobilePanel: 'canvas' | 'left' | 'right';
  setMobilePanel: (panel: 'canvas' | 'left' | 'right') => void;
  select: (id: string | null) => void;
  focus: (id: string) => void;
  notify: (text: string) => void;
  resetEditors: () => void;
  setStorageState: (patch: Partial<StorageState>) => void;
}
export const useUiStore = create<UiState>((set) => ({
  selected: null, focusId: null, toast: '', editEpoch: 0, mobilePanel: 'canvas',
  storageStatus: 'empty', rawBackup: null, saveStatus: 'saved',
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  select: (selected) => set({ selected }),
  focus: (focusId) => set({ focusId, selected: focusId, mobilePanel: 'canvas' }),
  notify: (toast) => set({ toast }),
  resetEditors: () => set((state) => ({ editEpoch: state.editEpoch + 1 })),
  setStorageState: (patch) => set(patch),
}));
