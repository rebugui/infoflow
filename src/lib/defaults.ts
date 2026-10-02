import type { DataFlow, FlowNode, InfoNodeKind } from '../types';

export function defaultNode(kind: InfoNodeKind): Omit<FlowNode, 'id'> {
  return { kind, name: '', owner: '', zone: '', description: '', x: 0, y: 0 };
}
export function defaultFlow(from: string, to: string): Omit<DataFlow, 'id'> {
  return { from, to, sourceHandle: null, targetHandle: null, name: '', dataItems: [], purpose: '', classification: 'unknown', transport: '', frequency: '', protection: 'unknown', protectionNote: '', notes: '' };
}
export function splitItems(text: string): string[] {
  return text.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}
