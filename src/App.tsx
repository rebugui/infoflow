import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ResponsiveWorkspace } from "./components/ResponsiveWorkspace";
import { TopBar } from "./components/TopBar";
import { Toast } from "./components/Toast";
import { DiagramTabs } from "./components/DiagramTabs";
import { TemplateChoice } from "./components/TemplateChoice";
import { StorageNotice } from "./components/StorageNotice";
import { projectSnapshot, useProjectStore } from "./store/useProjectStore";
import { useUiStore } from "./store/useUiStore";
import { registerStorageEvents, unlockStorage } from "./lib/projectStorage";
import { download, fileName } from "./lib/download";
import { HistoryShortcuts } from "./components/HistoryShortcuts";
import { useCompactLayout } from "./hooks/useCompactLayout";
import "./styles.css";

export default function App() {
  const ui = useUiStore();
  const compact = useCompactLayout();
  const allowReload = useRef(false);
  const [welcome, setWelcome] = useState(() => ["empty", "unavailable"].includes(useUiStore.getState().storageStatus));
  useEffect(() => registerStorageEvents(), []);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (allowReload.current || useUiStore.getState().saveStatus === 'saved') return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, []);
  const backup = () => {
    const project = projectSnapshot();
    download(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), fileName(project, '전체', 'json'));
  };
  if (ui.storageStatus === "blocked") return <main className="recovery-screen"><section className="recovery-card">
    <h1>InfoFlow · 저장 데이터 복구 필요</h1>
    <p>이 브라우저의 저장 데이터가 손상되었거나 지원하지 않는 백업 형식입니다. 원본은 덮어쓰지 않고 보존했습니다.</p>
    <p>먼저 원본 문자열을 내려받아 보관하세요. 새 프로젝트를 시작하면 이 앱의 기존 저장 데이터를 교체합니다.</p>
    <button onClick={() => { if (ui.rawBackup !== null) download(new Blob([ui.rawBackup], { type: "text/plain;charset=utf-8" }), "InfoFlow_손상저장원본.txt"); }}>원본 문자열 다운로드</button>
    <button className="danger" onClick={() => {
      if (!confirm("기존 저장 데이터를 새 빈 프로젝트로 교체합니다. 원본을 다운로드했는지 확인하세요. 계속할까요?")) return;
      unlockStorage(); useProjectStore.getState().resetProject(false); setWelcome(false);
    }}>새 프로젝트로 시작</button>
    <p className="muted">원본 백업과 JSON에는 평문 데이터가 포함될 수 있으므로 안전하게 보관하세요.</p>
  </section></main>;
  return <ReactFlowProvider><div className="app">
    <HistoryShortcuts /><TopBar />
    {ui.saveStatus !== 'saved' && <div className="save-banner" role="alert">
      {ui.saveStatus === 'conflict' ? <><span>다른 탭에서 데이터가 변경되었습니다. 이 탭의 자동 저장을 중지했습니다.</span> <button onClick={backup}>현재 편집 JSON 백업</button> <button onClick={() => {
        if (!confirm('현재 편집 내용을 백업했나요? 저장된 최신 내용을 불러오면 이 탭의 미저장 편집이 사라집니다.')) return;
        allowReload.current = true;
        window.location.reload();
      }}>최신 내용 다시 불러오기</button></> : <>
        <span>{ui.saveStatus === 'saving' ? '저장 중…' : ui.saveStatus === 'unsupported' ? '이 브라우저에서는 안전한 자동 저장을 사용할 수 없습니다 — JSON 백업을 저장하세요' : '자동 저장 실패 — JSON 백업을 저장하세요'}</span>
        <button onClick={backup}>현재 편집 JSON 백업</button>
      </>}
    </div>}
    <DiagramTabs /><ResponsiveWorkspace />
    {!compact && <StorageNotice />}
    <Toast />
    {welcome && <TemplateChoice title="InfoFlow 시작하기" onClose={() => { useProjectStore.getState().resetProject(false); setWelcome(false); }} onChoose={(template) => { useProjectStore.getState().resetProject(template); setWelcome(false); }} />}
  </div></ReactFlowProvider>;
}
