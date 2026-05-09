# 업무 유형별 파일 가이드 (Task Playbooks)

반복 업무 시 불필요한 탐색 없이 바로 시작할 수 있도록 유형별 필수 파일을 정리합니다.
에이전트가 있는 경우 에이전트를 **우선 활용**합니다.

---

## 새 캐릭터 추가

1. `src/data/characters/index.ts` — 캐릭터 메타데이터 추가
2. `src/data/characters/waiting-lines.ts` — 대기 대사 추가
3. `src/types/character.ts` — 타입 확인
4. `public/images/characters/[id]/nukki/` — 원본 이미지 7종 배치
5. `public/images/characters/[id]/nukki-enhanced/` — 운영 표시용 2배 보정본 생성
6. → `.claude/agents/character-add.md` 에이전트 활용

참고: [`docs/architecture/data-model.md`](../architecture/data-model.md) — 캐릭터 이미지 경로 규칙

---

## 새 운세 서비스(DivinationService) 추가

1. `src/services/core/ai-provider.ts` — 인터페이스 확인
2. `src/services/tarot/tarot-service.ts` — 기존 구현체 참조 패턴
3. `src/app/api/tarot/` — API 라우트 구조 참조
4. `src/services/core/prompt-builder.ts` — `buildCharacterHeader()` 재사용
5. `src/services/core/text-cleaner.ts` — `extractFallbackText()` JSON-recovery 재사용
6. `src/services/core/http-utils.ts` — `withAbortTimeout` / `readSseLines` Provider 공통 유틸
7. `src/services/core/circuit-breaker.ts` — fallback 서킷 (필요 시)
8. → `.claude/agents/divination-scaffold.md` 에이전트 활용

---

## 새 페이지 추가

1. `src/app/layout.tsx` — 루트 레이아웃 확인
2. `src/components/layout/Header.tsx` — 네비게이션 링크 추가
3. `src/components/layout/MobileNav.tsx` — 모바일 탭 추가 여부 확인
4. [`docs/conventions/layout-rules.md`](../conventions/layout-rules.md) — 5:5 규칙 준수
5. → `.claude/agents/page-builder.md` 에이전트 활용

---

## 테마·스타일 변경

1. `src/app/globals.css` — `@theme` 블록, `arcana-*` 커스텀 컬러
2. `src/hooks/useTheme.ts` — 7종 테마 로직
3. → `.claude/agents/theme-creator.md` 에이전트 활용

---

## 카드 스킨 추가·변경

1. `src/data/skins/index.ts` — 스킨 정의
2. `src/lib/storage/index.ts` — `getCardImageUrl()` 경로 로직
3. `scripts/generate-skin-images.ts` → `scripts/upload-skin-images.ts`
4. → `.claude/agents/skin-manager.md` 에이전트 활용

---

## AI 프롬프트 수정

1. `src/services/core/prompt-builder.ts` — 공통 프롬프트 빌더
   - `buildCharacterHeader(character, subtitle?)` — 타로·사주·신점 공통 캐릭터 헤더
2. `src/services/[service]/[service]-service.ts` — 서비스별 프롬프트
3. `src/services/core/fallback-provider.ts` — Grok→Claude fallback 동작 확인
   - `CircuitBreaker` (`circuit-breaker.ts`) — 서킷 상태 공유
4. `src/services/core/text-cleaner.ts` — `extractFallbackText()` JSON 파싱 실패 회수

참고: [`docs/architecture/ai-infrastructure.md`](../architecture/ai-infrastructure.md)

---

## DB 스키마 변경

1. `supabase/migrations/` — 마지막 번호 확인 후 다음 번호로 신규 파일 생성
2. `src/lib/db/schema/index.ts` — Drizzle 스키마 동기화 (PostgreSQL 모드)
3. `src/lib/db/types.ts` — DbClient 인터페이스 수정 여부 확인

참고: [`docs/architecture/db-abstraction.md`](../architecture/db-abstraction.md)

---

## 코드 품질 검증

```bash
pnpm type-check && pnpm lint && pnpm build
```

→ `.claude/agents/quality-gate.md` 에이전트 활용

---

## E2E 테스트 추가·수정

1. `e2e/` — 관련 spec 파일
2. `playwright.config.ts` — 디바이스 프로필 확인
3. [`docs/workflow/e2e-testing.md`](e2e-testing.md) — 실행 방법 + 셀렉터 패턴

**Mobile Android 셀렉터 주의사항** (오탐 패턴):

| 패턴 | 문제 | 해결 |
|------|------|------|
| `page.locator("img").first()` | Header 아이콘(hidden) 먼저 resolve | `img[src*="keyword"]` 사용 |
| `text=타로` (짧은 텍스트) | Header/MobileNav hidden 링크 먼저 resolve | `h1`, `h2` 또는 전체 레이블 사용 |
| `overflow-y-auto` 내 요소 | 스크롤 밖이면 `toBeVisible()` hidden 판정 | 상단 헤딩 체크 또는 `scrollIntoViewIfNeeded()` |
| `<Image fill>` lazy-loaded 이미지 | off-viewport → `naturalWidth === 0` | `getBoundingClientRect`으로 교차 여부 확인 |

Next.js `<Image>` DOM 렌더링: `/_next/image?url=%2Fpath` → `src*="/path/"` 슬래시 포함 매칭 불가, `src*="keyword"`로 한정.

---

## 새 API 라우트 추가

1. [`docs/conventions/zod-schemas.md`](../conventions/zod-schemas.md) — Zod 스키마 먼저 정의 필수
2. [`docs/architecture/auth-abstraction.md`](../architecture/auth-abstraction.md) — API 보안 패턴 (Rate Limit → Zod → Auth → IDOR)
3. `src/lib/validation/api-schemas.ts` — 스키마 추가
4. `src/lib/request-utils.ts` — 공통 헬퍼 재사용:
   - `jsonError(msg, status)` — JSON 오류 응답
   - `SSE_HEADERS` — SSE 스트리밍 헤더
   - `getClientIp(headers)` — rate-limit IP 추출
   - `pickFields(obj, keys)` — 응답 whitelist 직렬화
5. `src/__tests__/api/` — 단위 테스트 배치 (`src/test-helpers/api-route-setup.ts` 헬퍼 활용)

> **테스트 파일 위치 필수**: `src/app/api/*/route.test.ts`는 vitest가 수집하지 않음 → 반드시 `src/__tests__/api/` 아래 배치.

---

## 환경변수 추가

1. `src/lib/env.ts` — getter 함수 추가 (하드코딩 금지)
2. `docs/operations/env-variables.md` — 문서화
3. `scripts/check-env-docs.ts` — 정합성 자동 검증 (`pnpm exec tsx scripts/check-env-docs.ts`)
4. **Railway 대시보드** — 서비스 → Variables 탭에서 실제 환경변수 등록 (코드 변경만으론 배포 미반영)
