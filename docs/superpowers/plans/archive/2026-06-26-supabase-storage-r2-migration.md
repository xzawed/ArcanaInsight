# Supabase Storage → Cloudflare R2 이전 (card-styles) — WBS 실행 계획

> 작성일: 2026-06-26 · 상태: ✅ **전체 완료 (2026-07-03)**
> 목적: Supabase Storage 무료티어(1GB) 초과(~2.2GB)를 **화질 손실 0**으로 해소.

> **완료 요약 (2026-07-03)**: 전 Phase 완료. `cdn.xzawed.xyz`(R2 `arcana-assets`/`card-styles/`) 커스텀 도메인 연결 → 351객체 무손실 이전(etag=md5 351/351, 바이트 완전일치) → `card-style.ts` env 분기(PR #450) + Railway `NEXT_PUBLIC_ASSET_BASE_URL` 설정·재배포 → Playwright 실브라우저 검증(card-styles 27요청 전부 cdn/200) → Supabase card-styles 351개 삭제 → **총 용량 2.2GB→224MB 무료티어 복귀**. 앱 정본은 R2. ⚠️ `xzawed.xyz` 도메인 자체는 사용자의 별개 앱(CustomWebService)이고, ArcanaInsight 운영지는 `arcanainsight-production.up.railway.app` — `cdn.` 서브도메인만 R2 CDN으로 사용.

---

## 0. 배경 · 결정사항 (재조사 불필요 — 측정 완료)

### 현황 (2026-06-26 실측)
| 항목 | 값 |
|---|---|
| Supabase 조직 plan | **Free** (Storage 한도 **1 GB**) |
| 프로젝트 | `arcana-insight` (ref `hkjrupbauexapmmzbcgw`, region ap-northeast-2) |
| 총 Storage | **약 2.2 GB (한도의 220%)** |
| `card-styles` 버킷 | 351 objects / **1,976 MB** → cards 316개 1,940MB + backgrounds 35개 37MB |
| `card-skins` 버킷 | 474 PNG / **224 MB** |
| 카드 원본 규격 | **1664×2496 px PNG, 평균 ~6MB(최대 9.2MB)**, 4스타일×79장 |

### 핵심 결정
- **`card-styles` 버킷(cards+backgrounds, 1,976MB)만** R2로 이전 → Supabase엔 `card-skins`(224MB)만 남아 **무료티어 복귀**.
- **원본 픽셀 100% 보존**(무손실). 리사이즈/손실 변환 안 함.
- 대상 스토리지 = **Cloudflare R2**(공개 버킷+커스텀 도메인+CDN, egress 무료, 저장 ~$0.015/GB·월 ≈ 월 $0.03).
- `card-skins`는 이번 범위 제외(무료티어 내). 추후 일원화 원하면 동일 패턴으로 후속 이전 가능.

### 왜 다른 안을 버렸나 (재논의 방지용 메모)
- **캐릭터처럼 `public/` 로컬화**: Supabase는 해소되나 1.94GB가 **git+Railway 빌드+Railway 유료 egress**로 전가되어 더 나쁨.
- **표정/캐릭터 정리**: 캐릭터 이미지는 Supabase에 없음(로컬). 전부 지워도 Supabase 0 감소.
- **무손실 WebP만**: −26~40%라 단독으로 1GB 미달.
- **Supabase Pro**: 월 $25 고정. 코드 변경은 최소지만 비용.

### ⚠️ 전제: 카드 원본은 로컬에 없음
`public/images/cards`엔 SVG 폴백만(420K) 존재. **6MB 원본은 Supabase에만** 있음 → WBS에 **"Supabase에서 다운로드" 선행 단계** 포함.

---

## 1. 코드 영향 지점 (사전 파악 완료)

| 파일 | 역할 | 변경 |
|---|---|---|
| `src/lib/storage/card-style.ts` | `storageBase()` → `getCardStyleImageUrl`/`getCardStyleBackUrl`/`getServiceBackgroundUrl` (BUCKET=`card-styles`). cards·backgrounds·card-back 모두 이 헬퍼 경유 | **베이스 URL env 분기** (핵심·유일한 런타임 변경) |
| `next.config.ts` | `images.remotePatterns`(현재 `*.supabase.co`만), CSP `img-src ... https:`(R2 허용됨, 수정 불필요) | **R2 호스트 remotePatterns 추가** |
| `scripts/generate-assets/upload-to-supabase.ts` | 기존 Supabase 업로드 스크립트(참고용) | 신규 R2 스크립트의 레퍼런스 |
| `docs/operations/env-variables.md` | env 정본 | `NEXT_PUBLIC_ASSET_BASE_URL` 추가 |
| `src/__tests__/lib/storage/card-style*.test.ts` | URL 기대값 | env 기반으로 갱신 |
| `sonar-project.properties` | 커버리지/CPD exclusions | 신규 TS 스크립트 동기화 |

- `src/lib/storage/index.ts`(card-skins, `supabaseBase()`)는 **이번 범위 밖** — 건드리지 않음.
- `ShuffleCeremony`(canvas `drawImage`)도 카드 URL을 `card-style.ts` 헬퍼에서 가져오면 베이스 변경 자동 반영 → **검증 단계에서 확인**.

### 베이스 분기 스니펫 (구현 가이드)
```ts
// src/lib/storage/card-style.ts
function storageBase(): string {
  const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL;   // R2 커스텀 도메인 루트
  if (assetBase) return `${assetBase}/${BUCKET}`;             // → https://assets.../card-styles
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;          // 미설정 시 기존 Supabase 폴백
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return `${url}/storage/v1/object/public/${BUCKET}`;
}
```
- R2 객체 키 = `card-styles/cards/<style>/<suit>/<n>.png` (Supabase 공개경로와 1:1 동일하게 보존).
- env 미설정 시 Supabase로 자동 폴백 → **롤백이 env 토글만으로 가능**.

---

## 2. WBS (작업 분해)

> 담당: 👤=사용자(Cloudflare 대시보드/DNS) · 🤖=Claude/Codex(스크립트·코드) · 규모: S/M/L

### Phase 1 — Cloudflare R2 준비 (선행, 👤)
| ID | 작업 | 담당 | 선행 | 산출물 | 완료기준 |
|---|---|---|---|---|---|
| 1.1 | Cloudflare 계정 + R2 활성화(결제수단 등록, 무료 한도 내) | 👤 | — | R2 활성 | R2 대시보드 접근 |
| 1.2 | 버킷 생성 (예: `arcana-assets`) | 👤 | 1.1 | 버킷 | 생성 완료 |
| 1.3 | **공개 액세스 + 커스텀 도메인** 연결 (예: `assets.<도메인>`) | 👤 | 1.2 | 공개 URL 베이스 | 도메인으로 객체 GET 200 |
| 1.4 | S3 API 토큰 발급(Access Key/Secret, endpoint) | 👤 | 1.2 | 자격증명 | 키 확보 |
| 1.5 | (선택) CORS — `<img>` 직빙만이면 불필요 | 👤 | 1.2 | — | — |

> 의사결정 필요: **커스텀 도메인 값**(`assets.r2.dev` 기본은 rate-limit로 프로덕션 비권장).

### Phase 2 — 원본 확보 (🤖)
| ID | 작업 | 담당 | 선행 | 산출물 | 완료기준 |
|---|---|---|---|---|---|
| 2.1 | `storage.objects`에서 `card-styles` 전체 키 목록 추출(MCP) | 🤖 | — | 키 목록(351) | 목록 길이=351 |
| 2.2 | 공개 URL로 전량 로컬 다운로드 스크립트 작성·실행(바이트 그대로=무손실) | 🤖 | 2.1 | 로컬 원본 ~1.98GB | 파일수·체크섬 일치 |
| 2.3 | 무결성 검증(개수·바이트수 대조) | 🤖 | 2.2 | 검증 리포트 | 351개·용량 일치 |

> 주의: 다운로드는 Supabase egress 소모(일회성 ~2GB). Free에서 자동과금 없음(초과 시 제한 방식).

### Phase 3 — R2 업로드 (🤖 스크립트 / 실행은 1.4 토큰 필요)
| ID | 작업 | 담당 | 선행 | 산출물 | 완료기준 |
|---|---|---|---|---|---|
| 3.1 | R2 업로드 스크립트 작성(S3 SDK, 키=`card-styles/...` 보존, contentType, `Cache-Control: public,max-age=31536000,immutable`) | 🤖 | — | `scripts/.../upload-to-r2.ts` | 코드 리뷰 통과 |
| 3.2 | 업로드 실행(자격증명 env) | 🤖+👤 | 1.4,2.3,3.1 | R2 객체 351 | R2 객체수=351 |
| 3.3 | 공개 URL 샘플 검증(스타일별 1장+배경 1장 GET 200, 바이트 동일) | 🤖 | 3.2 | 검증 | 200 + 해시 일치 |

### Phase 4 — 앱 코드·설정 전환 (🤖, feature 브랜치)
| ID | 작업 | 담당 | 선행 | 산출물 | 완료기준 |
|---|---|---|---|---|---|
| 4.1 | `card-style.ts` 베이스 env 분기 (§1 스니펫) | 🤖 | 3.3 | 코드 | 단위테스트 통과 |
| 4.2 | `NEXT_PUBLIC_ASSET_BASE_URL` 추가 + `env-variables.md` 갱신 + `pnpm check:env-docs` | 🤖 | 4.1 | env/문서 | check 통과 |
| 4.3 | `next.config.ts` remotePatterns에 R2 호스트 추가 | 🤖 | 4.1 | config | 빌드 통과 |
| 4.4 | `card-style*.test.ts` 기대값 env 기반 갱신 | 🤖 | 4.1 | 테스트 | 통과 |
| 4.5 | `sonar-project.properties` 신규 스크립트 exclusions 동기화 | 🤖 | 3.1 | config | — |

### Phase 5 — 검증 (🤖+👤)
| ID | 작업 | 담당 | 선행 | 완료기준 |
|---|---|---|---|---|
| 5.1 | `pnpm type-check && pnpm lint && pnpm build` | 🤖 | Ph4 | 무오류 |
| 5.2 | `pnpm test:coverage`(임계 branches90/functions97/그외98) | 🤖 | Ph4 | 통과 |
| 5.3 | 카드 표시 전수 육안: **타로 결과·스프레드·StyleSelector·ShuffleCeremony(canvas)·배경** | 👤+🤖 | 5.1 | 4곳+배경 정상, 404 0 |
| 5.4 | E2E(`pnpm test:e2e` 또는 Docker) | 🤖 | 5.1 | 통과 |
| 5.5 | 프로덕션 배포 후 실서비스 카드 로드 확인 | 👤 | 5.3 | 정상 |

### Phase 6 — 구 데이터 정리 (🤖, **검증 완료 후에만**)
| ID | 작업 | 담당 | 선행 | 완료기준 |
|---|---|---|---|---|
| 6.1 | Supabase `card-styles` 객체 전량 삭제(MCP/스크립트) | 🤖 | 5.5 | 객체 0 |
| 6.2 | (선택) 빈 버킷 삭제 | 🤖 | 6.1 | — |
| 6.3 | Supabase Usage **< 1GB** 확인 | 🤖+👤 | 6.1 | ~224MB |
| 6.4 | PR 머지 + 포스트머지 문서 동기화(CLAUDE.md 스토리지 서술 갱신) | 🤖 | 6.3 | 머지 |

### Phase 7 — (선택) 후속 최적화
- 7.1 무손실 WebP(픽셀 동일) 재인코딩으로 전송량 추가 절감 — 화질 0 손실.
- 7.2 `card-skins`(224MB)도 동일 패턴으로 R2 이전(일원화).
- ~~7.3 별개 청소: `public/images/characters/*/_backup/` 405MB 삭제(코드 참조 0, Supabase 무관, Railway/repo 다이어트).~~ ✅ **완료(2026-07-02)** — 12개 캐릭터 `_backup/`(legacy-base·nukki·nukki-enhanced·sprites 백업 사본, 추적 226파일) 제거. 라이브 `nukki-enhanced/` 이미지 무영향.

---

## 3. 리스크 · 주의 (PR #412/#428 교훈 포함)
- **URL 베이스 불일치 = 최대 위험**: 스토리지만 바꾸고 코드 미반영 시 404→SVG 폴백(저화질). 4.1과 3.2를 한 배포에 정합.
- **6.1 삭제는 5.5 검증 후에만** — R2 미검증 상태 삭제 시 전면 깨짐. env 폴백으로 즉시 롤백 가능 상태 유지.
- `card-back.webp`의 확장자/콘텐츠 불일치는 **바이트 복사로 그대로 보존** → 동작 동일(추가 작업 불필요).
- 외부 URL `<Image>`에 **`priority` 금지**(window.load 블로킹 → E2E 타임아웃 회귀). 카드 `<Image>`는 `unoptimized` 유지.
- 커스텀 도메인 미사용(`*.r2.dev`)은 rate-limit로 프로덕션 비권장.

## 4. 롤백
- `NEXT_PUBLIC_ASSET_BASE_URL` env 제거/미설정 → 코드가 Supabase 폴백으로 복귀(6.1 삭제 전까지 무중단). 6.1 이후엔 R2가 정본.

## 5. 토큰/세션 분할 가이드 (저비용 우선)
- **무거운 건 끝남**(조사·측정 완료, 본 문서가 결과물). 실행 자체는 토큰 부담 작음.
- 권장 세션 분할:
  - **세션 A(👤 주도)**: Phase 1 — 토큰 거의 0(대시보드 작업). 커스텀 도메인 값만 확정.
  - **세션 B(🤖)**: Phase 2~3 스크립트 작성+실행 — 중. (다운로드/업로드는 대역폭 작업, 토큰 적음)
  - **세션 C(🤖)**: Phase 4~5 코드·검증 — 중.
  - **세션 D(🤖)**: Phase 6 정리·머지 — 소.
- 재개 시: 본 문서 §0 수치와 §1 영향지점만 읽으면 재조사 불필요.

---

## 6. 착수 트리거
주간 토큰 회복 후, **Phase 1의 커스텀 도메인 값**을 정하고 "R2 이전 시작 — 도메인은 `___`" 라고 알려주면 Phase 2부터 스크립트 작성에 바로 들어간다.
