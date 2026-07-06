---
name: deploy-safety
description: 배포 영향 변경(Dockerfile·railway.toml·next.config·서비스 config) 시 품질 손상을 막는 배포 전 체크리스트와 배포 후 스모크를 안내한다. "배포 안전", "Dockerfile 수정", "railway 배포", "배포 전 확인", "standalone 배포", "배포 실패" 등의 요청에 사용한다.
when_to_use: Dockerfile·railway.toml·next.config.ts·.dockerignore·Railway 서비스 config 변경/커밋 시, 배포 실패 진단 시, 배포 후 검증 시
allowed-tools: Read Grep Bash(git diff*) Bash(curl*) Bash(railway *)
---

# 배포 안전 절차 (배포 품질 손상 최소화)

> 정본은 [`docs/operations/deploy-safety-guide.md`](../../../docs/operations/deploy-safety-guide.md). 이 스킬은 그 절차를 실행 시점에 상기시킨다.
> 배경: 2026-07-06 Railway standalone 전환에서 배포가 ~7회 실패(3겹 원인). CI 게이트(tsc/lint/test)는 **배포 런타임**(IPv6 바인딩·startCommand argv 분해·헬스체크)을 잡지 못한다.

## 핵심 원칙 3

1. **헬스체크-게이트 안전망** — `healthcheckPath` 통과해야만 트래픽 스왑. 실패해도 기존 배포 유지(무중단). 단, 실패는 원인 규명 후 넘어간다.
2. **관측 먼저** — 불투명한 실패는 대시보드/SSH/앱 로그로 실제 오류를 확보한 뒤 수정한다(가설 위에 수정 쌓지 말 것).
3. **로컬 ≠ 프로덕션** — 인프라·네트워크·런타임 주입 env 수정은 로컬 통과만으로 단정하지 말고 프로덕션 런타임 증거로 확정한다.

## 1. 배포 영향 변경 위험도

| 위험 | 대상 |
|------|------|
| **高** | `Dockerfile`, `railway.toml`, `next.config`(output/images), Railway 서비스 config(startCommand·HOSTNAME·env), 의존성(`package.json`/`pnpm-lock`) |
| **中** | `middleware.ts`, API 라우트 시그니처, 새 env, R2 자산 경로 |
| **低** | 컴포넌트·스타일·문서·테스트 |

## 2. 배포 전 체크리스트 (高/中위험)

- [ ] CI 9종 green + 로컬 `pnpm build` 통과
- [ ] **Dockerfile 변경 시**: 로컬 `docker build` + `docker run -e PORT=8080 <img> node server.js` → `/api/health` 200 (Railway 조건 모사)
- [ ] **railway.toml/서비스 config 변경 시**: 서비스 `startCommand=node server.js` · `HOSTNAME=0.0.0.0` · `NEXT_PUBLIC_*` 확인 (§3)
- [ ] **R2 자산 관련**: 프로덕션 `NEXT_PUBLIC_ASSET_BASE_URL` 설정 확인 (미설정 시 이미지 404)
- [ ] 배포설정 PR은 **main 최신에서 분기** (squash 머지가 stacked 브랜치 merge-base를 어긋냄)

## 3. Railway 특유 함정 (반드시 숙지)

- **서비스 startCommand > railway.toml** — 대시보드/GraphQL 값이 railway.toml을 덮는다.
- **startCommand는 shell 없이 argv 분해** — env 프리픽스·따옴표·`sh -c` 금지. 순수 `node server.js`.
- **컨테이너 HOSTNAME은 IPv6 먼저 해석** — standalone은 그대로 두면 IPv6에만 바인딩 → IPv4 헬스체크 미도달. **서비스 변수 `HOSTNAME=0.0.0.0` 필수.**
- **NEXT_PUBLIC_*는 빌드 ARG** — 누락 시 클라이언트 값 깨짐(특히 R2 이미지 404).
- **실패 로그는 CLI에 안 뜰 수 있음** — create-container/헬스체크 실패는 대시보드 Details·SSH·GraphQL `deploymentLogs`로 확인.

## 4. 배포 후 스모크 (헬스체크만으론 부족)

> `/api/health` 200 = "서버가 떴다"일 뿐, 기능 정상이 아니다(예 env 누락 시 이미지 404여도 통과).

```bash
curl -s -o /dev/null -w "home=%{http_code}\n" https://arcanainsight-production.up.railway.app/
curl -s -o /dev/null -w "health=%{http_code}\n" https://arcanainsight-production.up.railway.app/api/health
```

1. `/api/health` 200 · 홈 `/` 200
2. **캐릭터 이미지 로드**(홈 `cdn.xzawed.xyz` → `/_next/image` 200) — Playwright 콘솔 에러 0 권장
3. **리딩 1건씩**(tarot/saju/shinjeom): 익명 요청으로 실제 결과(SSE) 생성 확인
4. **배포 방식 변경 시**: 앱 로그 `Network: http://0.0.0.0:8080`(0.0.0.0 바인딩) 확인

## 5. 실패 진단 순서

1. 대시보드 Details → 어느 단계(Build / Create container / Healthcheck) 실패인지
2. 빌드 실패 → build 로그 / 배포 실패 → deploy·앱 로그(SSH `printenv`·바인딩 host:port)
3. **3회+ 서로 다른 실패** → 멈추고 롤백(직전 SUCCESS Redeploy)으로 안정화 후 관측 재수집

## 6. 롤백

- 대시보드 → Deployments → 직전 SUCCESS → Redeploy (즉시)
- 또는 `git revert <hash>` + push
- 배포 방식(builder) 원복 시 서비스 config(startCommand·변수)도 함께 원복
