import type { DiagramTab } from '../types';
import { NODE_HEIGHT, NODE_WIDTH } from './nodeTypes';

export function layoutDiagram(tab: DiagramTab): DiagramTab {
  const outgoing = new Map(tab.nodes.map((node) => [node.id, [] as string[]]));
  for (const flow of tab.flows) outgoing.get(flow.from)?.push(flow.to);
  const indexes = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const stacked = new Set<string>();
  const component = new Map<string, number>();
  let index = 0;
  let count = 0;
  function visit(id: string) {
    indexes.set(id, index);
    low.set(id, index++);
    stack.push(id);
    stacked.add(id);
    for (const next of outgoing.get(id) ?? []) {
      if (!outgoing.has(next)) continue;
      if (!indexes.has(next)) {
        visit(next);
        low.set(id, Math.min(low.get(id)!, low.get(next)!));
      } else if (stacked.has(next)) {
        low.set(id, Math.min(low.get(id)!, indexes.get(next)!));
      }
    }
    if (low.get(id) === indexes.get(id)) {
      let member: string;
      do {
        member = stack.pop()!;
        stacked.delete(member);
        component.set(member, count);
      } while (member !== id);
      count++;
    }
  }
  for (const node of tab.nodes) if (!indexes.has(node.id)) visit(node.id);
  const edges = Array.from({ length: count }, () => new Set<number>());
  const indegrees = Array<number>(count).fill(0);
  const columns = Array<number>(count).fill(0);
  for (const flow of tab.flows) {
    const from = component.get(flow.from), to = component.get(flow.to);
    if (from !== undefined && to !== undefined && from !== to && !edges[from].has(to)) {
      edges[from].add(to);
      indegrees[to]++;
    }
  }
  const queue = indegrees.flatMap((degree, i) => degree === 0 ? [i] : []);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const next of edges[current]) {
      columns[next] = Math.max(columns[next], columns[current] + 1);
      if (--indegrees[next] === 0) queue.push(next);
    }
  }
  const rows = new Map<number, number>();
  return { ...tab, nodes: tab.nodes.map((node) => {
    const column = columns[component.get(node.id)!];
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    return { ...node, x: 80 + column * 460, y: 220 + row * 180 };
  }) };
}

export function nextNodePosition(tab: DiagramTab): { x: number; y: number } {
  const x = 80;
  let y = 220;
  while (tab.nodes.some((node) =>
    x < node.x + NODE_WIDTH + 40 && x + NODE_WIDTH + 40 > node.x &&
    y < node.y + NODE_HEIGHT + 40 && y + NODE_HEIGHT + 40 > node.y,
  )) y += 180;
  return { x, y };
}
