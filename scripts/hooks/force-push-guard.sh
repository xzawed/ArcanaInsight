#!/usr/bin/env bash
# PreToolUse 가드: git push 대상 브랜치와 force 형태를 검사한다.
#
# 권한 규칙(permissions.deny)은 명령 문자열의 접두사 매칭만 가능해 "지금 브랜치가 main인가"를
# 판별할 수 없다. PR 워크플로우(main 직접 push 금지, PR 경유 머지)를 도구 레벨에서 강제하려면
# 실제 브랜치를 읽어야 하므로 이 훅이 그 역할을 맡는다.
#
# 정책
#   1. main/master 대상 push → deny  (PR 워크플로우 우회 차단. 머지는 `gh pr merge`가 담당)
#   2. --force / -f (lease 없음) → deny  (원격 이력 무조건 덮어씀 — 타인 커밋 유실 위험)
#   3. --force-with-lease + feature 브랜치 → allow  (리베이스 후 정상 반영 경로)
#
# 매처는 `Bash(git push*)`. stdin의 PreToolUse JSON에서 명령을 꺼내 판정한다.
set -euo pipefail

input="$(cat)"

# jq가 없는 환경도 있으므로 우선 jq, 실패 시 sed 폴백으로 command를 추출한다.
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
else
  cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
fi

# git push가 아니면 통과 (매처가 넓게 잡히는 경우 대비)
printf '%s' "$cmd" | grep -q 'git push' || exit 0

deny() {
  # permissionDecisionReason은 JSON 문자열이므로 개행은 \n 리터럴로 넣는다.
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

# ── 2. lease 없는 force 차단 ────────────────────────────────────────────────
# --force-with-lease는 원격이 예상 상태일 때만 덮어써 타인 커밋 유실을 막는다.
# 반면 --force / -f 는 무조건 덮어쓰므로 어떤 브랜치에서도 허용하지 않는다.
if printf '%s' "$cmd" | grep -qE '(^|[[:space:]])(--force([[:space:]]|$)|-f([[:space:]]|$))'; then
  deny "lease 없는 force push는 차단됩니다 — 원격 이력을 무조건 덮어써 타인 커밋이 유실될 수 있습니다.\\n→ 리베이스 반영이 목적이면 \`git push --force-with-lease\`를 사용하세요(원격이 예상 상태일 때만 덮어씁니다)."
fi

# ── 1. main/master 대상 차단 ────────────────────────────────────────────────
# 명령에 명시적 refspec이 있으면 그것을, 없으면 현재 브랜치를 대상으로 본다.
target=""
if printf '%s' "$cmd" | grep -qE 'git push[^|;&]*[[:space:]]origin[[:space:]]+[^[:space:]|;&-]'; then
  target="$(printf '%s' "$cmd" \
    | sed -n 's/.*git push[^|;&]*[[:space:]]origin[[:space:]]\{1,\}\([^[:space:]|;&]\{1,\}\).*/\1/p' \
    | head -1)"
  target="${target#+}"        # +refspec 강제푸시 표기 제거
  target="${target##*:}"      # local:remote 형태면 remote 쪽이 대상
fi
if [ -z "$target" ]; then
  target="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
fi

case "$target" in
  main|master|HEAD)
    deny "main 브랜치 직접 push는 차단됩니다 (대상: '${target}').\\n→ 이 저장소는 feature 브랜치 → PR → 머지 순서를 따릅니다. 머지는 \`gh pr merge\`를 사용하세요.\\n정본: .claude/rules/workflow.md"
    ;;
esac

exit 0
