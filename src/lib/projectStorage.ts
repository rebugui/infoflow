import type { StateStorage } from 'zustand/middleware';
import { useUiStore } from '../store/useUiStore';
import { parseProject } from './projectValidation';

export const STORAGE_KEY = 'infoflow-project-v1';
let blocked = false;
let baselineKnown = false;
let baselineRaw: string | null = null;
let pending: Promise<void> = Promise.resolve();
let queued = 0;

const locksAvailable = () => typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';
const conflict = () => useUiStore.getState().setStorageState({ saveStatus: 'conflict' });

export function unlockStorage(): void {
  if (!blocked) return;
  blocked = false;
  useUiStore.getState().setStorageState({ storageStatus: 'empty', rawBackup: null, saveStatus: locksAvailable() ? 'saved' : 'unsupported' });
}

export function waitForPendingSaves(): Promise<void> {
  return pending;
}

function enqueue(name: string, value: string | null): void {
  const status = useUiStore.getState().saveStatus;
  if (blocked || status === 'conflict' || status === 'unsupported') return;
  if (!locksAvailable()) {
    useUiStore.getState().setStorageState({ saveStatus: 'unsupported' });
    return;
  }
  queued++;
  useUiStore.getState().setStorageState({ saveStatus: 'saving' });
  pending = pending.then(async () => {
    let saved = false;
    if (!blocked && useUiStore.getState().saveStatus !== 'conflict') {
      try {
        await navigator.locks.request(`${STORAGE_KEY}:write`, { mode: 'exclusive' }, () => {
          // Compare and write synchronously while holding the cross-tab exclusive lock.
          const current = globalThis.localStorage.getItem(name);
          if (baselineKnown ? current !== baselineRaw : current !== null) {
            conflict();
            return;
          }
          if (value === null) globalThis.localStorage.removeItem(name);
          else globalThis.localStorage.setItem(name, value);
          baselineRaw = value;
          baselineKnown = true;
          saved = true;
          useUiStore.getState().setStorageState({ storageStatus: value === null ? 'empty' : 'ready', rawBackup: null });
        });
      } catch {
        useUiStore.getState().setStorageState({ saveStatus: 'failed' });
      }
    }
    queued--;
    if (saved && useUiStore.getState().saveStatus !== 'conflict') {
      useUiStore.getState().setStorageState({ saveStatus: queued === 0 ? 'saved' : 'saving' });
    }
  });
}

export function registerStorageEvents(): () => void {
  if (typeof window === 'undefined') return () => {};
  const compare = () => {
    if (blocked || useUiStore.getState().saveStatus === 'conflict') return;
    try {
      const current = globalThis.localStorage.getItem(STORAGE_KEY);
      if (baselineKnown ? current !== baselineRaw : current !== null) conflict();
    } catch {
      baselineKnown = false;
      useUiStore.getState().setStorageState({ storageStatus: 'unavailable', saveStatus: 'failed' });
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      if (event.storageArea === globalThis.localStorage) compare();
    } catch {
      baselineKnown = false;
      useUiStore.getState().setStorageState({ storageStatus: 'unavailable', saveStatus: 'failed' });
    }
  };
  window.addEventListener('storage', onStorage);
  compare();
  return () => window.removeEventListener('storage', onStorage);
}

export const projectStorage: StateStorage = {
  getItem(name) {
    let raw: string | null;
    try {
      raw = globalThis.localStorage.getItem(name);
    } catch {
      baselineKnown = false;
      useUiStore.getState().setStorageState({ storageStatus: 'unavailable', saveStatus: 'failed' });
      return null;
    }
    baselineRaw = raw;
    baselineKnown = true;
    const saveStatus = locksAvailable() ? 'saved' : 'unsupported';
    if (raw === null) {
      useUiStore.getState().setStorageState({ storageStatus: 'empty', rawBackup: null, saveStatus });
      return null;
    }
    try {
      const envelope: unknown = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
        !('version' in envelope) || envelope.version !== 0 || !('state' in envelope)) throw new Error('Invalid envelope');
      const state = parseProject(envelope.state);
      useUiStore.getState().setStorageState({ storageStatus: 'ready', rawBackup: null, saveStatus });
      return JSON.stringify({ state, version: 0 });
    } catch {
      blocked = true;
      useUiStore.getState().setStorageState({ storageStatus: 'blocked', rawBackup: raw, saveStatus });
      return null;
    }
  },
  setItem(name, value) { enqueue(name, value); },
  removeItem(name) { enqueue(name, null); },
};
