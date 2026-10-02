import type { Classification, DataFlow, FlowNode, InfoNodeKind, Port, Project, Protection } from '../types';

const invalid = (): never => { throw new Error('백업 데이터 구조가 올바르지 않습니다'); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') return invalid();
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) return invalid();
  return value;
}
function coordinate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return invalid();
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) return invalid();
  return value as T;
}
function port(value: unknown): Port | null {
  return value === null ? null : choice<Port>(value, ['top', 'bottom', 'left', 'right']);
}

export function parseProject(value: unknown): Project {
  const project = object(value);
  if (project.app !== 'infoflow') throw new Error('이 앱에서 만든 백업 파일이 아닙니다');
  if (project.schema !== 1) throw new Error('지원하지 않는 백업 버전입니다');
  const ids = new Set<string>();
  function id(value: unknown): string {
    const result = text(value);
    if (!result.trim() || result.startsWith('__') || ids.has(result)) return invalid();
    ids.add(result);
    return result;
  }
  const meta = object(project.meta);
  const tabs = array(project.tabs).map((value) => {
    const tab = object(value);
    const tabId = id(tab.id);
    const nodes: FlowNode[] = array(tab.nodes).map((value) => {
      const node = object(value);
      return {
        id: id(node.id), kind: choice<InfoNodeKind>(node.kind, ['external', 'process', 'system', 'store']),
        name: text(node.name), owner: text(node.owner), zone: text(node.zone), description: text(node.description),
        x: coordinate(node.x), y: coordinate(node.y),
      };
    });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const flows: DataFlow[] = array(tab.flows).map((value) => {
      const flow = object(value);
      const from = text(flow.from), to = text(flow.to);
      if (!nodeIds.has(from) || !nodeIds.has(to)) return invalid();
      return {
        id: id(flow.id), from, to, sourceHandle: port(flow.sourceHandle), targetHandle: port(flow.targetHandle),
        name: text(flow.name), dataItems: array(flow.dataItems).map(text), purpose: text(flow.purpose),
        classification: choice<Classification>(flow.classification, ['unknown', 'public', 'internal', 'confidential', 'restricted']),
        transport: text(flow.transport), frequency: text(flow.frequency),
        protection: choice<Protection>(flow.protection, ['unknown', 'none', 'tls', 'vpn', 'other']),
        protectionNote: text(flow.protectionNote), notes: text(flow.notes),
      };
    });
    return { id: tabId, name: text(tab.name), nodes, flows };
  });
  const revisions = array(project.revisions).map((value) => {
    const revision = object(value);
    return { id: id(revision.id), version: text(revision.version), date: text(revision.date), author: text(revision.author), desc: text(revision.desc) };
  });
  const activeTabId = text(project.activeTabId);
  if (!tabs.length || !tabs.some((tab) => tab.id === activeTabId)) return invalid();
  return {
    app: 'infoflow', schema: 1,
    meta: { docTitle: text(meta.docTitle), version: text(meta.version), date: text(meta.date), author: text(meta.author), reviewer: text(meta.reviewer) },
    revisions, tabs, activeTabId,
  };
}
