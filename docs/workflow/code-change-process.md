# 코드 변경 프로세스

모든 코드 변경에 적용되는 7단계 프로세스입니다. 진입점은 항상 **Claude CLI에 대한 사용자의 직접 지시**이며, Claude CLI가 기획/구현/검토를 모두 수행합니다.

---

## 7단계 프로세스

### 1단계: 코드 변경
- 사용자가 Claude CLI에 직접 지시 → Claude CLI가 기획 + 구현
- `fix/*`, `feat/*`, `docs/*`, `chore/*` 기능 브랜치에서 수정 (main 직접 push 금지)

### 2단계: 로컬 검증

```bash
pnpm type-check        # TypeScript 타입 체크
pnpm lint              # ESLint 코드 품질 검사
pnpm test:coverage     # 단위 테스트 + 커버리지 임계값 확인 (statements 98%)
pnpm build             # 프로덕션 빌드 확인
```

- 4가지 모두 통과해야 다음 단계로 진행
- 커버리지 임계값 변경 시 PR 설명에 근거 명시 필수
- **Windows 환경 주의**: Google Fonts CDN(`fonts.gstatic.com`) 차단으로 `pnpm build`가 로컬에서 실패하는 경우가 있음. CI(GitHub Actions)는 정상 통과 → 문서만 변경하는 PR에서는 `type-check + lint`만 로컬 검증 후 CI에 위임 가능

### 3단계: 변경 사항 리뷰
- Claude CLI가 자체 검토: 스펙 준수, 코드 품질, 레이아웃 규칙 점검
- [`../conventions/layout-rules.md`](../conventions/layout-rules.md) — 5:5 비율 + CSS mask 표준값 확인
- [`../conventions/zod-schemas.md`](../conventions/zod-schemas.md) — API 스키마 `null`/`undefined` 규칙 확인

### 4단계: 커밋 + PR 생성

아래 prefix 규칙에 맞는 커밋 메시지 작성 후 PR 생성.

**커밋 메시지 prefix 규칙**:

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

```bash
git push origin <branch-name>
gh pr create --title "..." --body "..."
```

### 5단계: CI 자동 검증 (PR → main)
- GitHub Actions 자동 실행: `lint → build → e2e` (Chromium)
- 상세: [`ci-cd.md`](ci-cd.md)
- CI 실패 → 1단계로 복귀
- CI 통과 → 6단계로 진행

### 6단계: 머지 + 자동 배포 + QA 재검증
- PR 머지 → main push → Railway 자동 배포
- QA 실패 Issue가 열려있으면 자동 재검증 트리거 (`qa-recheck.yml`)
- 재검증 통과 시 QA Issue 자동 닫힘

### 7단계: CLAUDE.md 최신화 + 최적화 (필수, 예외 없음)

머지 완료 후 CLAUDE.md를 업데이트하고 main에 직접 커밋:

**최신화 항목 (구현 내용 반영)**
- 신규 파일/컴포넌트/훅/API 라우트 → 프로젝트 구조 트리에 추가
- 신규 아키텍처 패턴 → 핵심 아키텍처 패턴 섹션에 추가
- 미구현/제거된 기능 → 관련 설명 수정 또는 주의사항(`⚠️`) 표기
- DB 마이그레이션 추가 시 → migrations 목록 업데이트

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 최신화 — [작업 내용 한 줄 요약]"
git push origin main
```

---

## 전체 흐름도

```
사용자 → Claude CLI (직접 지시)
  └─ 1단계: 코드 변경 (기획 + 구현)
       └─ 2단계: 로컬 검증 (type-check + lint + build)
            ├─ 실패 → 수정 → 재검증 반복
            └─ 통과 → 3단계: 리뷰
                 └─ 4단계: 커밋 + PR 생성
                      └─ 5단계: CI 자동 검증
                           ├─ 실패 → 1단계로 복귀
                           └─ 통과 → 6단계: 머지 + 배포 + QA 재검증
                                └─ 7단계: CLAUDE.md 최신화 (필수)
```

---

## 자동화 (Claude Code 전용)

`.claude/settings.json`의 PreToolUse 훅으로 `git push` 시 자동 검증:

- `scripts/pre-push-checks.sh` 실행: type-check → lint → build 순서
- 하나라도 실패하면 push 차단

`.scamanager/install-hook.sh`로 설치된 `pre-push` 훅:
- Claude CLI로 AI 코드리뷰 수행 후 SCAManager 서버에 전송
- 초기 설치: `git pull && bash .scamanager/install-hook.sh` (1회)
- `claude`, `python3`, `curl` 미설치 시 훅 스킵 (push 차단 없음)

---

## Git 브랜치 전략

```
main        ← 프로덕션 (Railway 자동 배포 트리거, master 미사용)
feat/*      ← 기능 개발
fix/*       ← 버그 수정
docs/*      ← 문서 변경
chore/*     ← 설정/정리
```

### 브랜치 일괄 정리

```bash
# 원격 브랜치 전체 삭제 (main 제외) — sed 앞 공백 2개 주의
git branch -r | grep -v 'origin/main' | grep -v 'origin/HEAD' | sed 's|  origin/||' | xargs -I{} git push origin --delete {}

# 로컬 브랜치 전체 삭제 (main 제외)
git branch | grep -v '^\* main' | xargs git branch -D
```

---

## 의존성 버전 관리

- **메이저 버전 업그레이드 금지**: Next.js, React, Framer Motion, Tailwind CSS, Zustand — 사용자 명시적 승인 없이 변경 불가
- **마이너·패치는 허용**: 보안 패치, 버그 픽스 수준의 업데이트는 자율 적용 가능
- **pnpm 버전 고정**: `pnpm@10.33.0` — `pnpm-lock.yaml`과 Docker 실행 스크립트에 고정됨, 임의 변경 금지
- **Playwright 버전 고정**: Docker 이미지 `mcr.microsoft.com/playwright:v1.59.1-noble` — CI와 로컬 동기화를 위해 임의 변경 금지

## i18n 체크리스트 (UI 텍스트·번역 변경 시)

- [ ] `shared/keys.ts` 타입 추가 (ko/en/ja 모두 강제)
- [ ] ko 사전 100% 채움 (SSOT)
- [ ] en 사전 임시 영문 (외부 번역 발주 대기 중)
- [ ] ja 사전은 PR-5 일괄 (현재는 ko fallback)
- [ ] 클라이언트 호출 = `useT()`, 서버 호출 = `t(key, locale)` + `getRequestLocale()`
- [ ] LocaleProvider SSR 패턴 (`setTimeout` 래핑) 준수
- [ ] E2E 셀렉터를 `data-testid`로 (한글 regex 금지)
- [ ] `pnpm sync:test-count` 실행 후 CLAUDE.md 자동 갱신 확인

상세: [`../conventions/i18n-style.md`](../conventions/i18n-style.md)
