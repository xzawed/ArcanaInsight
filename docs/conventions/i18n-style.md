# i18n 코딩 컨벤션

ArcanaInsight 다국어 작업 시 준수할 코딩·번역 컨벤션. 인프라 개요는 [`docs/architecture/i18n.md`](../architecture/i18n.md) 참고.

## 호출 패턴

### 클라이언트 컴포넌트 (`"use client"`)
```tsx
import { useT } from "@/i18n/useT";

export function MyComponent() {
  const { t, locale } = useT();
  return <button>{t("header.nav.tarot")}</button>;
}
```

### 서버 컴포넌트 / 비-React 모듈
```typescript
import { t as translate } from "@/i18n/translations";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";

export default async function Page() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return <h1>{translate("home.hero.title", locale)}</h1>;
}
```

### 라우트 핸들러 (API)
```typescript
import { getRequestLocale } from "@/i18n/server-locale";

export async function POST(req: NextRequest) {
  const locale = await getRequestLocale();
  await db.insert("sessions", { ..., locale });
}
```

## 키 네이밍

- 형식: `namespace.key` 또는 `namespace.section.key`
- namespace: 5개 (`common`·`header`·`footer`·`home`·`settings`·`locale`)
- 케이스: dot-notation, kebab-case 단어 분리 (`skip-link`, `nav.daily-card`)
- 예: `header.nav.tarot`, `footer.section.services`, `home.hero.title`, `locale.modal.confirm`

## 번역 추가 절차

1. **타입 먼저**: `src/i18n/translations/shared/keys.ts`의 `SharedKeys` 인터페이스에 키 추가
2. **ko 사전 채움**: `src/i18n/translations/ko/index.ts` (SSOT, 모든 키 필수)
3. **en 사전 임시 영문**: `src/i18n/translations/en/index.ts` (외부 번역가 의뢰 대기 중에는 1차 직역)
4. **ja 사전 PR-5 일괄**: 현재는 `common`·`locale` namespace만 1차 채움 (나머지는 ko fallback)

## SSR 규칙 (필수 준수)

- `useEffect` 내 `setLocale()` 동기 호출 금지
- 패턴: `setTimeout(() => setLocale(initial), 0); return () => clearTimeout(t)`
- `LocaleConfirmModal`·`LocaleProvider` 참고
- 미준수 시 `react-hooks/set-state-in-effect` lint 위반 + hydration error #418

## 우선 외부 번역 영역 (직접 영문화 금지)

- 캐릭터 12명 페르소나 5필드 (PR-4): 화법 시그니처 보존 필수
- 카드 80장 `name`·`meanings` (PR-3): 도메인 표준 영문명
- 사주 천간·지지·오행·십성·신살 (PR-3): 학술 vs 대중 톤 결정
- 신점 한국 무속 용어 (PR-6): 한국어+로마자+영문 해설 하이브리드

## E2E 셀렉터

- 한글 `hasText` regex 금지 — i18n 텍스트 변경에 깨짐
- `data-testid` 부여 우선:
  - LanguageSwitcher: 데스크탑 `lang-option-${l}`, 모바일 `mobile-lang-option-${l}`
  - 데스크탑 nav: `desktop-nav` (Header 컨테이너)
  - 모바일 nav: `mobile-nav-${name}` (각 항목)
  - LocaleConfirmModal: `locale-confirm-modal`, `locale-confirm-keep`, `locale-confirm-accept`
  - Toast: `toast`

## SonarCloud 측정 정책

- 정적 사전 ko/en/ja: `sonar.coverage.exclusions` 명시 제외 (로직 0)
- React 클라이언트 (LocaleProvider·useT): exclusion (E2E 커버 영역)
- server-locale.ts: exclusion (Next.js headers API 의존, 단위 테스트는 vitest setup mock)
- vitest `coverage.include`와 `sonar.coverage.exclusions` 항상 동기 (PR-A 표류 정리 교훈)

## 외부 번역 의뢰 자료

- `docs/i18n/glossary.md` (PR-3 작성): 사주 십성·오방색·타로 표준 영문 용어집
- `docs/i18n/character-voice-guide.md` (PR-4 작성): 12 캐릭터 영문·일문 화법 시그니처
- `docs/i18n/character-qa-checklist.md` (PR-4 작성): 페르소나 톤 일관성 QA

## 참조

- 인프라 개요: [`docs/architecture/i18n.md`](../architecture/i18n.md)
- LayoutSwitcher 분리 규칙: [`layout-rules.md`](layout-rules.md)
- 코딩 스타일 통합: [`coding-style.md`](coding-style.md)
- E2E 정책: [`../workflow/e2e-testing.md`](../workflow/e2e-testing.md)
