#!/usr/bin/env bash
# PreToolUse 가드: 카드 아트(card-styles)는 2026-07-03 Cloudflare R2로 이전됨.
# `pnpm upload:assets`(:r2 없음)는 이제 정본 아닌 Supabase 대상이라, 카드/배경을
# R2에 반영하려면 `pnpm upload:assets:r2`를 써야 한다. 오사용 시 사용자에게 확인을 요청한다.
#
# 매처는 `Bash(pnpm upload:assets*)` — r2 변형까지 포함되므로, 여기서 명령에
# `:r2`가 없을 때만 경고한다. stdin의 PreToolUse JSON을 raw grep으로 판별(파서 무의존).
set -euo pipefail

input="$(cat)"

if printf '%s' "$input" | grep -q "upload:assets" && ! printf '%s' "$input" | grep -q "upload:assets:r2"; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"⚠️ 카드 아트(card-styles)는 Cloudflare R2로 이전됨(2026-07-03). `pnpm upload:assets`는 이제 정본이 아닌 Supabase Storage 대상입니다.\n→ 카드 앞면/뒷면/서비스 배경을 실서비스에 반영하려면 `pnpm upload:assets:r2`(또는 :skip)를 사용하세요.\n정본: docs/conventions/image-assets.md §5. Supabase 업로드가 정말 의도한 작업이면 그대로 진행하세요."}}
JSON
fi

exit 0
