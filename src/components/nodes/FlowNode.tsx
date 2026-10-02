import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { FlowNode as FlowNodeModel } from "../../types";
import { NODE_WIDTH, NODE_HEIGHT, nodeStyle, nodeLines } from "../../lib/nodeTypes";

export function NodeShape({ shape, color, stroke = "#404040" }: { shape: "rect" | "roundRect" | "ellipse" | "cylinder"; color: string; stroke?: string }) {
  return <svg className="flow-shape" viewBox={`0 0 ${NODE_WIDTH} ${NODE_HEIGHT}`} aria-hidden="true">
    {shape === "ellipse" ? <ellipse cx={100} cy={56} rx={99} ry={55} fill={color} stroke={stroke} strokeWidth={1.5} />
      : shape === "cylinder" ? <g fill={color} stroke={stroke} strokeWidth={1.5}><path d="M1 15 C1 -3 199 -3 199 15 L199 97 C199 115 1 115 1 97 Z" /><ellipse cx={100} cy={15} rx={99} ry={14} /></g>
      : <rect x={1} y={1} width={198} height={110} rx={shape === "roundRect" ? 14 : 0} fill={color} stroke={stroke} strokeWidth={1.5} />}
  </svg>;
}
export function FlowNode({ data, selected }: NodeProps<Node<{ node: FlowNodeModel; warning: boolean }>>) {
  const style = nodeStyle(data.node), lines = nodeLines(data.node);
  return <div className={`flow-node shape-${style.shape}`} aria-label={lines.join(" · ")}>
    <NodeShape shape={style.shape} color={style.color} stroke={selected ? "#2563EB" : "#404040"} />
    <div className="flow-node-label">{lines.map((line, index) => index === 0 ? <strong key={index} title={line}>{line}</strong> : <span key={index} title={line}>{line}</span>)}</div>
    {data.warning && <span className="badge warn" title="검토 필요" role="img" aria-label="검토 필요" />}
    {([['top', Position.Top], ['right', Position.Right], ['bottom', Position.Bottom], ['left', Position.Left]] as const).map(([id, position]) => <Handle key={id} type="source" position={position} id={id} />)}
  </div>;
}
