/**
 * 모든 namespace의 키 타입을 한곳에서 정의 → drift 차단.
 * ko 사전이 SSOT — en/ja는 Partial<SharedKeys>로 부분 번역 허용.
 */
export interface SharedKeys {
  common: {
    "skip-link": string;
    "loading": string;
    "retry": string;
    "back": string;
    "close": string;
    "language": string;
    "language.changed": string;
    "share.link-copied": string;
    "share.text-copied": string;
    // PR 9
    "back-arrow": string;
    "modal.close-aria": string;
    "card.back-alt": string;
    // PR 11
    "skin.preview-alt": string;
    "skip": string;
  };
  header: {
    "logo.alt": string;
    "nav.home": string;
    "nav.tarot": string;
    "nav.saju": string;
    "nav.shinjeom": string;
    "nav.mypage": string;
    "nav.settings": string;
    "auth.login": string;
    "auth.logout": string;
    "auth.signup": string;
    "theme.label": string;
    "theme.auto": string;
    // PR 8 — Header 잔존
    "theme.change-aria": string;
    "theme.settings-label": string;
    "user-menu-aria": string;
  };
  footer: {
    "tagline": string;
    "section.services": string;
    "section.info": string;
    "link.tarot": string;
    "link.daily-card": string;
    "link.mypage": string;
    "link.terms": string;
    "link.privacy": string;
    "copyright": string;
  };
  home: {
    "hero.title": string;
    "hero.subtitle": string;
    "hero.cta": string;
    "section.services": string;
    "service.tarot.title": string;
    "service.tarot.desc": string;
    "service.saju.title": string;
    "service.saju.desc": string;
    "service.shinjeom.title": string;
    "service.shinjeom.desc": string;
    "section.daily-card": string;
    "daily-card.cta": string;
    // 새로 추가
    "hero.today-character": string;
    "hero.title-line1": string;
    "hero.title-line2": string;
    "hero.desc": string;
    "hero.cta-tarot": string;
    "hero.cta-daily": string;
    "hero.scroll-hint": string;
    "service-flow.title": string;
    "service-flow.desc": string;
    "service-flow.step1.title": string;
    "service-flow.step1.desc": string;
    "service-flow.step2.title": string;
    "service-flow.step2.desc": string;
    "service-flow.step3.title": string;
    "service-flow.step3.desc": string;
    "service-flow.step4.title": string;
    "service-flow.step4.desc": string;
    "faq.title": string;
    "bottom-cta.title": string;
    "bottom-cta.desc": string;
    "bottom-cta.cta": string;
    "daily-card.title": string;
    "daily-card.tap-hint": string;
    "daily-card.tap-desc": string;
    "daily-card.share": string;
    "daily-card.reversed": string;
    "daily-card.upright": string;
    "daily-card.share-text": string;
    "daily-fortune.title": string;
    "daily-fortune.tap-hint": string;
    "daily-fortune.area.general": string;
    "daily-fortune.area.love": string;
    "daily-fortune.area.career": string;
    "daily-fortune.area.health": string;
    "daily-fortune.area.wealth": string;
    "gallery.title": string;
    "gallery.desc": string;
  };
  settings: {
    "page.title": string;
    "page.subtitle": string;
    "section.profile": string;
    "section.preferences": string;
    "section.language": string;
    "section.language.desc": string;
    "section.theme": string;
    "section.theme.desc": string;
    "section.account": string;
    "logout": string;
    "saved": string;
    // 새로 추가
    "back-home": string;
    "toast.saved": string;
    "section.card-skin": string;
    "section.card-skin.title": string;
    "section.card-skin.subtitle": string;
    "section.card-skin.toast": string;
    "section.gender-filter": string;
    "section.gender-filter.desc": string;
    "gender.all": string;
    "gender.female": string;
    "gender.male": string;
    "section.card-selection": string;
    "section.card-selection.desc": string;
    "card-confirm.label": string;
    "card-confirm.on": string;
    "card-confirm.off": string;
    "section.animation": string;
    "section.animation.desc": string;
    "reduced-motion.label": string;
    "reduced-motion.on": string;
    "reduced-motion.off": string;
    "section.privacy": string;
    "section.privacy.desc": string;
    "privacy.saved": string;
    "privacy.empty": string;
    "privacy.delete": string;
    "theme.auto-label": string;
    "theme.current": string;
    "section.card-style": string;
    "card-style.description": string;
    "card-style.auto-label": string;
    "card-style.auto-active": string;
  };
  locale: {
    "modal.title": string;
    "modal.description": string;
    "modal.confirm": string;
    "modal.keep-korean": string;
  };
  tarot: {
    "result.title": string;
    "result.overall": string;
    "result.advice": string;
    "result.direct-answer": string;
    "result.cta": string;
    "result.card.reversed": string;
    "result.card.reversed-badge": string;
    "result.no-reading": string;
    // 페이지 카피 (PR 5)
    "page.character-select.heading": string;
    "page.character-select.sub": string;
    "page.gender.all": string;
    "page.gender.female": string;
    "page.gender.male": string;
    "page.topic-select.heading": string;
    "page.topic-select.back": string;
    "page.spread-select.heading": string;
    "page.spread-select.sub": string;
    "page.spread-select.cards-suffix": string;
    "page.spread-select.back": string;
    "page.spread-select.user-info-btn": string;
    "page.spread-select.free-question-label": string;
    "page.spread-select.free-question-optional": string;
    "page.spread-select.free-question-placeholder": string;
    // 세션 페이지 (PR 6)
    "session.share.title": string;
    "session.position-fallback": string;
    "session.msg.pick-cards-prompt": string;
    "session.msg.confirm-final": string;
    "session.msg.confirm-card": string;
    "session.msg.next-card": string;
    "session.msg.different-card": string;
    "session.msg.cards-gathered": string;
    "session.msg.connection-failed": string;
    "session.msg.no-result": string;
    "session.msg.partial-result": string;
    "session.msg.overall-header": string;
    "session.msg.advice-header": string;
    "session.btn.proceed": string;
    "session.btn.confirm": string;
    "session.btn.pick-again": string;
    "session.btn.try-again": string;
    "session.btn.new-session": string;
    "session.btn.share": string;
    "session.btn.back-to-spread": string;
    "session.error.reading": string;
    "session.shuffle.fallback-text": string;
    "session.shuffle.skip-aria": string;
    // PR #265 — 진행 인디케이터 + 에러 세부 라벨
    "session.progress.connecting": string;
    "session.progress.analyzing": string;
    "session.progress.long-wait": string;
    "session.progress.elapsed": string;
    "session.error.title": string;
    "session.error.timeout": string;
    "section.symbolism": string;
    "section.situation": string;
    "section.action": string;
  };
  saju: {
    "result.title": string;
    "result.overall": string;
    "result.topic": string;
    "result.advice": string;
    "result.cta": string;
    // 페이지 카피 (PR 5)
    "page.character-select.heading": string;
    "page.character-select.sub": string;
    "page.section.time-range": string;
    "page.section.area": string;
    "page.section.free-question": string;
    "page.section.free-question-optional": string;
    "page.section.free-question-placeholder": string;
    "page.monthly-toggle": string;
    "page.start.active": string;
    "page.start.inactive": string;
    "page.back-info": string;
    "page.after-info-msg": string;
    // 세션 페이지 (PR 6)
    "session.share.title": string;
    "session.msg.init-formal": string;
    "session.msg.init-casual": string;
    "session.msg.complete-formal": string;
    "session.msg.complete-casual": string;
    // 사주 차트 (PR 7)
    "chart.title": string;
    "chart.day-master": string;
    "chart.strong": string;
    "chart.weak": string;
    "chart.yongsin": string;
    "chart.yongsin-label": string;
    "chart.ohaeng-title": string;
    "chart.daeun-title": string;
    "chart.current": string;
    "chart.yearly": string;
    "chart.pillar.hour": string;
    "chart.pillar.day": string;
    "chart.pillar.month": string;
    "chart.pillar.year": string;
    "chart.age-range": string;
    "chart.age-until": string;
    "section.structure": string;
    "section.elements": string;
    "section.fortune": string;
    "section.guidance": string;
  };
  mypage: {
    "page.title": string;
    "profile.error": string;
    "profile.error-detail-fallback": string;
    "profile.favorite-character": string;
    "profile.default-nickname": string;
    "stats.total": string;
    "stats.frequent-card": string;
    "stats.frequent-card-empty": string;
    "stats.last-reading": string;
    "stats.last-reading-empty": string;
    "history.title": string;
    "history.empty.title": string;
    "history.empty.desc": string;
    "history.empty.cta": string;
    "history.no-result": string;
    "service.tarot": string;
    "service.saju": string;
    "service.shinjeom": string;
    "date.today": string;
    "date.yesterday": string;
    "date.days-ago": string;
    "date.weeks-ago": string;
    // PR 9 — FavoriteCharacterSelector
    "favorite.saving": string;
    "favorite.unset": string;
    "favorite.action.change": string;
    "favorite.action.set": string;
    "favorite.action.unset": string;
    "favorite.modal-title": string;
  };
  character: {
    "page.service-select": string;
    "page.not-found": string;
    "service.tarot.label": string;
    "service.tarot.desc": string;
    "service.saju.label": string;
    "service.saju.desc": string;
    "service.shinjeom.label": string;
    "service.shinjeom.desc": string;
    "service.fortune.label": string;
    "service.fortune.desc": string;
  };
  "user-info": {
    "title.saju": string;
    "title.tarot": string;
    "title.shinjeom": string;
    "subtitle.saju": string;
    "subtitle.tarot.with-name": string;
    "subtitle.tarot.default": string;
    "subtitle.shinjeom": string;
    "submit.saju": string;
    "submit.tarot": string;
    "submit.shinjeom": string;
    "name-placeholder": string;
    "gender.male": string;
    "gender.female": string;
    "gender.other": string;
    "save-info.with-account": string;
    "save-info.local": string;
    "saved-info-banner": string;
    "label.name": string;
    "label.birthdate": string;
    "label.gender": string;
    "label.birth-time": string;
    "label.mbti": string;
    "label.optional": string;
    "mbti.none": string;
    "save-warning": string;
  };
  "birth-time": {
    "hour-placeholder": string;
    "minute-placeholder": string;
    "unknown": string;
  };
  "privacy-consent": {
    "title": string;
    "items.label": string;
    "items.content": string;
    "purpose.label": string;
    "purpose.content": string;
    "retention.label": string;
    "retention.content": string;
    "note": string;
    "policy-link": string;
    "cancel": string;
    "agree": string;
  };
  auth: {
    "login.fallback-error": string;
    "page.subtitle": string;
    "page.error-title": string;
    "page.google-button": string;
    "page.guest-hint": string;
  };
  share: {
    "result-button-default": string;
    "copied-button": string;
  };
  chat: {
    "default-character-name": string;
    "empty-prompt": string;
  };
  api: {
    "rate-limit-error": string;
    "reading-error": string;
    "ai-config-error": string;
    "daily-card-error": string;
    "daily-fortune-error": string;
  };
  meta: {
    "site-description": string;
  };
  shinjeom: {
    "result.title": string;
    "result.overall": string;
    "result.topic": string;
    "result.advice": string;
    "result.cta": string;
    "page.character-select.heading": string;
    "page.character-select.sub": string;
    "page.topic-select.heading": string;
    "page.topic-select.sub": string;
    "page.topic-select.back": string;
    "topic.general.label": string;
    "topic.general.desc": string;
    "topic.love.label": string;
    "topic.love.desc": string;
    "topic.wealth.label": string;
    "topic.wealth.desc": string;
    "topic.career.label": string;
    "topic.career.desc": string;
    "topic.health.label": string;
    "topic.health.desc": string;
    "topic.auspicious.label": string;
    "topic.auspicious.desc": string;
    // 세션 페이지 (PR 6)
    "session.msg.preparing-result": string;
    "session.input.placeholder.first": string;
    "session.input.placeholder.followup": string;
    "session.btn.send": string;
    "session.btn.get-result": string;
    "session.btn.share": string;
    "session.share.title": string;
    "section.spiritual": string;
    "section.current": string;
    "section.obstacles": string;
    "section.future": string;
  };
}

export type Namespace = keyof SharedKeys;
export type FlatDict = Record<string, string>;

/** 사전 1개를 평탄한 key/value 객체로 변환. `header.nav.tarot` 형태로 키 결합. */
export function flatten<NS extends Namespace>(ns: NS, dict: SharedKeys[NS]): FlatDict {
  const out: FlatDict = {};
  for (const [key, value] of Object.entries(dict)) {
    out[`${ns}.${key}`] = value as string;
  }
  return out;
}
