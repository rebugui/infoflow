import type { Classification, DataFlow, DiagramTab, FlowNode, InfoNodeKind, Protection } from '../types';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 112;
export type NodeShape = 'rect' | 'roundRect' | 'ellipse' | 'cylinder';
type Definition = { label: string; shape: NodeShape; color: string };
export const kindDefs: Record<InfoNodeKind, Definition> = {
  external: { label: '외부 주체', shape: 'rect', color: '#E5E7EB' },
  process: { label: '처리', shape: 'ellipse', color: '#DBEAFE' },
  system: { label: '시스템', shape: 'roundRect', color: '#CCFBF1' },
  store: { label: '저장소', shape: 'cylinder', color: '#EDE9FE' },
};
export const classificationLabels: Record<Classification, string> = {
  unknown: '미지정', public: '공개', internal: '내부', confidential: '기밀', restricted: '극비',
};
export const protectionLabels: Record<Protection, string> = {
  unknown: '미지정', none: '없음', tls: 'TLS', vpn: 'VPN', other: '기타',
};
export const nodeStyle = (node: FlowNode): Definition => kindDefs[node.kind];
export const nodeLines = (node: FlowNode): string[] => [
  node.name || '미지정', kindDefs[node.kind].label,
  `담당자: ${node.owner || '미지정'}`, `영역: ${node.zone || '미지정'}`,
];
export const flowLines = (flow: DataFlow): string[] => [
  flow.name || '미지정', flow.dataItems.slice(0, 3).join(', ') || '미지정',
  `${classificationLabels[flow.classification]} · ${flow.transport || '미지정'}`,
];
export function legendItems(_tab: DiagramTab): Definition[] { return Object.values(kindDefs); }
