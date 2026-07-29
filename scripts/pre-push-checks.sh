#!/bin/bash
# 코드 품질 검증 스크립트 — git push 전에 실행
# tsc → ESLint → 단위 테스트+커버리지 → 문서 정합성 → 빌드

set -e

# 훅 stdin 가드: 훅(PreToolUse Bash)으로 호출된 경우 stdin에 JSON이 온다.
# 대상 명령이 아니면 즉시 통과 — `if` matcher 미지원 버전에서 matcher "Bash"가 모든
# Bash 명령에 발화하는 것을 방어(defense-in-depth). 수동 실행 시엔 stdin이 tty라 건너뛴다.
#
# ⚠️ 과거엔 `*"git push"*` 부분 문자열 매칭이었는데, heredoc 본문에 문자열이 있기만 해도
# 발화해 `git commit -F- <<EOF ... EOF`에서 전체 검증(최대 300초)이 헛돌았다(실측).
# 이제 "실행되는 세그먼트"만 채택하는 공용 헬퍼로 판정한다.
if [ ! -t 0 ]; then
  HOOK_INPUT="$(cat 2>/dev/null || true)"
  case "$HOOK_INPUT" in
    *'"command"'*)
      # shellcheck source=./hooks/lib/git-push-segment.sh
      . "$(dirname "$0")/hooks/lib/git-push-segment.sh"
      [ -n "$(extract_git_push_segment "$HOOK_INPUT")" ] || exit 0
      ;;
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

echo "=== [1/5] TypeScript 타입 체크 ==="
pnpm tsc --noEmit
echo "✅ 타입 체크 통과"

echo ""
echo "=== [2/5] ESLint 코드 품질 검사 ==="
pnpm lint
echo "✅ 린트 통과"

echo ""
echo "=== [3/5] 단위·통합 테스트 + 커버리지 임계값 ==="
pnpm test:coverage
echo "✅ 테스트 + 커버리지 통과 (branches 90 / functions 97 / lines·statements 98)"

echo ""
echo "=== [4/5] 문서 정합성 검사 ==="
pnpm check:env-docs && pnpm i18n:check
echo "✅ 문서 정합성 통과"

echo ""
echo "=== [5/5] 프로덕션 빌드 ==="
# Google Fonts CDN 등 네트워크 의존 빌드는 로컬에서 실패 가능 — 경고만 출력
if pnpm build > /dev/null 2>&1; then
  echo "✅ 빌드 성공"
else
  echo "⚠️  빌드 실패 (Google Fonts CDN 등 네트워크 이슈 가능) — CI에서 재검증됩니다"
fi

echo ""
echo "=== push 전 검증 완료 ==="
