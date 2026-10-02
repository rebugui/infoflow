import type { Node, NodeProps } from "@xyflow/react";
import { NodeShape } from "./FlowNode";
type LegendItem = { label: string; shape: "rect" | "roundRect" | "ellipse" | "cylinder"; color: string };
export function LegendNode({ data }: NodeProps<Node<{ items: LegendItem[] }>>) {
  return <div className="legend"><strong>InfoFlow · 범례</strong>
    <div className="legend-types">{data.items.map((item) => <div key={item.label}><span className="legend-shape"><NodeShape shape={item.shape} color={item.color} /></span>{item.label}</div>)}</div>
    <div className="legend-links"><span>→ 정보 이동 방향</span><span>점선: 끝점 배치 검토</span></div>
    <p className="legend-note">분류: 공개 / 내부 / 기밀 / 극비 / 미지정<br />도면은 인증·법적 적합성을 보장하지 않습니다.</p>
  </div>;
}
