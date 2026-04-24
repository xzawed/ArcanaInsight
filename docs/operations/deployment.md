# Railway 배포 가이드

ArcanaInsight는 Railway를 사용하여 자동 배포됩니다.

---

## 자동 배포 흐름

```
PR 머지 → main push → Railway 자동 빌드 → 배포 완료 (약 2~3분)
```

Railway는 `main` 브랜치의 모든 push에 자동으로 반응합니다. 수동 배포 트리거는 필요하지 않습니다.

---

## 설정 파일

- `railway.toml` — 빌드/배포 설정 (nixpacks 빌더)
- `.github/workflows/deploy.yml` — PR CI 워크플로우 (Railway 배포 전 게이트)

### GitHub Secrets (필수)

| Secret | 설명 |
|--------|------|
| `RAILWAY_TOKEN` | Railway API 토큰 |
| `RAILWAY_SERVICE_ID` | Railway 서비스 ID |

---

## 롤백 방법

### 즉시 롤백 (이전 빌드)

Railway 대시보드 → 서비스 선택 → Deployments 탭 → 이전 배포 클릭 → "Redeploy"

### DB_PROVIDER 롤백 (재배포 불필요)

PostgreSQL → Supabase 즉시 전환:
```
Railway 환경변수: DB_PROVIDER=supabase (또는 변수 삭제)
→ 저장 즉시 적용 (재배포 없이 즉시 동작)
```

### 코드 롤백 (git revert)

```bash
git revert <commit-hash>
git push origin main
# → Railway 자동 재배포
```

---

## 환경변수 관리

- 모든 환경변수는 Railway 대시보드에서 관리
- `.env` 파일은 절대 커밋하지 않음
- 전체 환경변수 목록: [`env-variables.md`](env-variables.md)

---

## 빌드 실패 대응

1. Railway 대시보드 → Build Logs 확인
2. 로컬에서 `pnpm build` 재현 시도
3. 주요 원인:
   - TypeScript 타입 오류 (PR CI에서 차단되어야 하나 누락 시)
   - 환경변수 누락 (`src/lib/env.ts` getter가 런타임에 throw)
   - Next.js 빌드 타임 API 호출 실패

---

## 서비스 헬스 체크

```bash
# 배포 상태 확인 (Railway CLI)
railway status

# 로그 스트리밍
railway logs --tail
```

---

## CI/CD 파이프라인 상세

→ [`../workflow/ci-cd.md`](../workflow/ci-cd.md)
