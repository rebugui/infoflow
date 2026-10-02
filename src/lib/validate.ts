import type { DiagramTab, Warning } from '../types';

export function validate(tab: DiagramTab): Warning[] {
  const warnings: Warning[] = [];
  const nodes = new Map(tab.nodes.map((node) => [node.id, node]));
  for (const node of tab.nodes) {
    if (!node.name.trim()) warnings.push({ level: 'warn', nodeId: node.id, message: '구성 요소 이름 미지정' });
    if (!node.owner.trim()) warnings.push({ level: 'warn', nodeId: node.id, message: '구성 요소 담당자 미지정' });
  }
  for (const flow of tab.flows) {
    const warn = (message: string) => warnings.push({ level: 'warn', flowId: flow.id, message });
    if (!flow.name.trim()) warn('정보 흐름명 미지정');
    if (!flow.dataItems.some((item) => item.trim())) warn('정보 흐름 데이터 항목 미지정');
    if (flow.classification === 'unknown') warn('정보 분류 미지정');
    if (flow.protection === 'unknown') warn('전송 보호조치 미지정');
    const from = nodes.get(flow.from), to = nodes.get(flow.to);
    if (flow.protection === 'none') {
      if (from?.zone.trim() && to?.zone.trim() && from.zone.trim() !== to.zone.trim()) warn('영역 간 전송 보호조치 확인 필요');
      if (flow.classification === 'confidential' || flow.classification === 'restricted') warn('중요 정보의 전송 보호조치 확인 필요');
    }
  }
  return warnings;
}
