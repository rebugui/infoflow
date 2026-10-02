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
  expect(result.nodes.map(({ x, y }) => [x, y])).toEqual([[80, 220], [380, 220], [380, 400], [680, 220], [680, 400], [80, 400]]);
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
