# 배포 품질 손상 최소화 가이드

> 2026-07-06 Railway standalone 전환 과정에서 배포가 ~7회 실패한 경험을 바탕으로 만든 가이드.
> 배포 관련 변경이 프로덕션 품질을 해치지 않도록 하는 절차·체크리스트·함정 모음.
> 상세 배포 설정은 [`deployment.md`](deployment.md), 원인 분석은 아래 §7 참고.

---

## 핵심 원칙 3가지

1. **헬스체크-게이트 스왑은 안전망이다.** Railway는 `healthcheckPath`가 통과해야만 새 배포로 트래픽을 넘긴다. 즉 빌드/기동 실패 시 **기존 배포가 계속 서빙**된다(무중단). 이 안전망 덕에 배포 실패가 곧 장애는 아니다 — 다만 남용하지 말고, 실패는 원인을 규명하고 넘어간다.
2. **관측 먼저, 가설은 나중.** 불투명한 실패는 실제 오류 로그를 확보한 뒤 수정한다. 관측 없이 세운 가설로 수정 PR을 쌓지 않는다.
3. **로컬 검증 ≠ 프로덕션 검증.** 인프라·네트워크·런타임 주입 env 관련 수정은 로컬 통과만으로 단정하지 말고 프로덕션 런타임 증거로 확정한다.

---

## 1. 배포 영향 변경 위험도

| 위험 | 대상 | 추가 검증 |
|------|------|-----------|
| **高** | `Dockerfile`, `railway.toml`, `next.config`(output/images), 서비스 config(startCommand·HOSTNAME·env), 의존성(`package.json`/`pnpm-lock`) | 로컬 Docker + 배포 후 스모크(§4) 필수 |
| **中** | `middleware.ts`, API 라우트 시그니처, 새 env 사용, R2 자산 경로 | 배포 후 해당 기능 스모크 |
| **低** | 컴포넌트·스타일·문서·테스트 | 표준 CI로 충분 |

---

## 2. 배포 전 체크리스트 (高/中위험 PR)

- [ ] CI 9종 green (type-check·lint·test:coverage·E2E Desktop/Mobile·SonarCloud·codecov·문서)
- [ ] 로컬 `pnpm build` 통과
- [ ] **Dockerfile 변경 시**: 로컬 `docker build` + `docker run -e PORT=8080 <img> node server.js` → `/api/health` 200 (Railway 조건 모사)
- [ ] **railway.toml/서비스 config 변경 시**: 서비스 `startCommand`·`HOSTNAME=0.0.0.0`·`NEXT_PUBLIC_*`가 의도대로인지 확인 (§3)
- [ ] **R2 자산 관련**: 프로덕션 `NEXT_PUBLIC_ASSET_BASE_URL` 설정 확인 (미설정 시 이미지 404)
- [ ] **배포 방식(builder) 변경 시**: 롤백 경로(§6) 미리 확인
- [ ] 배포설정 PR은 **main 최신에서 분기** (squash 머지가 stacked 브랜치 merge-base를 어긋냄 → §3)

---

## 3. Railway 특유 함정 (반드시 숙지)

- **서비스 startCommand가 railway.toml보다 우선.** 대시보드/GraphQL `serviceInstance.startCommand` 값이 railway.toml을 덮는다. 시작 명령을 바꾸려면 서비스 config(`railway variable`/GraphQL `serviceInstanceUpdate`/대시보드)를 함께 갱신해야 한다.
- **startCommand는 shell 없이 argv로 분해**(따옴표·env 프리픽스 미지원). `HOSTNAME=0.0.0.0 node server.js`·`sh -c "..."` 금지 → 순수 단일 실행파일(`node server.js`).
- **컨테이너 HOSTNAME은 IPv6 먼저 해석.** `HOSTNAME`=컨테이너ID가 `/etc/hosts`에서 IPv6→IPv4 순으로 해석돼, Next standalone이 그대로 두면 IPv6에만 바인딩 → IPv4 헬스체크 미도달. **서비스 변수 `HOSTNAME=0.0.0.0` 필수**(0.0.0.0 = IPv4 전 인터페이스). PORT는 Railway가 8080 주입.
- **NEXT_PUBLIC_*는 빌드 시 인라인** → Dockerfile 빌드 `ARG`로 주입돼야 함(누락 시 클라이언트 값 깨짐, 특히 R2 이미지 404).
- **실패 로그는 CLI에 안 뜰 수 있음.** create-container/헬스체크 실패는 `railway logs`에 비어 나옴 → **대시보드 Details** 또는 SSH·GraphQL `deploymentLogs`(로그인 필요)로 확인.
- **squash 머지**는 stacked 브랜치의 merge-base를 어긋내 후속 PR에 전체 충돌을 유발 → 배포/문서 PR은 항상 main 최신에서 분기.

