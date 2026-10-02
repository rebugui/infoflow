import { useState, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { layoutDiagram } from "../lib/layout";
import { parseProject } from "../lib/projectValidation";
import { undo, redo } from "../store/projectHistory";
import { MetaModal } from "./MetaModal";
import { TemplateChoice } from "./TemplateChoice";
import { ExportMenu } from "./ExportMenu";
export function TopBar() {
  const state = useProjectStore(), ui = useUiStore(), view = useReactFlow();
  const input = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<"meta" | "new" | null>(null);
  return <>
    <header className="topbar"><b>InfoFlow</b><span className="top-title" title={state.meta.docTitle}>{state.meta.docTitle}</span><small>정보 흐름도 편집기</small>
      <button onClick={() => setModal("meta")}>문서 정보</button>
      <button title="Ctrl/Cmd+Z" onClick={() => ui.notify(undo() ? "실행을 취소했습니다" : "취소할 작업이 없습니다")}>실행 취소</button>
      <button title="Ctrl/Cmd+Shift+Z 또는 Ctrl/Cmd+Y" onClick={() => ui.notify(redo() ? "다시 실행했습니다" : "다시 실행할 작업이 없습니다")}>다시 실행</button>
      <button onClick={() => {
        if (!confirm("드래그로 조정한 위치가 자동 배치 위치로 바뀝니다. 계속할까요?")) return;
        state.updateTab(layoutDiagram(state.tabs.find((t) => t.id === state.activeTabId)!));
        setTimeout(() => void view.fitView({ padding: 0.15 }), 100);
      }}>자동 배치</button>
      <ExportMenu />
      <button onClick={() => input.current?.click()}>JSON 불러오기</button>
      <button onClick={() => { if (confirm("현재 프로젝트가 교체됩니다. 필요한 경우 JSON 백업을 먼저 저장하세요. 계속할까요?")) setModal("new"); }}>새 프로젝트</button>
      <input hidden aria-label="InfoFlow JSON 백업 파일" ref={input} type="file" accept=".json,application/json" onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        try {
          const project = parseProject(JSON.parse(await file.text()));
          if (!confirm("백업 파일로 현재 프로젝트를 교체합니다. 필요한 경우 현재 JSON 백업을 먼저 저장하세요. 복원할까요?")) return;
          state.replaceProject(project); ui.select(null); ui.notify("프로젝트를 복원했습니다. 실행 취소로 이전 프로젝트를 되돌릴 수 있습니다.");
          setTimeout(() => void view.fitView({ padding: 0.15 }), 100);
        } catch (error) { ui.notify(error instanceof Error ? error.message : "JSON 복원 실패"); }
      }} />
    </header>
    {modal === "meta" && <MetaModal onClose={() => setModal(null)} />}
    {modal === "new" && <TemplateChoice title="새 InfoFlow 프로젝트" onClose={() => setModal(null)} onChoose={(template) => { state.resetProject(template); ui.select(null); setModal(null); setTimeout(() => void view.fitView({ padding: 0.15 }), 100); }} />}
  </>;
}
