# 코딩 컨벤션

ArcanaInsight 코드 작성 시 반드시 준수해야 하는 스타일 규칙입니다.

---

## 1. 일반 규칙

- **주석·커밋 메시지**: 한국어 사용
- **함수·변수명**: 영어 camelCase
- **컴포넌트명**: PascalCase
- **파일명**: kebab-case (컴포넌트 파일은 PascalCase)

---

## 2. TypeScript

- `any` 타입 사용 금지 — 명시적 타입 정의 필수
- `interface` 우선 사용 (`type alias`는 유니온/인터섹션에만)
- `strict` 모드 활성화

---

## 3. React / Next.js

- **서버 컴포넌트 기본** — 클라이언트 상태·이벤트가 필요할 때만 `'use client'` 명시
- **named export** 사용 (default export 지양)
- **Props**: `interface`로 정의
- **`React.memo`**: 부모 re-render로 불필요하게 재렌더링되는 무거운 컴포넌트에 적용. props 비교가 복잡하면 두 번째 인자 `areEqual` 함수 사용 (CardSpread 참조).
- **`next/dynamic`**: 초기 번들 크기 감소 목적으로 세션 페이지 진입 전 필요하지 않은 컴포넌트에 적용. Canvas rAF를 사용하는 컴포넌트는 `ssr: false` 필수. 적용 예: `CardDeck`, `CardSpread`, `ReadingProgressIndicator`.
- **`ThemeDropdown`**: `src/components/layout/ThemeDropdown.tsx` — `variant="desktop"|"mobile"` + `onClose` prop. Header에서 데스크탑/모바일 각각 분리 인스턴스 사용.
- **`color-utils`**: `src/lib/color-utils.ts` — `hexToRgba(hex, alpha, fallback?)`, `hexToRgbBase(hex)` 공통 유틸. 컴포넌트 내 inline hex 변환 금지, 반드시 이 모듈 사용.

---

## 4. 스타일링

- Tailwind CSS 유틸리티 클래스 우선
- 복잡한 애니메이션: Framer Motion 사용
- **다크 모드 기본** (점술/타로의 신비로운 분위기)
- **커스텀 컬러** (`globals.css` `@theme` 블록):
  - `arcana-bg`, `arcana-surface`, `arcana-card`, `arcana-border`
  - `arcana-purple`, `arcana-indigo`, `arcana-gold`, `arcana-silver`
  - `arcana-text`, `arcana-muted`

---

## 5. 의존성 버전 관리

| 규칙 | 대상 |
|------|------|
| **메이저 업그레이드 금지** (사용자 승인 필요) | Next.js, React, Framer Motion, Tailwind CSS, Zustand |
| **마이너·패치 허용** | 보안 패치, 버그 픽스 |
| **버전 고정** | `pnpm@10.33.0` — lock 파일 및 Docker 스크립트 동기화 |
| **버전 고정** | `@playwright/test@^1.59.1` — CI는 ubuntu 러너 + `npx playwright install`. `mcr.microsoft.com/playwright:v1.59.1-noble`는 로컬 Docker E2E 전용 이미지(CI는 컨테이너 미사용) |

---

## 6. 커밋 메시지 Prefix 규칙

| prefix | 용도 |
|--------|------|
| `feat:` | 새 기능 추가 |
| `fix:` | 버그 수정 |
| `docs:` | 문서 변경 (CLAUDE.md, README 등) |
| `chore:` | 빌드·설정·스크립트 변경 |
| `refactor:` | 기능 변경 없는 코드 구조 개선 |
| `style:` | UI/스타일 변경 (기능 무관) |
| `test:` | 테스트 추가·수정 |
| `merge:` | 브랜치 머지 커밋 |

---

## 7. Git 브랜치 전략

- `main`: 프로덕션 브랜치 (Railway 자동 배포, `master` 미사용)
- `feat/*`: 기능 개발
- `fix/*`: 버그 수정
- `docs/*`: 문서 변경
- `chore/*`: 설정·정리

**`main` 직접 push 금지** — PR을 통해 머지

---

## 8. Path Alias

`@/*` → `./src/*` (`tsconfig.json`)

---

## 9. 작업 시 추가 주의사항

- 타로 카드 데이터: `src/data/` 정적 관리 (DB 조회 금지)
- 홈 페이지 데이터: `src/data/home/` 정적 관리
- `.env` 파일 절대 커밋 금지 (Railway 환경변수로 관리)
- DB 마이그레이션: `supabase/migrations/` 번호 순서 유지 (002 결번)

## i18n 다국어

UI 텍스트 추가·변경 시 한글 하드코딩 금지. `t()` 호출로 분리:
- 클라이언트 컴포넌트: `useT()` 훅 (`src/i18n/useT.ts`)
- 서버 컴포넌트·라우트: `t(key, locale)` 직접 호출 + `getRequestLocale()`로 locale 결정
- 키 추가 절차: `shared/keys.ts` 타입 → `ko/index.ts` SSOT → `en/index.ts` 직역 → `ja/index.ts` 직역 (외부 번역가 미사용)

상세 컨벤션: [`i18n-style.md`](i18n-style.md) / 인프라: [`../architecture/i18n.md`](../architecture/i18n.md)
