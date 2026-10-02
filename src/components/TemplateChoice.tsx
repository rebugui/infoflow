import { Modal } from "./Modal";
import { useUiStore } from "../store/useUiStore";
export function TemplateChoice({ title, onChoose, onClose }: { title: string; onChoose: (template: boolean) => void; onClose: () => void }) {
  const { storageStatus, saveStatus } = useUiStore();
  const automatic = storageStatus !== "unavailable" && !["failed", "conflict", "unsupported"].includes(saveStatus);
  return <Modal title={title} onClose={onClose}>
    <p className="muted">외부 주체, 처리, 시스템, 저장소를 배치하고 정보가 이동하는 방향을 기록하세요. {automatic ? "변경 사항은 이 브라우저에 자동 저장됩니다. 구버전 탭과 동시에 편집하지 마세요." : "안전한 자동 저장을 사용할 수 없습니다. 현재 편집 내용을 JSON 백업으로 저장하세요."}</p>
    <div className="template-choices">
      <button onClick={() => onChoose(true)}><strong>기본 합성 예제</strong><span>고객 → 주문 서비스 → 주문 검증 → 주문 저장소 → 배송업체<br />구성 요소 5개 · 방향 흐름 4개<br />합성 예시 — 실제 운영 설정이 아닙니다.</span></button>
      <button onClick={() => onChoose(false)}><strong>빈 캔버스</strong><span>구성 요소와 정보 흐름을 직접 추가합니다.<br />타이틀 블록 · 범례 자동 생성</span></button>
    </div>
    <p className="muted template-notice">도면과 검토 경고는 ISO 27001 인증이나 법적 적합성을 보장하지 않습니다. 저장 데이터와 JSON은 암호화되지 않은 평문입니다. 실제 민감한 값 대신 데이터 항목명만 기록하세요.</p>
  </Modal>;
}
