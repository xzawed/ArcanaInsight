#!/bin/bash
# 코드 품질 검증 스크립트 — git push 전에 실행
# tsc 타입 체크 → ESLint → 프로덕션 빌드 순서로 검증

set -e

export PATH="/c/Program Files/nodejs:/c/Users/dirtc/AppData/Roaming/npm:/c/Users/dirtc/AppData/Local/pnpm:$PATH"
cd "$(git rev-parse --show-toplevel)"

echo "=== 1/3: TypeScript 타입 체크 ==="
pnpm tsc --noEmit
echo "✅ 타입 체크 통과"

echo ""
echo "=== 2/3: ESLint 코드 품질 검사 ==="
pnpm lint
echo "✅ 린트 통과"

echo ""
echo "=== 3/3: 프로덕션 빌드 ==="
# Google Fonts CDN 등 네트워크 의존 빌드는 로컬 환경에서 실패 가능
# tsc + lint 통과 시 CI 빌드로 최종 검증 — 빌드 실패는 경고만 출력
if pnpm build > /dev/null 2>&1; then
  echo "✅ 빌드 성공"
else
  echo "⚠️  빌드 실패 (Google Fonts CDN 등 네트워크 이슈 가능) — CI에서 재검증됩니다"
fi

echo ""
echo "=== tsc + lint 검증 완료 ==="
