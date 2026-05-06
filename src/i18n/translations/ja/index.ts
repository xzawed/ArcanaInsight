import type { SharedKeys } from "../shared/keys";

/**
 * 일본어 사전 — PR-5에서 외부 번역가 작업으로 채울 예정.
 * 현재는 PR-5 출시 전까지 ko로 fallback (translations/index.ts).
 *
 * core 키만 우선 번역해 LanguageSwitcher·LocaleConfirmModal에서
 * 일본어 화자가 인식 가능하게 한다 (UX: ja 선택 가능 표시 보존).
 */
export const ja: Partial<SharedKeys> = {
  common: {
    "skip-link": "メインコンテンツへ移動",
    "loading": "読み込み中…",
    "retry": "再試行",
    "back": "戻る",
    "close": "閉じる",
    "language": "言語",
    "language.changed": "言語が変更されました",
  },
  locale: {
    "modal.title": "言語を選択してください",
    "modal.description": "ArcanaInsightをお好みの言語でご利用いただけます。",
    "modal.confirm": "変更",
    "modal.keep-korean": "韓国語のまま",
  },
};
