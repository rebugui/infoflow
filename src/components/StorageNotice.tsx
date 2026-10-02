export function StorageNotice() {
  return <details className="storage-notice"><summary>저장·보안 안내 · 브라우저 로컬 자동 저장</summary><p>편집 데이터는 이 브라우저에서만 처리하며 외부 API나 AI 서비스로 전송하지 않습니다. 로그인·암호화 저장·서버 동기화는 제공하지 않습니다. localStorage와 JSON은 평문이며 같은 브라우저 프로필·origin의 다른 스크립트가 접근할 수 있습니다. 앱별 저장 키 분리는 충돌 방지이지 접근통제가 아닙니다. 민감한 실제 값 대신 항목명과 합성 예시를 사용하세요. 동시 편집은 업데이트된 버전끼리만 보호됩니다. 구버전 탭과 함께 편집하지 마세요.</p></details>;
}
