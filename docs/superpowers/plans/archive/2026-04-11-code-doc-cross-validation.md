# 전체 코드 ↔ 문서 상호 검증 + 문서 최적화 계획

## Context

DB Provider 마이그레이션 회고 + CLAUDE.md 최신화(Part 1~3)는 완료됨 (main `ff264eb`, worktree `efbad8e`).
사용자의 새 요청: "전체코드와 전체문서를 상호 검증을 해주시고 완료되면 전체 문서 최적화 작업을 수행해주세요"

3개 Explore 에이전트로 전체 코드 vs CLAUDE.md 상호 검증 완료. 아래는 발견된 불일치 및 최적화 항목.

**작업 대상**: main 브랜치 CLAUDE.md (`ff264eb` 기준, 이미 DB Provider 반영 완료)
**참고**: worktree CLAUDE.md는 구버전이지만, PR 머지 시 main 기준으로 덮어씌워지므로 main만 수정

---

## Part 1: 코드 ↔ 문서 상호 검증 결과

### 불일치 항목 (수정 필요)

| # | 유형 | 상세 | 심각도 |
|---|------|------|--------|
| 1 | 위치 오류 | `[...nextauth]/`가 `src/app/auth/` 아래로 문서화되어 있지만, 실제 위치는 `src/app/api/auth/[...nextauth]/route.ts` | 중 |
| 2 | 유령 디렉토리 | `src/components/tarot/`가 "(현재 비어있음)"으로 문서화되어 있지만 디렉토리 자체가 존재하지 않음 | 저 |
| 3 | 미문서화 파일 | `src/components/common/Icon.tsx` 존재하지만 common/ 설명에 누락 | 저 |
| 4 | 미문서화 파일 | `src/data/error-messages.ts` 존재하지만 data/ 트리에 누락 | 저 |
| 5 | 미문서화 스크립트 | `scripts/generate-icons.ts` 존재하지만 scripts/ 목록에 누락 | 저 |
| 6 | 운영 체계 표 | "6단계 프로세스"로 되어 있지만 실제로는 7단계 (코드 변경 프로세스 섹션은 이미 7단계로 수정됨) | 저 |
| 7 | API 트리 누락 | `src/app/api/auth/[...nextauth]/` 라우트가 api/ 하위 트리에 미표기 | 저 |

### 일치 확인 (수정 불필요)

- DB 추상화 레이어 (`src/lib/db/`): 5개 파일 모두 일치
- Auth 추상화 레이어 (`src/lib/auth/`): 3개 파일 모두 일치
- Storage 추상화 (`src/lib/storage/`): 일치
- API 라우트 11개: 모두 `getDb()` 사용, `createClient()` 직접 사용 없음 (어댑터 내부 제외)
- 클라이언트 `createClient()` 사용: Header, LoginClient, LogoutButton, UserInfoForm, useFavoriteCharacter — 모두 허용됨 (클라이언트 Supabase Auth)
- Services 디렉토리: 4개 서브디렉토리, 모든 파일 일치
- Hooks: 10개 파일 모두 일치
- E2E 테스트: 19개 spec 파일 일치 (+ helpers/sse-mock.ts 헬퍼)
- 마이그레이션: 8개 파일 (001, 003-009) 일치, 002 결번
- Tech stack 버전: Next.js 16.2.1, React 19.2.4, Tailwind v4, Framer Motion v12.38, Zustand v5.0, pnpm 10.33.0 — 모두 정확
- package.json 스크립트: 7개 모두 일치
- railway.toml, drizzle.config.ts: 존재 확인
- GitHub workflows: deploy.yml, weekly-qa.yml, qa-recheck.yml 3개 일치
- 환경변수: DB_PROVIDER, POSTGRES_URL, GOOGLE_CLIENT_ID/SECRET 등 모두 코드에서 사용 확인

---

## Part 2: CLAUDE.md 수정 계획 (7개 Edit)

