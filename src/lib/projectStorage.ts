import type { StateStorage } from 'zustand/middleware';
import { useUiStore } from '../store/useUiStore';
import { parseProject } from './projectValidation';

export const STORAGE_KEY = 'infoflow-project-v1';
let blocked = false;
export function unlockStorage(): void {
  blocked = false;
  useUiStore.getState().setStorageState({ storageStatus: 'empty', rawBackup: null, saveError: false });
}
export const projectStorage: StateStorage = {
  getItem(name) {
    let raw: string | null;
    try {
      raw = globalThis.localStorage.getItem(name);
    } catch {
      useUiStore.getState().setStorageState({ storageStatus: 'unavailable', saveError: true });
      return null;
    }
    if (raw === null) {
      useUiStore.getState().setStorageState({ storageStatus: 'empty', rawBackup: null, saveError: false });
      return null;
    }
    try {
      const envelope: unknown = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
        !('version' in envelope) || envelope.version !== 0 || !('state' in envelope)) throw new Error('Invalid envelope');
      const state = parseProject(envelope.state);
      useUiStore.getState().setStorageState({ storageStatus: 'ready', rawBackup: null, saveError: false });
      return JSON.stringify({ state, version: 0 });
    } catch {
      blocked = true;
      useUiStore.getState().setStorageState({ storageStatus: 'blocked', rawBackup: raw, saveError: false });
      return null;
    }
  },
  setItem(name, value) {
    if (blocked) return;
    try {
      globalThis.localStorage.setItem(name, value);
      useUiStore.getState().setStorageState({ storageStatus: 'ready', rawBackup: null, saveError: false });
    } catch {
      useUiStore.getState().setStorageState({ saveError: true });
    }
  },
  removeItem(name) {
    if (blocked) return;
    try { globalThis.localStorage.removeItem(name); }
    catch { useUiStore.getState().setStorageState({ saveError: true }); }
  },
};