> **자동 검증**: `pnpm verify:railway-config` — 위 2필수조건(`startCommand=node server.js`·서비스 변수 `HOSTNAME=0.0.0.0`)을 Railway API로 assert(불일치 시 exit 1). 서비스 재생성/배포 의심 시 실행. 인증은 `RAILWAY_TOKEN`(프로젝트 토큰)·`RAILWAY_API_TOKEN`(계정/팀 토큰)·`railway login` 중 하나 — **토큰 종류마다 헤더가 달라** 스크립트가 변수명으로 구분한다. 배포 트리거의 `checkSuites` 게이팅 상태도 함께 출력한다.

---

## 4. 배포 후 스모크 검증 (헬스체크만으론 부족)

> `/api/health` 200 = "서버가 떴다"일 뿐, **기능이 정상이란 뜻은 아니다.** (예: NEXT_PUBLIC_ASSET_BASE_URL 누락 시 헬스체크는 통과해도 이미지가 전부 404)

**자동**: `.github/workflows/post-deploy-smoke.yml`이 **main push마다** 배포 완료를 기다린 뒤 `pnpm smoke:prod`를 실행한다(health·홈+자산호스트 인라인·R2 이미지 200 검증, 실패 시 워크플로 red). 수동 실행도 가능: `pnpm smoke:prod` (리딩 포함은 `node scripts/smoke-prod.mjs --reading`, AI 비용).

배포 SUCCESS 후 확인 항목(스모크 스크립트가 1~2 자동 커버):
1. `/api/health` 200, 홈 `/` 200 + 본문에 `cdn.xzawed.xyz` 인라인(=NEXT_PUBLIC_ASSET_BASE_URL 빌드 반영)
2. **캐릭터 이미지 로드**: `cdn.xzawed.xyz`(R2) 이미지 200
3. **리딩 1건씩**(tarot/saju/shinjeom): 익명 요청 실제 결과(SSE) 생성 — `pnpm eval:reading`(3서비스 계약 검증) 또는 `smoke:prod --reading`(타로 1건)
4. **배포 방식 변경 시**: 앱 로그에 `Network: http://0.0.0.0:8080` (0.0.0.0 바인딩) 확인

---

## 5. 실패 시 진단 순서

1. **대시보드 Details** → 어느 단계(Build / Deploy>Create container / Deploy>Healthcheck)에서 실패인지 먼저 확인
2. **빌드 실패** → build 로그 / **배포 실패** → deploy·앱 로그(SSH `printenv`·`deploymentLogs`, 바인딩 host:port 확인)
3. **3회+ 서로 다른 실패**가 이어지면 → systematic-debugging대로 **멈추고 롤백해 안정화**(§6) 후 관측 재수집. 관측 없이 4번째 수정을 시도하지 않는다.

---

## 6. 롤백

- **즉시**: 대시보드 → Deployments → 직전 SUCCESS 배포 → Redeploy
- **코드**: `git revert <hash>` + push (Railway 자동 재배포)
- **배포 방식(builder) 원복 시**: 서비스 config(`startCommand`·변수)도 함께 원복해야 함 (railway.toml만 되돌리면 서비스 값이 남아 불일치)
- 프로덕션은 헬스체크-게이트라 롤백 중에도 기존 배포가 서빙됨(무중단)

---

## 7. 배경 — 2026-07-06 standalone 전환 3겹 원인 (사후 기록)

standalone Dockerfile 배포가 연속 실패한 실제 원인(각 수정이 다음을 드러냄):
1. 서비스에 남은 `pnpm start`가 슬림 런타임(pnpm 없음)에서 실패
2. Railway가 startCommand를 shell 없이 argv 분해 → env 프리픽스/따옴표 깨짐
3. standalone이 컨테이너 HOSTNAME(IPv6-우선 해석)에 바인딩 → IPv4 헬스체크 미도달

최종: 서비스 `startCommand=node server.js` + 서비스 변수 `HOSTNAME=0.0.0.0` → 배포 성공(이미지 ~1.1GB→~300MB, 배포 1m13s). 진단은 대시보드 로그·SSH 실측·앱 로그로 확정.
