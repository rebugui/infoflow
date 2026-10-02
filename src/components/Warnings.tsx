import { useMemo } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { validate } from "../lib/validate";
import { flowPath } from "../lib/flowGeometry";
export function Warnings() {
  const tab = useProjectStore((s) => s.tabs.find((t) => t.id === s.activeTabId)!);
  const warnings = useMemo(() => [...validate(tab), ...tab.flows.filter((flow) => flowPath(tab, flow).routeWarning).map((flow) => ({ level: "warn" as const, flowId: flow.id, nodeId: undefined, message: "끝점 노드 위치를 분리하세요" }))], [tab]);
  const focus = useUiStore((s) => s.focus);
  return <section className="warnings"><h2>검토 필요사항 <span className="count">{warnings.length}</span></h2>
    {warnings.length ? <div className="item-list">{warnings.map((warning, index) => <button className={warning.level} key={`${warning.nodeId ?? warning.flowId}:${index}`} onClick={() => { const id = warning.nodeId ?? warning.flowId; if (id) focus(id); }}>{warning.level === "warn" ? "검토 필요" : "안내"} · {warning.message}</button>)}</div>
      : <p className="preview">설정된 검토 규칙에서 누락을 찾지 못했습니다</p>}
  </section>;
}
