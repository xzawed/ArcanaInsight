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
  };
  header: {
    "logo.alt": string;
    "nav.home": string;
    "nav.tarot": string;
    "nav.saju": string;
    "nav.shinjeom": string;
    "nav.mypage": string;
    "auth.login": string;
    "auth.logout": string;
    "auth.signup": string;
    "theme.label": string;
    "theme.auto": string;
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
    "result.cta": string;
    "result.card.reversed": string;
    "result.no-reading": string;
  };
  saju: {
    "result.title": string;
    "result.overall": string;
    "result.topic": string;
    "result.advice": string;
    "result.cta": string;
  };
  shinjeom: {
    "result.title": string;
    "result.overall": string;
    "result.topic": string;
    "result.advice": string;
    "result.cta": string;
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
