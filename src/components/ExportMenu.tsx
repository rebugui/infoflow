import { useState } from "react";
import { projectSnapshot } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { download, fileName } from "../lib/download";
import { exportPptx } from "../lib/export/pptx";
import { exportPdf } from "../lib/export/pdf";
import { exportImage } from "../lib/export/image";
type Format = "pptx-current" | "pptx-all" | "png" | "svg" | "pdf" | "json";
export function ExportMenu() {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const notify = useUiStore((s) => s.notify);
  async function run(format: Format) {
    setOpen(false); setBusy(true);
    try {
      const project = projectSnapshot();
      if (format === "json") download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), fileName(project, "전체", "json"));
      else if (format === "pptx-current" || format === "pptx-all") {
        await exportPptx(project, format === "pptx-all" ? "all" : project.activeTabId);
      } else if (format === "pdf") {
        await exportPdf(project);
      } else {
        await exportImage(project, format);
      }
      notify("내보내기가 완료되었습니다");
    } catch (error) { notify(`내보내기 실패: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  }
  return <div className="export-menu" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button disabled={busy} aria-expanded={open} onClick={() => setOpen(!open)}>{busy ? "내보내는 중…" : "내보내기 ▾"}</button>
    {open && <div className="dropdown" aria-label="내보내기 형식">
      {([
        ["pptx-current", "PPTX (현재 장 · 상세 속성 포함)"], ["pptx-all", "PPTX (전체 장 · 상세 속성 포함)"],
        ["png", "PNG (현재 장 · 흰 배경 2배)"], ["svg", "SVG (현재 장 · foreignObject)"], ["pdf", "PDF (전체 장 · A3 가로)"], ["json", "JSON 백업 저장 (전체 원본)"],
      ] as const).map(([format, label]) => <button key={format} onClick={() => void run(format)}>{label}</button>)}
      <p className="muted">PNG·SVG·PDF는 도면 출력입니다. 전체 상세 속성은 JSON·PPTX에 보존됩니다. SVG는 foreignObject 지원 뷰어가 필요합니다.</p>
      <p className="muted">JSON은 편집 가능한 평문 원본입니다. 실제 개인정보 값 대신 항목명만 작성하고 안전하게 보관하세요.</p>
    </div>}
  </div>;
}
