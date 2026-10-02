import { expect, it } from 'vitest';
import { parseProject } from './projectValidation';
import { makeProject } from './templates';

it('round-trips every domain field and discards unknown properties without inferring defaults', () => {
  const project = makeProject(true);
  Object.assign(project.meta, { author: '작성', reviewer: '검토', version: '2' });
  Object.assign(project.tabs[0].nodes[0], { name: '', owner: '소유자', zone: '영역', description: '설명', x: -42.5, y: 73 });
  Object.assign(project.tabs[0].flows[0], {
    sourceHandle: 'top', targetHandle: 'bottom', name: '전체 속성', dataItems: ['항목1', '항목2'], purpose: '목적',
    classification: 'restricted', transport: '전송', frequency: '주기', protection: 'other', protectionNote: '설명', notes: '메모',
  });
  project.revisions.push({ id: 'revision', version: '2', date: '2026-10-02', author: '작성', desc: '변경' });
  const source = JSON.parse(JSON.stringify(project));
  source.extra = 'discard'; source.tabs[0].nodes[0].extra = 'discard';
  const parsed = parseProject(source);
  expect(parsed).toEqual(project);
  source.tabs[0].flows[0].dataItems.push('external mutation');
  expect(parsed.tabs[0].flows[0].dataItems).toEqual(['항목1', '항목2']);
});

it('distinguishes foreign app and unsupported version', () => {
  const project = makeProject(false);
  expect(() => parseProject({ ...project, app: 'privacyflow' })).toThrow('이 앱에서 만든 백업 파일이 아닙니다');
  expect(() => parseProject({ ...project, schema: 2 })).toThrow('지원하지 않는 백업 버전입니다');
});

it('rejects missing fields, invalid enum/port, nonfinite coordinates, and dangling references', () => {
  const base = makeProject(true);
  const cases = [
    (p: typeof base) => { p.tabs = []; },
    (p: typeof base) => { p.activeTabId = 'absent'; },
    (p: typeof base) => { p.tabs[0].nodes[0].x = NaN; },
    (p: typeof base) => { p.tabs[0].flows[0].to = 'absent'; },
    (p: typeof base) => { Object.assign(p.tabs[0].flows[0], { sourceHandle: 'center' }); },
    (p: typeof base) => { Object.assign(p.tabs[0].nodes[0], { kind: 'other' }); },
    (p: typeof base) => { Reflect.deleteProperty(p.tabs[0].nodes[0], 'owner'); },
  ];
  for (const mutate of cases) {
    const project = structuredClone(base); mutate(project);
    expect(() => parseProject(project)).toThrow('백업 데이터 구조가 올바르지 않습니다');
  }
});

it('enforces one global ID namespace including revisions and rejects empty/reserved IDs', () => {
  for (const invalidId of ['', '__title', '__legend']) {
    const project = makeProject(true);
    project.tabs[0].nodes[0].id = invalidId;
    expect(() => parseProject(project)).toThrow();
  }
  const project = makeProject(true);
  project.revisions.push({ id: project.tabs[0].flows[0].id, version: '', date: '', author: '', desc: '' });
  expect(() => parseProject(project)).toThrow();
  project.revisions = [];
  project.tabs[0].flows[0].id = project.tabs[0].id;
  expect(() => parseProject(project)).toThrow();
});

it('retains parallel, reverse and self flows without changing handles', () => {
  const project = makeProject(true), tab = project.tabs[0], flow = tab.flows[0];
  tab.flows.push({ ...flow, id: 'parallel' }, { ...flow, id: 'reverse', from: flow.to, to: flow.from }, { ...flow, id: 'self', to: flow.from, sourceHandle: 'top', targetHandle: 'top' });
  expect(parseProject(project)).toEqual(project);
});
