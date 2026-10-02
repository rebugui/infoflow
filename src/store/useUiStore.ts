import { create } from 'zustand';

interface StorageState {
  storageStatus: 'empty' | 'ready' | 'blocked' | 'unavailable';
  rawBackup: string | null;
  saveError: boolean;
}
interface UiState extends StorageState {
  selected: string | null;
  focusId: string | null;
  toast: string;
  editEpoch: number;
  select: (id: string | null) => void;
  focus: (id: string) => void;
  notify: (text: string) => void;
  resetEditors: () => void;
  setStorageState: (patch: Partial<StorageState>) => void;
}
export const useUiStore = create<UiState>((set) => ({
  selected: null, focusId: null, toast: '', editEpoch: 0,
  storageStatus: 'empty', rawBackup: null, saveError: false,
  select: (selected) => set({ selected }),
  focus: (focusId) => set({ focusId, selected: focusId }),
  notify: (toast) => set({ toast }),
  resetEditors: () => set((state) => ({ editEpoch: state.editEpoch + 1 })),
  setStorageState: (patch) => set(patch),
}));
