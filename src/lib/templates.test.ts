import { expect, it } from 'vitest';
import { defaultFlow, splitItems } from './defaults';
import { makeProject } from './templates';
import { parseProject } from './projectValidation';

it('creates an explicitly synthetic five-node directional example with no invented security settings', () => {
  const project = makeProject(true), tab = project.tabs[0];
  expect(parseProject(project)).toEqual(project);
  expect(project.meta.docTitle).toBe('정보 흐름도 — 합성 예제');
  expect(tab.nodes.map((node) => [node.name, node.kind])).toEqual([
    ['고객', 'external'], ['주문 서비스', 'system'], ['주문 검증', 'process'], ['주문 저장소', 'store'], ['배송업체', 'external'],
  ]);
  expect(tab.flows.map((flow) => flow.name)).toEqual(['주문 접수', '검증 요청', '주문 저장', '배송 요청']);
  tab.flows.forEach((flow, index) => {
    expect([flow.from, flow.to]).toEqual([tab.nodes[index].id, tab.nodes[index + 1].id]);
    expect(flow).toMatchObject({ classification: 'unknown', protection: 'unknown', notes: '합성 예시 — 실제 운영 설정이 아닙니다' });
  });
  expect(tab.nodes.every((node) => node.description === '합성 예시 — 실제 운영 설정이 아닙니다')).toBe(true);
});

it('creates a valid empty first project and keeps drafts unspecified', () => {
  const project = makeProject(false);
  expect(parseProject(project)).toEqual(project);
  expect(project.tabs[0]).toMatchObject({ nodes: [], flows: [] });
  expect(defaultFlow('a', 'b')).toMatchObject({ name: '', dataItems: [], sourceHandle: null, targetHandle: null, classification: 'unknown', protection: 'unknown' });
  expect(splitItems(' 이름, 주소\n 주문번호, ,\n')).toEqual(['이름', '주소', '주문번호']);
});
