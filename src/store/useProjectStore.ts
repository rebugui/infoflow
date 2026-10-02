import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DataFlow, DiagramTab, FlowNode, Project, ProjectMeta, Revision } from '../types';
import { makeProject } from '../lib/templates';
import { parseProject } from '../lib/projectValidation';
import { projectStorage, STORAGE_KEY } from '../lib/projectStorage';
import { useUiStore } from './useUiStore';

export const uid = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString('en-CA');
function uniqueTabName(tabs: DiagramTab[], base: string, suffix = 0): string {
  const names = new Set(tabs.map((tab) => tab.name));
  let name = suffix ? `${base} ${suffix}` : base;
  while (names.has(name)) { suffix = Math.max(2, suffix + 1); name = `${base} ${suffix}`; }
  return name;
}
interface Actions {
  addNode: (node: Omit<FlowNode, 'id'>) => string;
  updateNode: (id: string, patch: Partial<Omit<FlowNode, 'id' | 'x' | 'y'>>) => void;
  removeNode: (id: string) => void;
  addFlow: (flow: Omit<DataFlow, 'id'>) => string;
  updateFlow: (id: string, patch: Partial<Omit<DataFlow, 'id'>>) => void;
  removeFlow: (id: string) => void;
  updateTab: (tab: DiagramTab) => void;
  addTab: (template: boolean) => void;
  dupTab: (id: string) => void;
  removeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  setActiveTab: (id: string) => void;
  setMeta: (patch: Partial<ProjectMeta>) => void;
  addRevision: (revision: Omit<Revision, 'id'>) => void;
  removeRevision: (id: string) => void;
  replaceProject: (value: unknown) => void;
  resetProject: (template: boolean) => void;
}
export const useProjectStore = create<Project & Actions>()(persist((set, get) => {
  function commit(next: Project, resetEditors = false) {
    const current = get();
    const parsed = parseProject(next);
    set({ ...parsed,
      meta: next.meta === current.meta ? current.meta : parsed.meta,
      revisions: next.revisions === current.revisions ? current.revisions : parsed.revisions,
      tabs: next.tabs === current.tabs ? current.tabs : parsed.tabs.map((tab, i) =>
        current.tabs.includes(next.tabs[i]) ? next.tabs[i] : tab),
    });
    if (resetEditors) useUiStore.getState().resetEditors();
  }
  function edit(fn: (tab: DiagramTab) => DiagramTab) {
    const current = get();
    const tab = current.tabs.find((tab) => tab.id === current.activeTabId)!;
    const updated = fn(tab);
    if (updated !== tab) commit({ ...current, tabs: current.tabs.map((item) => item === tab ? updated : item) });
  }
  return {
    ...makeProject(false),
    addNode(node) {
      const id = uid();
      edit((tab) => ({ ...tab, nodes: [...tab.nodes, { ...node, id }] }));
      return id;
    },
    updateNode(id, patch) {
      edit((tab) => !tab.nodes.some((node) => node.id === id) ? tab : ({ ...tab, nodes: tab.nodes.map((node) =>
        node.id === id ? { ...node, ...patch, id, x: node.x, y: node.y } : node) }));
    },
    removeNode(id) {
      edit((tab) => !tab.nodes.some((node) => node.id === id) ? tab : ({ ...tab,
        nodes: tab.nodes.filter((node) => node.id !== id),
        flows: tab.flows.filter((flow) => flow.from !== id && flow.to !== id),
      }));
    },
    addFlow(flow) {
      const id = uid();
      edit((tab) => ({ ...tab, flows: [...tab.flows, { ...flow, id }] }));
      return id;
    },
    updateFlow(id, patch) {
      edit((tab) => !tab.flows.some((flow) => flow.id === id) ? tab : ({ ...tab, flows: tab.flows.map((flow) => {
        if (flow.id !== id) return flow;
        const updated = { ...flow, ...patch, id };
        if (updated.from !== flow.from) updated.sourceHandle = null;
        if (updated.to !== flow.to) updated.targetHandle = null;
        return updated;
      }) }));
    },
    removeFlow(id) {
      edit((tab) => !tab.flows.some((flow) => flow.id === id) ? tab : ({ ...tab, flows: tab.flows.filter((flow) => flow.id !== id) }));
    },
    updateTab(tab) {
      const current = get();
      if (current.tabs.some((item) => item.id === tab.id)) commit({ ...current, tabs: current.tabs.map((item) => item.id === tab.id ? tab : item) });
    },
    addTab(template) {
      const current = get();
      const tab = makeProject(template).tabs[0];
      tab.name = uniqueTabName(current.tabs, '흐름도', current.tabs.length + 1);
      commit({ ...current, tabs: [...current.tabs, tab], activeTabId: tab.id }, true);
    },
    dupTab(id) {
      const current = get(), source = current.tabs.find((tab) => tab.id === id);
      if (!source) return;
      const ids = new Map(source.nodes.map((node) => [node.id, uid()]));
      const tab: DiagramTab = {
        id: uid(), name: uniqueTabName(current.tabs, `${source.name} 복사`),
        nodes: source.nodes.map((node) => ({ ...node, id: ids.get(node.id)! })),
        flows: source.flows.map((flow) => ({ ...flow, id: uid(), from: ids.get(flow.from)!, to: ids.get(flow.to)! })),
      };
      commit({ ...current, tabs: [...current.tabs, tab], activeTabId: tab.id }, true);
    },
    removeTab(id) {
      const current = get();
      if (current.tabs.length === 1 || !current.tabs.some((tab) => tab.id === id)) return;
      const tabs = current.tabs.filter((tab) => tab.id !== id);
      commit({ ...current, tabs, activeTabId: current.activeTabId === id ? tabs[0].id : current.activeTabId }, true);
    },
    renameTab(id, name) {
      const current = get();
      if (current.tabs.some((tab) => tab.id === id)) commit({ ...current, tabs: current.tabs.map((tab) => tab.id === id ? { ...tab, name } : tab) });
    },
    setActiveTab(id) {
      const current = get();
      if (current.activeTabId !== id && current.tabs.some((tab) => tab.id === id)) commit({ ...current, activeTabId: id }, true);
    },
    setMeta(patch) { const current = get(); commit({ ...current, meta: { ...current.meta, ...patch } }); },
    addRevision(revision) { const current = get(); commit({ ...current, revisions: [...current.revisions, { ...revision, id: uid() }] }); },
    removeRevision(id) {
      const current = get();
      if (current.revisions.some((revision) => revision.id === id)) commit({ ...current, revisions: current.revisions.filter((revision) => revision.id !== id) });
    },
    replaceProject(value) { commit(parseProject(value), true); },
    resetProject(template) { commit(makeProject(template), true); },
  };
}, {
  name: STORAGE_KEY,
  storage: createJSONStorage(() => projectStorage),
  partialize: (state) => ({ app: state.app, schema: state.schema, meta: state.meta, revisions: state.revisions, tabs: state.tabs, activeTabId: state.activeTabId }),
}));

const unsubscribe = useProjectStore.subscribe((state) => {
  const ui = useUiStore.getState();
  const tab = state.tabs.find((tab) => tab.id === state.activeTabId)!;
  const exists = (id: string) => tab.nodes.some((node) => node.id === id) || tab.flows.some((flow) => flow.id === id);
  if (ui.selected && !exists(ui.selected)) ui.select(null);
  if (ui.focusId && !exists(ui.focusId)) useUiStore.setState({ focusId: null });
});
if (import.meta.hot) import.meta.hot.dispose(unsubscribe);

export function projectSnapshot(): Project {
  const state = useProjectStore.getState();
  return structuredClone({ app: state.app, schema: state.schema, meta: state.meta, revisions: state.revisions, tabs: state.tabs, activeTabId: state.activeTabId });
}
