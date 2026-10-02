import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultFlow, defaultNode } from '../lib/defaults';
import { nextNodePosition } from '../lib/layout';


// Import stores dynamically after resetting modules and installing isolated persistence.
beforeEach(() => {
  vi.resetModules();
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

it('rejects invalid replacement and CRUD atomically without changing storage, selection or history', async () => {
  const { useProjectStore: store, projectSnapshot } = await import('./useProjectStore');
  const { useUiStore: ui } = await import('./useUiStore');
  store.getState().resetProject(true);
  const { undo } = await import('./projectHistory');
  const before = projectSnapshot(), saved = localStorage.getItem('infoflow-project-v1');
  ui.getState().select(before.tabs[0].nodes[0].id);
  const epoch = ui.getState().editEpoch;
  expect(() => store.getState().replaceProject({ ...before, app: 'privacyflow' })).toThrow();
  expect(() => store.getState().addFlow(defaultFlow('missing', 'missing'))).toThrow();
  expect(() => store.getState().updateTab({ ...before.tabs[0], nodes: [] })).toThrow();
  expect(projectSnapshot()).toEqual(before);
  expect(localStorage.getItem('infoflow-project-v1')).toBe(saved);
  expect(ui.getState().selected).toBe(before.tabs[0].nodes[0].id);
  expect(ui.getState().editEpoch).toBe(epoch);
  expect(undo()).toBe(false);
});

it('applies attribute drafts over the latest dragged coordinates and keeps ID-based flow endpoints', async () => {
  const { useProjectStore: store } = await import('./useProjectStore');
  const { useUiStore: ui } = await import('./useUiStore');
  store.getState().resetProject(true);
  const initial = store.getState().tabs[0], node = initial.nodes[0];
  ui.getState().select(node.id);
  const epoch = ui.getState().editEpoch;
  store.getState().updateTab({ ...initial, nodes: initial.nodes.map((item) => item.id === node.id ? { ...item, x: 901, y: -202 } : item) });
  store.getState().updateNode(node.id, { name: '변경' });
  expect(store.getState().tabs[0].nodes[0]).toMatchObject({ name: '변경', x: 901, y: -202 });
  expect(store.getState().tabs[0].flows[0].from).toBe(node.id);
  expect(ui.getState().selected).toBe(node.id);
  expect(ui.getState().editEpoch).toBe(epoch);
});

it('resets only the handle for a changed endpoint and rejects cross-tab endpoints', async () => {
  const { useProjectStore: store } = await import('./useProjectStore');
  store.getState().resetProject(true);
  const tab = store.getState().tabs[0], flow = tab.flows[0];
  store.getState().updateFlow(flow.id, { sourceHandle: 'top', targetHandle: 'bottom' });
  store.getState().updateFlow(flow.id, { from: tab.nodes[2].id, sourceHandle: 'left' });
  expect(store.getState().tabs[0].flows[0]).toMatchObject({ from: tab.nodes[2].id, sourceHandle: null, targetHandle: 'bottom' });
  store.getState().updateFlow(flow.id, { to: tab.nodes[3].id });
  expect(store.getState().tabs[0].flows[0].targetHandle).toBe(null);
  store.getState().addTab(true);
  const foreign = store.getState().tabs[1].nodes[0].id;
  store.getState().setActiveTab(tab.id);
  expect(() => store.getState().updateFlow(flow.id, { to: foreign })).toThrow();
});

it('adding at a computed free position never rearranges existing manual nodes', async () => {
  const { useProjectStore: store } = await import('./useProjectStore');
  store.getState().resetProject(false);
  const first = store.getState().addNode({ ...defaultNode('system'), name: '첫째', ...nextNodePosition(store.getState().tabs[0]) });
  let tab = store.getState().tabs[0];
  expect(tab.nodes[0]).toMatchObject({ id: first, x: 80, y: 220 });
  store.getState().updateTab({ ...tab, nodes: tab.nodes.map((node) => ({ ...node, x: 103, y: 191 })) });
  tab = store.getState().tabs[0];
  const before = structuredClone(tab.nodes);
  store.getState().addNode({ ...defaultNode('process'), name: '둘째', ...nextNodePosition(tab) });
  expect(store.getState().tabs[0].nodes.slice(0, 1)).toEqual(before);
  expect(store.getState().tabs[0].nodes[1]).toMatchObject({ x: 80, y: 400 });
});

it('clears vanished selection and changes editor epoch on navigation, import and reset', async () => {
  const { useProjectStore: store, projectSnapshot } = await import('./useProjectStore');
  const { useUiStore: ui } = await import('./useUiStore');
  store.getState().resetProject(true);
  const original = projectSnapshot();
  ui.getState().focus(original.tabs[0].nodes[0].id);
  let epoch = ui.getState().editEpoch;
  store.getState().addTab(false);
  expect(ui.getState().selected).toBe(null); expect(ui.getState().focusId).toBe(null);
  expect(ui.getState().editEpoch).toBeGreaterThan(epoch);
  epoch = ui.getState().editEpoch;
  store.getState().replaceProject(original);
  expect(ui.getState().editEpoch).toBeGreaterThan(epoch);
  ui.getState().select(original.tabs[0].nodes[0].id);
  store.getState().removeNode(original.tabs[0].nodes[0].id);
  expect(ui.getState().selected).toBe(null);
  epoch = ui.getState().editEpoch;
  store.getState().resetProject(false);
  expect(ui.getState().editEpoch).toBeGreaterThan(epoch);
});
