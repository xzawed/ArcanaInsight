import type { SharedKeys } from "../shared/keys";

/**
 * 일본어 사전 — PR-5에서 외부 번역가 작업으로 채울 예정.
 * 현재는 PR-5 출시 전까지 ko로 fallback (translations/index.ts).
 *
 * core 키만 우선 번역해 LanguageSwitcher·LocaleConfirmModal에서
 * 일본어 화자가 인식 가능하게 한다 (UX: ja 선택 가능 표시 보존).
 */
export const ja: Partial<SharedKeys> = {
  header: {
    "logo.alt": "ArcanaInsight",
    "nav.home": "ホーム",
    "nav.tarot": "タロット",
    "nav.saju": "四柱",
    "nav.shinjeom": "神占",
    "nav.mypage": "マイページ",
    "auth.login": "ログイン",
    "auth.logout": "ログアウト",
    "auth.signup": "新規登録",
    "theme.label": "テーマ",
    "theme.auto": "自動",
  },
  footer: {
    "tagline": "AIキャラクターとのタロット＆運勢リーディング",
    "section.services": "サービス",
    "section.info": "情報",
    "link.tarot": "タロット鑑定",
    "link.daily-card": "デイリーカード",
    "link.mypage": "マイページ",
    "link.terms": "利用規約",
    "link.privacy": "プライバシーポリシー",
    "copyright": "© ArcanaInsight",
  },
  home: {
    "hero.title": "タロット＆運勢リーディング",
    "hero.subtitle": "アニメキャラクターによる占いプラットフォーム",
    "hero.cta": "始める",
    "section.services": "サービス",
    "service.tarot.title": "タロット鑑定",
    "service.tarot.desc": "12人のキャラクターが語る深いタロット解釈",
    "service.saju.title": "四柱（四柱推命）",
    "service.saju.desc": "伝統的な四柱命理に基づいた精密な分析",
    "service.shinjeom.title": "神占相談",
    "service.shinjeom.desc": "霊的洞察による運勢リーディング",
    "section.daily-card": "デイリーカード",
    "daily-card.cta": "今日のカードを引く",
  },
  settings: {
    "page.title": "設定",
    "page.subtitle": "プロフィールと設定を管理する",
    "section.profile": "プロフィール",
    "section.preferences": "環境設定",
    "section.language": "言語",
    "section.language.desc": "表示言語を選択",
    "section.theme": "テーマ",
    "section.theme.desc": "表示テーマを選択",
    "section.account": "アカウント",
    "logout": "ログアウト",
    "saved": "保存済み",
  },
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
  tarot: {
    "result.title": "タロット鑑定結果",
    "result.overall": "総合解釈",
    "result.advice": "アドバイス",
    "result.cta": "私もタロット鑑定を受ける",
    "result.card.reversed": "逆位置",
    "result.no-reading": "鑑定結果を読み込めませんでした。",
  },
  saju: {
    "result.title": "四柱分析結果",
    "result.overall": "総合解釈",
    "result.topic": "テーマ別解釈",
    "result.advice": "アドバイス",
    "result.cta": "私も四柱分析を受ける",
  },
  shinjeom: {
    "result.title": "神占結果",
    "result.overall": "総合解釈",
    "result.topic": "テーマ別解釈",
    "result.advice": "アドバイス",
    "result.cta": "私も神占相談を受ける",
  },
};
