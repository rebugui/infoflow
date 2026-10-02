import type { FlowNode, Project } from '../types';
import { defaultFlow, defaultNode } from './defaults';
import { layoutDiagram } from './layout';

export function makeProject(template: boolean): Project {
  const note = '합성 예시 — 실제 운영 설정이 아닙니다';
  const definitions: [FlowNode['kind'], string][] = [
    ['external', '고객'], ['system', '주문 서비스'], ['process', '주문 검증'],
    ['store', '주문 저장소'], ['external', '배송업체'],
  ];
  const nodes: FlowNode[] = template ? definitions.map(([kind, name]) => ({
    ...defaultNode(kind), id: crypto.randomUUID(), name, description: note,
  })) : [];
  const flowDefinitions = [
    { name: '주문 접수', dataItems: ['이름', '주소', '주문번호'] },
    { name: '검증 요청', dataItems: ['주문번호'] },
    { name: '주문 저장', dataItems: ['이름', '주소', '주문번호'] },
    { name: '배송 요청', dataItems: ['이름', '주소', '주문번호'] },
  ];
  const tab = layoutDiagram({
    id: crypto.randomUUID(), name: '흐름도 1', nodes,
    flows: template ? flowDefinitions.map((definition, i) => ({
      ...defaultFlow(nodes[i].id, nodes[i + 1].id), ...definition,
      id: crypto.randomUUID(), notes: note,
    })) : [],
  });
  return {
    app: 'infoflow', schema: 1,
    meta: { docTitle: template ? '정보 흐름도 — 합성 예제' : '정보 흐름도', version: '1.0', date: new Date().toLocaleDateString('en-CA'), author: '', reviewer: '' },
    revisions: [], tabs: [tab], activeTabId: tab.id,
  };
}
