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
pnpm build > /dev/null 2>&1
echo "✅ 빌드 성공"

echo ""
echo "=== 모든 검증 통과 ==="
