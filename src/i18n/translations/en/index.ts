import type { SharedKeys } from "../shared/keys";

/**
 * 영어 사전 — 1차 임시 번역 (외부 전문 번역가 의뢰 예정)
 * 마스터 플랜 PR-2 결정에 따라 외부 번역 도착 후 교체.
 * 미번역 키는 자동으로 ko fallback (translations/index.ts).
 */
export const en: Partial<SharedKeys> = {
  common: {
    "skip-link": "Skip to main content",
    "loading": "Loading…",
    "retry": "Retry",
    "back": "Back",
    "close": "Close",
    "language": "Language",
    "language.changed": "Language changed",
  },
  header: {
    "logo.alt": "ArcanaInsight",
    "nav.home": "Home",
    "nav.tarot": "Tarot",
    "nav.saju": "Saju",
    "nav.shinjeom": "Shinjeom",
    "nav.mypage": "My Page",
    "auth.login": "Sign in",
    "auth.logout": "Sign out",
    "auth.signup": "Sign up",
    "theme.label": "Theme",
    "theme.auto": "Auto",
  },
  footer: {
    "tagline": "Tarot & fortune readings with AI characters",
    "section.services": "Services",
    "section.info": "About",
    "link.tarot": "Tarot reading",
    "link.daily-card": "Daily card",
    "link.mypage": "My page",
    "link.terms": "Terms of service",
    "link.privacy": "Privacy policy",
    "copyright": "© ArcanaInsight",
  },
  home: {
    "hero.title": "Tarot & Fortune Reading",
    "hero.subtitle": "A divination platform with anime characters",
    "hero.cta": "Get started",
    "section.services": "Services",
    "service.tarot.title": "Tarot Reading",
    "service.tarot.desc": "Deep tarot interpretations told by 12 characters",
    "service.saju.title": "Saju (Four Pillars)",
    "service.saju.desc": "Precise analysis based on traditional Saju Myeongri",
    "service.shinjeom.title": "Shinjeom Consultation",
    "service.shinjeom.desc": "Fortune readings through spiritual insight",
    "section.daily-card": "Daily Card",
    "daily-card.cta": "Draw today's card",
  },
  settings: {
    "page.title": "Settings",
    "page.subtitle": "Manage your profile and preferences",
    "section.profile": "Profile",
    "section.preferences": "Preferences",
    "section.language": "Language",
    "section.language.desc": "Choose your display language",
    "section.theme": "Theme",
    "section.theme.desc": "Choose your display theme",
    "section.account": "Account",
    "logout": "Sign out",
    "saved": "Saved",
  },
  locale: {
    "modal.title": "Choose your language",
    "modal.description": "Use ArcanaInsight in your preferred language.",
    "modal.confirm": "Switch",
    "modal.keep-korean": "Keep Korean",
  },
};
