import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeProject } from './templates';

// Dynamic imports intentionally exercise hydration after installing isolated storage.
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

it('blocks damaged data and preserves the exact raw backup until explicit unlocking', async () => {
  const foreign = { ...makeProject(false), app: 'privacyflow' };
  for (const raw of ['{broken', JSON.stringify({ version: 2, state: makeProject(false) }), JSON.stringify({ version: 0, state: foreign })]) {
    vi.resetModules();
    const storage = { getItem: vi.fn(() => raw), setItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    const { useProjectStore: store } = await import('../store/useProjectStore');
    const { useUiStore: ui } = await import('../store/useUiStore');
    const { projectStorage, unlockStorage, STORAGE_KEY } = await import('./projectStorage');
    expect(ui.getState()).toMatchObject({ storageStatus: 'blocked', rawBackup: raw });
    expect(storage.setItem).not.toHaveBeenCalled();
    store.getState().setMeta({ author: 'memory only' });
    projectStorage.removeItem(STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
    unlockStorage(); store.getState().resetProject(false);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(ui.getState()).toMatchObject({ storageStatus: 'ready', rawBackup: null });
  }
});

it('keeps unavailable storage usable in memory and exposes a backup after save failure', async () => {
  vi.stubGlobal('localStorage', { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } });
  const { useProjectStore: store, projectSnapshot } = await import('../store/useProjectStore');
  const { useUiStore: ui } = await import('../store/useUiStore');
  expect(ui.getState()).toMatchObject({ storageStatus: 'unavailable', saveError: true });
  store.getState().setMeta({ docTitle: 'in memory' });
  expect(JSON.parse(JSON.stringify(projectSnapshot())).meta.docTitle).toBe('in memory');
  expect(ui.getState().saveError).toBe(true);
});

it('clears quota errors after the next successful save without losing edits', async () => {
  let quota = true;
  const saved = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: () => null, setItem(key: string, value: string) { if (quota) throw new Error('quota'); saved.set(key, value); }, removeItem() {} });
  const { useProjectStore: store, projectSnapshot } = await import('../store/useProjectStore');
  const { useUiStore: ui } = await import('../store/useUiStore');
  expect(ui.getState().storageStatus).toBe('empty');
  expect(saved.size).toBe(0);
  store.getState().setMeta({ author: 'survives' });
  expect(ui.getState().saveError).toBe(true);
  expect(projectSnapshot().meta.author).toBe('survives');
  quota = false; store.getState().setMeta({ reviewer: 'saved' });
  expect(ui.getState()).toMatchObject({ storageStatus: 'ready', saveError: false });
  expect(JSON.parse(saved.get('infoflow-project-v1')!).state.meta).toMatchObject({ author: 'survives', reviewer: 'saved' });
});

it('hydrates canonical data without writing it or recording undo history', async () => {
  const project = makeProject(true);
  const storage = { getItem: vi.fn(() => JSON.stringify({ version: 0, state: { ...project, extra: true } })), setItem: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const { projectSnapshot } = await import('../store/useProjectStore');
  const { undo } = await import('../store/projectHistory');
  expect(projectSnapshot()).toEqual(project);
  expect(storage.getItem).toHaveBeenCalledWith('infoflow-project-v1');
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(undo()).toBe(false);
});
