import { expect, it } from 'vitest';
import type { DiagramTab } from '../types';
import { defaultFlow, defaultNode } from './defaults';
import { layoutDiagram, nextNodePosition } from './layout';

it('lays out branches, cycles, self-flows and isolated nodes deterministically by longest predecessor path', () => {
  const tab: DiagramTab = {
    id: 'tab', name: '', nodes: ['a', 'b', 'c', 'd', 'e', 'isolated'].map((id) => ({ ...defaultNode('system'), id })),
    flows: [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e'], ['e', 'd'], ['a', 'a']].map(([from, to], i) => ({ ...defaultFlow(from, to), id: `f${i}` })),
  };
  const before = structuredClone(tab), result = layoutDiagram(tab);
  const byId = new Map(result.nodes.map((node) => [node.id, node]));
  expect(byId.get('a')!.x).toBeLessThan(byId.get('b')!.x);
  expect(byId.get('b')!.x).toBe(byId.get('c')!.x);
  expect(byId.get('c')!.y).toBeGreaterThan(byId.get('b')!.y);
  expect(byId.get('d')!.x).toBeGreaterThan(byId.get('b')!.x);
  expect(byId.get('d')!.x).toBe(byId.get('e')!.x);
  expect(byId.get('isolated')!.x).toBe(byId.get('a')!.x);
  for (const [from, to] of [['a', 'b'], ['b', 'd']]) {
    expect(byId.get(to)!.x - (byId.get(from)!.x + 200)).toBeGreaterThanOrEqual(180 + 80);
  }
  expect(layoutDiagram(tab)).toEqual(result);
  expect(tab).toEqual(before);
  expect(result.flows).toEqual(tab.flows);
});

it('finds the first unoccupied first-column row with forty pixels of clearance without moving manual nodes', () => {
  const tab: DiagramTab = { id: 'tab', name: '', nodes: [], flows: [] };
  expect(nextNodePosition(tab)).toEqual({ x: 80, y: 220 });
  tab.nodes = [
    { ...defaultNode('external'), id: 'a', x: 100, y: 200 },
    { ...defaultNode('store'), id: 'b', x: 300, y: 400 },
    { ...defaultNode('system'), id: 'c', x: 700, y: 580 },
  ];
  const before = structuredClone(tab);
  expect(nextNodePosition(tab)).toEqual({ x: 80, y: 580 });
  expect(tab).toEqual(before);
});
