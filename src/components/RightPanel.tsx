import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { NodeForm, FlowForm } from "./Forms";
import { Warnings } from "./Warnings";
export function RightPanel() {
  const state = useProjectStore(), ui = useUiStore();
  const tab = state.tabs.find((t) => t.id === state.activeTabId)!;
  const node = tab.nodes.find((n) => n.id === ui.selected), flow = tab.flows.find((f) => f.id === ui.selected);
  const unspecified = tab.nodes.reduce((count, item) => count + Number(!item.name.trim()) + Number(!item.owner.trim()), 0)
    + tab.flows.reduce((count, item) => count + Number(!item.name.trim()) + Number(!item.dataItems.length) + Number(item.classification === "unknown") + Number(item.protection === "unknown"), 0);
  return <aside className="right panel" aria-label="선택 속성과 검토 필요사항">
    <section><h2>선택 속성</h2>
      {node ? <NodeForm key={`${node.id}:${ui.editEpoch}`} initial={node} submitLabel="변경 적용" onSave={(patch) => { state.updateNode(node.id, patch); ui.notify("변경 사항을 적용했습니다"); }} />
        : flow ? <FlowForm key={`${flow.id}:${ui.editEpoch}`} initial={flow} nodes={tab.nodes} submitLabel="변경 적용" onSave={(patch) => { state.updateFlow(flow.id, patch); ui.notify("변경 사항을 적용했습니다"); }} />
        : <div className="empty">캔버스나 목록에서 구성 요소 또는 정보 흐름을 선택하세요.</div>}
      {(node || flow) && <button className="danger" onClick={() => { if (node) state.removeNode(node.id); if (flow) state.removeFlow(flow.id); ui.select(null); }}>선택 항목 삭제</button>}
    </section>
    <Warnings />
    <section><h2>현재 장 요약</h2><dl className="summary-counts"><dt>구성 요소</dt><dd>{tab.nodes.length}</dd><dt>정보 흐름</dt><dd>{tab.flows.length}</dd><dt>미지정 필수 검토 항목</dt><dd>{unspecified}</dd></dl><p className="muted">검토 경고는 저장을 차단하지 않으며 ISO 27001 인증이나 법적 적합성 판정이 아닙니다.</p></section>
  </aside>;
}
