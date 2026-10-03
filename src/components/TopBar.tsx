import { useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { layoutDiagram } from "../lib/layout";
import { parseProject } from "../lib/projectValidation";
import { undo, redo } from "../store/projectHistory";
import { MetaModal } from "./MetaModal";
import { TemplateChoice } from "./TemplateChoice";
import { ExportMenu } from "./ExportMenu";
import { StorageNotice } from "./StorageNotice";

export function TopBar() {
  const state = useProjectStore(), ui = useUiStore(), view = useReactFlow();
  const compact = useCompactLayout();
  const input = useRef<HTMLInputElement>(null);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"meta" | "new" | null>(null);
  useEffect(() => {
    if (!menuOpen || !compact) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen, compact]);
  const openModal = (next: 'meta' | 'new') => {
    if (compact) menuButton.current?.focus();
    setMenuOpen(false);
    setModal(next);
  };
  return <>
    <header className="topbar" ref={header}><b>InfoFlow</b><a className="author-credit" href="https://github.com/rebugui/infoflow" target="_blank" rel="noreferrer" title="GitHub 저장소 — rebugui/infoflow"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg><span className="credit-name">rebugui</span></a><span className="top-title" title={state.meta.docTitle}>{state.meta.docTitle}</span><small>정보 흐름도 편집기</small>
      <button title="Ctrl/Cmd+Z" onClick={() => ui.notify(undo() ? "실행을 취소했습니다" : "취소할 작업이 없습니다")}>실행 취소</button>
      <button title="Ctrl/Cmd+Shift+Z 또는 Ctrl/Cmd+Y" onClick={() => ui.notify(redo() ? "다시 실행했습니다" : "다시 실행할 작업이 없습니다")}>다시 실행</button>
      {compact && <button ref={menuButton} aria-expanded={menuOpen} aria-controls="topbar-actions" onClick={() => setMenuOpen(!menuOpen)}>메뉴</button>}
      <div id="topbar-actions" className="topbar-actions" role={compact ? 'region' : undefined} aria-label={compact ? '편집 메뉴' : undefined} hidden={compact && !menuOpen} inert={compact && !menuOpen}>
        <button onClick={() => openModal('meta')}>문서 정보</button>
        <button onClick={() => {
          if (!confirm("드래그로 조정한 위치가 자동 배치 위치로 바뀝니다. 계속할까요?")) return;
          state.updateTab(layoutDiagram(state.tabs.find((t) => t.id === state.activeTabId)!));
          setTimeout(() => void view.fitView({ padding: 0.15 }), 100);
        }}>자동 배치</button>
        <ExportMenu />
        <button onClick={() => { setMenuOpen(false); input.current?.click(); }}>JSON 불러오기</button>
        <button onClick={() => { if (confirm("현재 프로젝트가 교체됩니다. 필요한 경우 JSON 백업을 먼저 저장하세요. 계속할까요?")) openModal('new'); }}>새 프로젝트</button>
        {compact && <StorageNotice />}
      </div>
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
