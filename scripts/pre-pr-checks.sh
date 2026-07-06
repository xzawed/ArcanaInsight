#!/bin/bash
# PR 생성 전 종합 품질 게이트 — 실패 시 exit 1로 PR 생성 차단
# pre-push-checks.sh(tsc+lint+build)보다 엄격한 전체 검증 수행
#
# 검증 항목:
#   0. 프로덕션 빌드 (경고만 — 네트워크 의존 빌드 오류 허용)
#   1. TypeScript 타입 체크
#   2. ESLint
#   3. 단위·통합 테스트 + 커버리지 임계값 (branches 90 / functions 97 / lines·statements 98)
#   4. 문서 정합성 3종 (env-docs, doc-links, i18n:check)
#   5. SonarCloud exclusions 동기화 검사
#   6. E2E 셀렉터 영향 파일 경고 (차단 아님 — 확인 권고)
#   7. playwright.config.ts locale:"ko" 유지 확인

set -e

# 훅 stdin 가드: 훅(PreToolUse Bash)으로 호출된 경우 stdin에 JSON이 온다.
# 대상 명령(gh pr create)이 아니면 즉시 통과 — settings.json의 `if` matcher가 미지원인
# 버전에서 matcher "Bash"가 모든 Bash 명령에 발화하는 것을 방어(defense-in-depth).
# 수동 실행(터미널) 시엔 stdin이 tty라 가드를 건너뛰고 정상 실행한다.
if [ ! -t 0 ]; then
  HOOK_INPUT="$(cat 2>/dev/null || true)"
  case "$HOOK_INPUT" in
    *'"command"'*"gh pr create"*) : ;;  # 대상 명령 — 계속 진행
    *'"command"'*) exit 0 ;;             # 다른 Bash 명령 — 검증 없이 통과
  esac
fi

# pnpm PATH 설정 — 이식 가능 (환경별 자동 탐지, 하드코딩 없음)
if ! command -v pnpm &> /dev/null; then
  for candidate in \
    "${LOCALAPPDATA}/pnpm" \
    "${APPDATA}/npm" \
    "/c/Program Files/nodejs" \
    "$HOME/.local/share/pnpm" \
    "$HOME/.pnpm"; do
    [ -d "$candidate" ] && export PATH="$candidate:$PATH" && break
  done
fi
cd "$(git rev-parse --show-toplevel)"

MAIN_BRANCH=$(git remote show origin 2>/dev/null | grep "HEAD branch" | awk '{print $3}' || echo "main")
CHANGED_FILES=$(git diff "origin/${MAIN_BRANCH}...HEAD" --name-only 2>/dev/null || git diff HEAD~1 --name-only 2>/dev/null || echo "")
NEW_TS_FILES=$(echo "$CHANGED_FILES" | grep -E "^src/.*\.tsx?$" | xargs -I{} git diff "origin/${MAIN_BRANCH}...HEAD" --diff-filter=A --name-only 2>/dev/null | grep -E "^src/.*\.tsx?$" || true)

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         ArcanaInsight — PR 전 종합 품질 게이트         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "=== [0/8] 프로덕션 빌드 ==="
# 네트워크 의존 빌드는 경고만 — CI에서 최종 검증
if pnpm build > /dev/null 2>&1; then
  echo "✅ 빌드 성공"
else
  echo "⚠️  빌드 실패 (Google Fonts CDN 등 네트워크 이슈 가능) — CI에서 재검증됩니다"
fi
echo ""

# ── 1. TypeScript 타입 체크 ──────────────────────────────
echo "=== [1/8] TypeScript 타입 체크 ==="
pnpm tsc --noEmit
echo "✅ 타입 체크 통과"
echo ""

# ── 2. ESLint ────────────────────────────────────────────
echo "=== [2/8] ESLint ==="
pnpm lint
echo "✅ 린트 통과"
echo ""

# ── 3. 단위·통합 테스트 + 커버리지 임계값 ────────────────
echo "=== [3/8] 단위·통합 테스트 + 커버리지 임계값 ==="
echo "    (branches 90 / functions 97 / lines·statements 98)"
pnpm test:coverage
echo "✅ 테스트 + 커버리지 통과"
echo ""

# ── 4. 문서 정합성 3종 ───────────────────────────────────
echo "=== [4/8] 문서 정합성 검사 ==="
echo "    [4a] env.ts ↔ env-variables.md"
pnpm check:env-docs
echo "    [4b] docs/** 링크 유효성"
pnpm check:doc-links
echo "    [4c] i18n 번역 키 drift"
pnpm i18n:check
echo "✅ 문서 정합성 통과"
echo ""

# ── 5. SonarCloud exclusions 동기화 검사 ─────────────────
echo "=== [5/8] SonarCloud exclusions 동기화 검사 ==="
SONAR_FAIL=false
if [ -n "$NEW_TS_FILES" ]; then
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    if ! grep -qF "$file" sonar-project.properties 2>/dev/null; then
      echo "  ❌ sonar-project.properties 누락: $file"
      SONAR_FAIL=true
    fi
  done <<< "$NEW_TS_FILES"
fi

if [ "$SONAR_FAIL" = true ]; then
  echo ""
  echo "────────────────────────────────────────────────────"
  echo "  신규 .ts/.tsx 파일이 sonar-project.properties에"
  echo "  등록되지 않았습니다. sonar.coverage.exclusions 또는"
  echo "  sonar.cpd.exclusions에 경로를 추가해주세요."
  echo ""
  echo "  참고: PR #219에서 이 누락으로 SonarCloud CI 3회 실패"
  echo "────────────────────────────────────────────────────"
  exit 1
fi
echo "✅ SonarCloud exclusions 동기화 확인"
echo ""

# ── 6. E2E 셀렉터 영향 경고 (차단 없음) ──────────────────
echo "=== [6/8] E2E 셀렉터 영향 검사 ==="
UI_CHANGED=$(echo "$CHANGED_FILES" | grep -E \
  "(src/app/.*/page\.tsx|src/components/common/UserInfoForm\.tsx|src/components/home/SkinGallery\.tsx|src/i18n/translations/)" \
  || true)

if [ -n "$UI_CHANGED" ]; then
  echo "  ⚠️  UI/번역 파일이 변경되었습니다 — E2E 셀렉터를 확인하세요:"
  echo "$UI_CHANGED" | sed 's/^/    /'
  echo ""
  echo "  확인 명령:"
  echo "  $ grep -rn 'hasText\\|getByText\\|getByRole' e2e/ --include='*.ts'"
  echo "  $ grep -rn 'service-navigation' e2e/ --include='*.ts'"
  echo ""
  echo "  특히 e2e/helpers/service-navigation.ts 수정 여부를 확인하세요."
else
  echo "✅ UI 파일 미변경 — E2E 셀렉터 확인 불필요"
fi
echo ""

# ── 7. playwright.config.ts locale:"ko" 유지 확인 ────────
echo "=== [7/8] playwright.config.ts locale 확인 ==="
if ! grep -q 'locale.*:.*"ko"' playwright.config.ts 2>/dev/null; then
  echo "  ❌ playwright.config.ts에 locale:\"ko\" 설정이 없습니다!"
  echo ""
  echo "  이 설정이 없으면 CI 브라우저(기본 en-US)에서 SSR이 영어로"
  echo "  렌더링되어 한국어 텍스트 단언이 전부 실패합니다."
  echo "  참고: PR #243에서 23개 E2E 실패 사례"
  exit 1
fi
echo "✅ playwright.config.ts locale:\"ko\" 확인"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     ✅  모든 PR 전 검증 통과 — PR 생성 가능합니다       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