대상 파일: `f:\DEVELOPMENT\SOURCE\CLAUDE\ArcanaInsight\CLAUDE.md` (main 브랜치)

### Edit 1: API 트리에 NextAuth 라우트 추가
- **위치**: `src/app/api/` 하위, `tarot/` 다음
- **변경**: `│   │   └── tarot/` 뒤에 `│   │   └── auth/[...nextauth]/  # NextAuth.js v5 API 라우트 (PostgreSQL 모드 전용)` 추가
- **이유**: `[...nextauth]` 라우트가 `api/` 아래에 실제로 존재하지만 트리에서 누락

### Edit 2: auth/ 설명에서 [...nextauth] 참조 제거
- **위치**: `│   ├── auth/` 행
- **변경**: `# 로그인, OAuth 콜백, NextAuth API 라우트 ([...nextauth]/)` → `# 로그인, OAuth 콜백`
- **이유**: `[...nextauth]/`는 `api/auth/` 아래에 있으므로 `app/auth/` 설명에서 제거

### Edit 3: components/tarot/ 유령 디렉토리 제거
- **위치**: `│   └── tarot/                  # (현재 비어있음 ...` 행
- **변경**: 해당 행 삭제
- **이유**: 디렉토리 자체가 존재하지 않음

### Edit 4: components/common/ 에 Icon.tsx 추가
- **위치**: `│   ├── common/` 행
- **변경**: `# UserInfoForm (개인정보 입력), PrivacyConsentModal (동의), ReadingText (단락 분리 렌더링)` → `# UserInfoForm (개인정보 입력), PrivacyConsentModal (동의), ReadingText (단락 분리 렌더링), Icon`

### Edit 5: data/ 에 error-messages.ts 추가
- **위치**: `│   └── birth-hours.ts` 행 다음 또는 data/ 하위 적절한 위치
- **변경**: `│   ├── error-messages.ts        # API 에러 메시지 상수` 추가

### Edit 6: scripts/ 에 generate-icons.ts 추가
- **위치**: scripts/ 목록 내 적절한 위치
- **변경**: `├── generate-icons.ts           # 아이콘 이미지 생성 (배경 제거 + 크롭)` 추가

### Edit 7: 운영 체계 표 6단계 → 7단계
- **위치**: 운영 체계 역할 분담 표
- **변경**: `(6단계 프로세스)` → `(7단계 프로세스)`
- **이유**: 코드 변경 프로세스 섹션은 이미 7단계로 수정되었지만 운영 체계 표에서는 아직 6단계로 되어 있음

---

## Part 3: 문서 최적화 (가독성 + 정확도)

CLAUDE.md가 이미 잘 구조화되어 있으므로 대규모 재구성 없이, 발견된 소규모 개선만 적용:

### 최적화 1: worktree CLAUDE.md 동기화
- worktree `feat/db-provider-migration` 브랜치의 CLAUDE.md도 main과 동일하게 업데이트
- PR 머지 시 충돌 방지

### 최적화 2: `deploy.yml` 설명 명확화 (선택적)
- 현재 "PR CI (`.github/workflows/deploy.yml`)" — 파일명이 CI 내용과 다소 불일치
- 하지만 이름 변경은 CI 파일 자체를 변경해야 하므로, 문서에서 "(CI 전용, 배포는 Railway 연동)" 부연만 추가

---

## 실행 순서

1. main 브랜치 CLAUDE.md에 7개 Edit 적용
2. worktree CLAUDE.md에도 동일 반영 (또는 main 내용으로 동기화)
3. main에 커밋: `docs: CLAUDE.md 코드-문서 상호 검증 반영`
4. worktree에서도 커밋 (필요 시)

---

## 검증

- 각 수정 후 프로젝트 구조 트리의 들여쓰기/연결선 정합성 확인
- 실제 파일 존재 여부 재확인 (Glob으로 검증)
- `pnpm type-check` / `pnpm lint` 불필요 (문서 전용 변경)
