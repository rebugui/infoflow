import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeProject } from './templates';

let drain: (() => Promise<void>) | undefined;
const locks = { request: async (_name: string, _options: unknown, callback: () => void) => callback() };
function stubLocks() { vi.stubGlobal('navigator', { locks }); }
async function load() {
  const store = await import('../store/useProjectStore');
  const ui = await import('../store/useUiStore');
  const storage = await import('./projectStorage');
  drain = storage.waitForPendingSaves;
  return { store, ui: ui.useUiStore, ...storage };
}
beforeEach(() => { vi.resetModules(); stubLocks(); });
afterEach(async () => { await drain?.(); drain = undefined; vi.unstubAllGlobals(); });

it('blocks damaged data, preserves raw bytes, and checks the baseline even after explicit unlocking', async () => {
  for (const raw of ['{broken', JSON.stringify({ version: 2, state: makeProject(false) }), JSON.stringify({ version: 0, state: { ...makeProject(false), app: 'privacyflow' } })]) {
    await drain?.(); vi.resetModules();
    let current = raw;
    const storage = { getItem: vi.fn(() => current), setItem: vi.fn((_key: string, value: string) => { current = value; }), removeItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    const { store, ui, unlockStorage, waitForPendingSaves, STORAGE_KEY, projectStorage } = await load();
    expect(ui.getState()).toMatchObject({ storageStatus: 'blocked', rawBackup: raw });
    store.useProjectStore.getState().setMeta({ author: 'memory only' });
    projectStorage.removeItem(STORAGE_KEY);
    await waitForPendingSaves();
    expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
    unlockStorage();
    current = 'another tab changed this';
    store.useProjectStore.getState().resetProject(false);
    await waitForPendingSaves();
    expect(ui.getState().saveStatus).toBe('conflict');
    expect(current).toBe('another tab changed this');
  }
});

it('recovers unavailable reads only if the key is empty, preserving edits and never replacing unknown data', async () => {
  let readable = false;
  let current: string | null = 'unseen original';
  const storage = { getItem: () => { if (!readable) throw new Error('denied'); return current; }, setItem: (_key: string, value: string) => { current = value; }, removeItem: () => { current = null; } };
  vi.stubGlobal('localStorage', storage);
  const { store, ui, waitForPendingSaves } = await load();
  expect(ui.getState()).toMatchObject({ storageStatus: 'unavailable', saveStatus: 'failed' });
  readable = true;
  store.useProjectStore.getState().setMeta({ docTitle: 'memory only' });
  await waitForPendingSaves();
  expect(ui.getState().saveStatus).toBe('conflict');
  expect(current).toBe('unseen original');
  expect(store.projectSnapshot().meta.docTitle).toBe('memory only');
});

it('retries quota failures in order and saves the complete latest project', async () => {
  let quota = true;
  const saved = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem(key: string, value: string) { if (quota) throw new Error('quota'); saved.set(key, value); }, removeItem(key: string) { saved.delete(key); } });
  const { store, ui, waitForPendingSaves, STORAGE_KEY } = await load();
  store.useProjectStore.getState().setMeta({ author: 'survives' });
  expect(ui.getState().saveStatus).toBe('saving');
  await waitForPendingSaves();
  expect(ui.getState().saveStatus).toBe('failed');
  quota = false;
  store.useProjectStore.getState().setMeta({ reviewer: 'saved' });
  await waitForPendingSaves();
  expect(ui.getState()).toMatchObject({ storageStatus: 'ready', saveStatus: 'saved' });
  expect(JSON.parse(saved.get(STORAGE_KEY)!).state.meta).toMatchObject({ author: 'survives', reviewer: 'saved' });
});

