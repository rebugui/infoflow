import { useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { TemplateChoice } from "./TemplateChoice";
import { Modal } from "./Modal";
export function DiagramTabs() {
  const state = useProjectStore();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);
  return <>
    <nav className="diagram-tabs" aria-label="흐름도 탭">
      {state.tabs.map((tab) => <div key={tab.id} className={`tab ${state.activeTabId === tab.id ? "active" : ""}`} onContextMenu={(event) => { event.preventDefault(); setContext({ id: tab.id, x: event.clientX, y: event.clientY }); }}>
        <button aria-current={state.activeTabId === tab.id ? "page" : undefined} onClick={() => state.setActiveTab(tab.id)} onDoubleClick={() => setEditing({ id: tab.id, name: tab.name })}>{tab.name}</button>
        <button aria-label={`${tab.name} 이름 변경`} title="이름 변경" onClick={() => setEditing({ id: tab.id, name: tab.name })}>이름</button>
        <button aria-label={`${tab.name} 복제`} title="복제" onClick={() => state.dupTab(tab.id)}>복제</button>
        <button aria-label={`${tab.name} 삭제`} disabled={state.tabs.length === 1} onClick={() => { if (confirm(`“${tab.name}” 장을 삭제할까요?`)) state.removeTab(tab.id); }}>×</button>
      </div>)}
      <button className="add-tab" aria-label="흐름도 추가" onClick={() => setAdding(true)}>＋</button>
      <span className="tabs-hint">더블클릭: 이름 · 우클릭: 복제</span>
    </nav>
    {adding && <TemplateChoice title="새 흐름도" onClose={() => setAdding(false)} onChoose={(template) => { state.addTab(template); setAdding(false); }} />}
    {editing && <Modal title="흐름도 이름" onClose={() => setEditing(null)}><form className="form" onSubmit={(event) => { event.preventDefault(); if (!editing.name.trim()) return; state.renameTab(editing.id, editing.name.trim()); setEditing(null); }}><label>장 이름<input required autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><button className="primary" type="submit">이름 적용</button></form></Modal>}
    {context && <div className="context-backdrop" onClick={() => setContext(null)} onKeyDown={(event) => { if (event.key === "Escape") setContext(null); }}>
      <div className="context-menu" style={{ left: Math.max(0, Math.min(context.x, window.innerWidth - 150)), top: Math.max(0, Math.min(context.y, window.innerHeight - 100)) }}>
        <button autoFocus onClick={() => state.dupTab(context.id)}>흐름도 복제</button>
        <button onClick={() => { const tab = state.tabs.find((t) => t.id === context.id); if (tab) setEditing({ id: tab.id, name: tab.name }); }}>이름 변경</button>
      </div>
    </div>}
  </>;
}
