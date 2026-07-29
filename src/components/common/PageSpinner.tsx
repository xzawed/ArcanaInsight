// min-h-screen(100vh) 금지 — main의 pt-14 pb-14와 합산돼 유령 스크롤을 만든다(PR #428).
// chrome(헤더 3.5rem + 모바일 네비 3.5rem)를 차감한 dvh를 쓴다.
// PageSpinner는 외부 lazy 이미지를 렌더하지 않으므로 dvh min-height가 허용된다
// (docs/conventions/cross-platform.md §1).
export function PageSpinner() {
  return (
    <div className="min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
    </div>
  );
}
