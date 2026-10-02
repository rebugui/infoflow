import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";
import type { DataFlow } from "../../types";
import type { FlowRoute } from "../../lib/flowGeometry";
import { flowLines } from "../../lib/nodeTypes";
type FlowEdge = Edge<{ flow: DataFlow; geometry: FlowRoute }>;
export function DataFlowEdge({ data, markerEnd, selected }: EdgeProps<FlowEdge>) {
  if (!data) return null;
  const { flow, geometry } = data;
  const path = geometry.points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const lines = flowLines(flow);
  return <>
    <BaseEdge path={path} markerEnd={markerEnd} interactionWidth={18} style={{ stroke: selected ? "#2563EB" : "#404040", strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: geometry.routeWarning ? "6 4" : undefined }} />
    <foreignObject x={geometry.label.x - 90} y={geometry.label.y - 28} width={180} height={56} className="flow-label-object">
      <div className={`flow-edge-label${selected ? " selected" : ""}`} title={[...lines, ...(geometry.routeWarning ? ["끝점 노드 위치를 분리하세요"] : [])].join("\n")}>
        {lines.map((line, index) => <div key={index}>{line}</div>)}
        {geometry.routeWarning && <div className="warn">끝점 노드 위치를 분리하세요</div>}
      </div>
    </foreignObject>
  </>;
}
