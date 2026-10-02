import { useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { kindDefs } from "../lib/nodeTypes";
import { defaultNode } from "../lib/defaults";
import { nextNodePosition } from "../lib/layout";
import type { InfoNodeKind } from "../types";
import { NodeForm, FlowForm } from "./Forms";

export function LeftPanel() {
  const state = useProjectStore(), ui = useUiStore();
  const tab = state.tabs.find((t) => t.id === state.activeTabId)!;
  const [mode, setMode] = useState("구성 요소");
  const [generation, reset] = useState(0);
  function addPalette(kind: InfoNodeKind) {
    const current = useProjectStore.getState();
    const active = current.tabs.find((t) => t.id === current.activeTabId)!;
    let index = 1;
    while (active.nodes.some((n) => n.name === `${kindDefs[kind].label} ${index}`)) index++;
    ui.select(current.addNode({ ...defaultNode(kind), name: `${kindDefs[kind].label} ${index}`, ...nextNodePosition(active) }));
  }
  return <aside className="left panel" aria-label="구성 요소와 정보 흐름">
    <div className="panel-heading"><h2>정보 흐름도</h2><span className="count">{tab.nodes.length}개 구성 요소</span></div>
    <div className="switcher">{["구성 요소", "정보 흐름"].map((value) => <button key={value} className={mode === value ? "active" : ""} aria-pressed={mode === value} onClick={() => setMode(value)}>{value}</button>)}</div>
    <div className="panel-content">
      {mode === "구성 요소" ? <>
        <details open><summary>팔레트 · 클릭해 추가 / 캔버스로 드래그</summary>
          <div className="palette">{(Object.keys(kindDefs) as InfoNodeKind[]).map((kind) => <button key={kind} draggable style={{ borderLeftColor: kindDefs[kind].color }} onDragStart={(e) => { e.dataTransfer.setData("application/infoflow", kind); e.dataTransfer.effectAllowed = "move"; }} onClick={() => addPalette(kind)}>{kindDefs[kind].label}</button>)}</div>
        </details>
        <div className="item-list">{tab.nodes.map((node) => <button key={node.id} className={ui.selected === node.id ? "selected" : ""} onClick={() => ui.focus(node.id)}><strong>{node.name || "미지정"}</strong><small>{kindDefs[node.kind].label} · 담당자 {node.owner || "미지정"}</small><small>영역 {node.zone || "미지정"}</small></button>)}</div>
        {!tab.nodes.length && <p className="muted">팔레트 또는 아래 폼으로 첫 구성 요소를 추가하세요.</p>}
        <h3>새 구성 요소</h3>
        <NodeForm key={`${tab.id}:${generation}:${ui.editEpoch}`} onSave={(value) => {
          const current = useProjectStore.getState();
          const active = current.tabs.find((t) => t.id === current.activeTabId)!;
          ui.select(current.addNode({ ...value, ...nextNodePosition(active) }));
          reset((v) => v + 1); ui.notify("구성 요소를 추가했습니다");
        }} />
      </> : <>
        <p className="muted">출발 → 도착 방향의 흐름입니다. 캔버스 연결점을 드래그하면 이름 없는 초안이 생성됩니다. 역방향은 별도로 추가하세요.</p>
        <div className="item-list">{tab.flows.map((flow) => <button key={flow.id} className={ui.selected === flow.id ? "selected" : ""} onClick={() => ui.focus(flow.id)}><strong>{flow.name || "미지정 흐름"}</strong><small>{tab.nodes.find((n) => n.id === flow.from)?.name || "미지정"} → {tab.nodes.find((n) => n.id === flow.to)?.name || "미지정"}</small></button>)}</div>
        <h3>새 정보 흐름</h3>
        <FlowForm key={`${tab.id}:${generation}:${ui.editEpoch}`} nodes={tab.nodes} onSave={(value) => { ui.select(state.addFlow(value)); reset((v) => v + 1); ui.notify("정보 흐름을 추가했습니다"); }} />
      </>}
    </div>
  </aside>;
}
