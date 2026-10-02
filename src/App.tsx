import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { LeftPanel } from "./components/LeftPanel";
import { RightPanel } from "./components/RightPanel";
import { TopBar } from "./components/TopBar";
import { Toast } from "./components/Toast";
import { DiagramTabs } from "./components/DiagramTabs";
import { TemplateChoice } from "./components/TemplateChoice";
import { useProjectStore } from "./store/useProjectStore";
import { useUiStore } from "./store/useUiStore";
import { unlockStorage } from "./lib/projectStorage";
import { download } from "./lib/download";
import { HistoryShortcuts } from "./components/HistoryShortcuts";
import "./styles.css";
export default function App() {
  const ui = useUiStore();
  const [welcome, setWelcome] = useState(() => ["empty", "unavailable"].includes(useUiStore.getState().storageStatus));
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
    {(ui.saveError || ui.storageStatus === "unavailable") && <div className="save-banner" role="alert">자동 저장 실패 — JSON 백업을 저장하세요. 현재 편집 상태는 메모리에 유지되며 창을 닫으면 사라질 수 있습니다.</div>}
    <DiagramTabs /><div className="workspace"><LeftPanel /><Canvas /><RightPanel /></div>
    <details className="storage-notice"><summary>저장·보안 안내 · 브라우저 로컬 자동 저장</summary><p>편집 데이터는 이 브라우저에서만 처리하며 외부 API나 AI 서비스로 전송하지 않습니다. 로그인·암호화 저장·서버 동기화는 제공하지 않습니다. localStorage와 JSON은 평문이며 같은 브라우저 프로필·origin의 다른 스크립트가 접근할 수 있습니다. 앱별 저장 키 분리는 충돌 방지이지 접근통제가 아닙니다. 민감한 실제 값 대신 항목명과 합성 예시를 사용하세요.</p></details>
    <Toast />
    {welcome && <TemplateChoice title="InfoFlow 시작하기" onClose={() => { useProjectStore.getState().resetProject(false); setWelcome(false); }} onChoose={(template) => { useProjectStore.getState().resetProject(template); setWelcome(false); }} />}
  </div></ReactFlowProvider>;
}