it('hydrates canonical data without writing it or recording undo history', async () => {
  const project = makeProject(true);
  const raw = JSON.stringify({ version: 0, state: { ...project, extra: true } });
  const storage = { getItem: vi.fn(() => raw), setItem: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const { store, ui } = await load();
  const { undo } = await import('../store/projectHistory');
  expect(store.projectSnapshot()).toEqual(project);
  expect(ui.getState()).toMatchObject({ storageStatus: 'ready', saveStatus: 'saved' });
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(undo()).toBe(false);
});

it('never writes without Web Locks, including a valid existing project', async () => {
  vi.stubGlobal('navigator', {});
  const raw = JSON.stringify({ version: 0, state: makeProject(true) });
  const storage = { getItem: vi.fn(() => raw), setItem: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const { store, ui, projectStorage, STORAGE_KEY, waitForPendingSaves } = await load();
  expect(ui.getState()).toMatchObject({ storageStatus: 'ready', saveStatus: 'unsupported' });
  store.useProjectStore.getState().setMeta({ author: 'memory' });
  projectStorage.removeItem(STORAGE_KEY);
  await waitForPendingSaves();
  expect(store.projectSnapshot().meta.author).toBe('memory');
  expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
});

it('queues saves and detects an external change inside the lock before overwriting', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: () => void) => { await gate; callback(); } } });
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  const { store, ui, waitForPendingSaves, STORAGE_KEY } = await load();
  store.useProjectStore.getState().setMeta({ author: 'first' });
  store.useProjectStore.getState().setMeta({ reviewer: 'second' });
  expect(ui.getState().saveStatus).toBe('saving');
  data.set(STORAGE_KEY, 'external modification');
  release();
  await waitForPendingSaves();
  expect(ui.getState().saveStatus).toBe('conflict');
  expect(data.get(STORAGE_KEY)).toBe('external modification');
  expect(store.projectSnapshot().meta.reviewer).toBe('second');
});

it('serializes a held queue and saves the latest snapshot after earlier saves', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: () => void) => { await gate; callback(); } } });
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  const { store, ui, waitForPendingSaves, STORAGE_KEY } = await load();
  store.useProjectStore.getState().setMeta({ author: 'first' });
  store.useProjectStore.getState().setMeta({ reviewer: 'second' });
  expect(ui.getState().saveStatus).toBe('saving');
  release();
  await waitForPendingSaves();
  expect(ui.getState().saveStatus).toBe('saved');
  expect(JSON.parse(data.get(STORAGE_KEY)!).state.meta).toMatchObject({ author: 'first', reviewer: 'second' });
});

it('allows recovery from a denied read only when the recovered key is empty', async () => {
  let readable = false;
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => { if (!readable) throw new Error('denied'); return data.get(key) ?? null; },
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  const { store, ui, waitForPendingSaves, STORAGE_KEY } = await load();
  readable = true;
  store.useProjectStore.getState().setMeta({ author: 'recovered' });
  await waitForPendingSaves();
  expect(ui.getState().saveStatus).toBe('saved');
  expect(JSON.parse(data.get(STORAGE_KEY)!).state.meta.author).toBe('recovered');
});

it('ignores unrelated storage events and stops writes after key deletion', async () => {
  const project = makeProject(true);
  const data = new Map([['infoflow-project-v1', JSON.stringify({ version: 0, state: project })]]);
  const local = { getItem: (key: string) => data.get(key) ?? null, setItem: vi.fn((key: string, value: string) => data.set(key, value)), removeItem: vi.fn((key: string) => data.delete(key)) };
  vi.stubGlobal('localStorage', local);
  const events = new EventTarget();
  vi.stubGlobal('window', events);
  const { store, ui, STORAGE_KEY, registerStorageEvents, waitForPendingSaves } = await load();
  const unregister = registerStorageEvents();
  const emit = (key: string | null) => {
    const event = new Event('storage');
    Object.defineProperties(event, { key: { value: key }, storageArea: { value: local } });
    events.dispatchEvent(event);
  };
  data.set('other-app', 'different');
  emit('other-app');
  expect(ui.getState().saveStatus).toBe('saved');
  data.delete(STORAGE_KEY);
  emit(null);
  expect(ui.getState().saveStatus).toBe('conflict');
  store.useProjectStore.getState().setMeta({ author: 'memory' });
  await waitForPendingSaves();
  expect(local.setItem).not.toHaveBeenCalled();
  unregister();
});
