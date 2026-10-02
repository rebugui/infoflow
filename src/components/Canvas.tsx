import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, ConnectionMode, useNodesState, useReactFlow } from "@xyflow/react";
import type { OnSelectionChangeParams } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { kindDefs } from "../lib/nodeTypes";
import { defaultNode, defaultFlow } from "../lib/defaults";
import type { InfoNodeKind, Port } from "../types";
import { nodeTypes, edgeTypes, sceneNodes, sceneEdges } from "./scene";
export function Canvas() {
  const state = useProjectStore(), ui = useUiStore(), view = useReactFlow();
  const tab = state.tabs.find((t) => t.id === state.activeTabId)!;
  const source = useMemo(() => sceneNodes(tab, state.meta), [tab, state.meta]);
  const [nodes, setNodes, onNodesChange] = useNodesState(source);
  const [edgeSelection, setEdgeSelection] = useState({ tabId: tab.id, epoch: ui.editEpoch, ids: new Set<string>() });
  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedFlows }: OnSelectionChangeParams) => {
    const selected = [...selectedNodes, ...selectedFlows].filter((item) => !item.id.startsWith("__"));
    const current = useUiStore.getState();
    if (selected.length && !selected.some((item) => item.id === current.selected)) current.select(selected[0].id);
  }, []);
  useEffect(() => {
    setNodes((current) => {
      const active = useUiStore.getState().selected;
      const selected = new Set(active ? (current.some((node) => node.id === active && node.selected) ? current.filter((node) => node.selected).map((node) => node.id) : [active]) : []);
      return source.map((node) => ({ ...node, selected: node.selectable !== false && selected.has(node.id) }));
    });
  }, [source, setNodes, ui.selected]);
  useEffect(() => {
    if (!ui.focusId) return;
    const current = useProjectStore.getState();
    const active = current.tabs.find((item) => item.id === current.activeTabId)!;
    const linked = active.flows.find((f) => f.id === ui.focusId);
    const ids = linked ? [linked.from, linked.to] : [ui.focusId];
    const focused = ids.flatMap((id) => { const node = view.getNode(id); return node ? [node] : []; });
    if (focused.length) void view.fitView({ nodes: focused, padding: 0.5, duration: 350, maxZoom: 1 });
  }, [ui.focusId, view]);
  useEffect(() => {
    const timer = setTimeout(() => void view.fitView({ padding: 0.18 }), 100);
    return () => clearTimeout(timer);
  }, [tab.id, view]);
  const positions = new Map(nodes.map((node) => [node.id, node.position]));
  const renderTab = { ...tab, nodes: tab.nodes.map((node) => { const position = positions.get(node.id); return position ? { ...node, ...position } : node; }) };
  const edges = sceneEdges(renderTab, ui.selected).map((edge) => ({ ...edge, selected: edge.selected || (edgeSelection.tabId === tab.id && edgeSelection.epoch === ui.editEpoch && edgeSelection.ids.has(edge.id)) }));
  return <main className="canvas" aria-label="정보 흐름도 캔버스">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onSelectionChange={onSelectionChange}
      onEdgesChange={(changes) => setEdgeSelection((current) => {
        const ids = new Set(current.tabId === tab.id && current.epoch === ui.editEpoch ? current.ids : []);
        for (const change of changes) {
          if (change.type === "select") { if (change.selected) ids.add(change.id); else ids.delete(change.id); }
          else if (change.type === "remove") ids.delete(change.id);
        }
        return { tabId: tab.id, epoch: ui.editEpoch, ids };
      })}
      connectionMode={ConnectionMode.Loose} minZoom={0.08} maxZoom={2} fitView deleteKeyCode={["Backspace", "Delete"]} multiSelectionKeyCode={["Meta", "Control", "Shift"]}
      onConnect={(connection) => {
        const ports = ["top", "bottom", "left", "right"];
        const sourceHandle = ports.includes(connection.sourceHandle ?? "") ? connection.sourceHandle as Port : null;
        const targetHandle = ports.includes(connection.targetHandle ?? "") ? connection.targetHandle as Port : null;
        const id = state.addFlow({ ...defaultFlow(connection.source, connection.target), sourceHandle, targetHandle });
        ui.select(id); ui.notify("초안 흐름을 만들었습니다. 오른쪽에서 이름과 속성을 입력하세요.");
      }}
      onNodeDragStop={(_, __, moved) => {
        const current = useProjectStore.getState(), active = current.tabs.find((t) => t.id === current.activeTabId)!;
        const movedPositions = new Map(moved.map((node) => [node.id, node.position]));
        current.updateTab({ ...active, nodes: active.nodes.map((node) => { const position = movedPositions.get(node.id); return position ? { ...node, ...position } : node; }) });
      }}
      onNodeClick={(_, node) => { if (!node.id.startsWith("__")) ui.select(node.id); }}
      onEdgeClick={(_, edge) => ui.select(edge.id)}
      onPaneClick={() => { ui.select(null); setEdgeSelection({ tabId: tab.id, epoch: ui.editEpoch, ids: new Set() }); }}
      onBeforeDelete={async ({ nodes: removedNodes, edges: removedEdges }) => document.querySelector("dialog[open]") ? false : { nodes: removedNodes.filter((node) => !node.id.startsWith("__")), edges: removedEdges }}
      onDelete={({ nodes: removedNodes, edges: removedEdges }) => {
        const current = useProjectStore.getState(), active = current.tabs.find((t) => t.id === current.activeTabId)!;
        const nodeIds = new Set(removedNodes.map((node) => node.id)), edgeIds = new Set(removedEdges.map((edge) => edge.id));
        current.updateTab({ ...active, nodes: active.nodes.filter((node) => !nodeIds.has(node.id)), flows: active.flows.filter((flow) => !edgeIds.has(flow.id) && !nodeIds.has(flow.from) && !nodeIds.has(flow.to)) });
        ui.select(null); setEdgeSelection({ tabId: tab.id, epoch: ui.editEpoch, ids: new Set() });
      }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
      onDrop={(event) => {
        event.preventDefault();
        const kind = event.dataTransfer.getData("application/infoflow") as InfoNodeKind;
        if (!Object.hasOwn(kindDefs, kind)) return;
        const current = useProjectStore.getState(), active = current.tabs.find((t) => t.id === current.activeTabId)!;
        let index = 1;
        while (active.nodes.some((node) => node.name === `${kindDefs[kind].label} ${index}`)) index++;
        const position = view.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        ui.select(current.addNode({ ...defaultNode(kind), name: `${kindDefs[kind].label} ${index}`, ...position }));
      }}>
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <MiniMap position="top-right" style={{ width: 150, height: 100 }} pannable zoomable />
      <Controls />
    </ReactFlow>
    <div className="canvas-hint">핸들 연결: 방향 흐름 · Shift+선택: 여러 항목 · Delete: 삭제 · Ctrl/Cmd+Z: 실행 취소</div>
  </main>;
}
