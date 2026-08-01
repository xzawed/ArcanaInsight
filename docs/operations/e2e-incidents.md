# E2E CI 인시던트 기록

> **이 문서는 E2E CI 안정성 조사의 정본이다.** `Target closed`·workers·러너 자원에 관한
> 계측값과 이력은 **여기에만** 둔다. 다른 문서(`known-issues.md`, `.claude/rules/**`,
> `playwright.config.ts` 주석, `docs/tests/e2e-testing.md`, `docs/wbs/`)는 **현재 운영값과
> 한 줄 요약만** 두고 이 문서를 가리킨다.

## 왜 이 문서가 따로 있는가

이 조사의 서사는 한때 **여섯 곳에 복제**돼 있었다 — `known-issues.md`의 표 셀 하나(3,786자),
`.claude/rules/e2e-testing.md`, `.claude/rules/workflow.md`(세션마다 자동 로드),
`playwright.config.ts` 주석, `docs/tests/e2e-testing.md`, `docs/wbs/README.md`.

새 사실이 나오면 여섯 곳을 고쳐야 했고, 실제로는 **가장 긴 셀 앞에 정정문을 덧붙이는** 방식으로
처리됐다. 그 결과 같은 셀 안에서 앞부분은 "OOM은 반증됐다", 뒷부분은 "OOM으로 추정된다"가
공존했다. 읽는 사람이 어느 3분의 1을 읽었느냐에 따라 결론이 갈렸다.

**규칙**: 새 인시던트는 이 파일 맨 아래 시간순으로 **추가**한다. 기존 항목은 고치지 않는다.
결론이 바뀌면 새 항목에서 이전 항목을 명시적으로 무효화한다. 표 셀에 이력을 덧붙이지 않는다.

---

## 현재 결론 (2026-08-01)

| 사실 | 근거 |
|---|---|
| GitHub Actions 러너는 **`nproc=4` · `15989 MiB`**(AMD EPYC 7763/9V74) | 6런 24잡 실측 (#522) |
| 제약 자원은 **메모리가 아니라 CPU**다 | 메모리 피크 2.4~3.4GiB(15~21%)·swap 0·dmesg OOM 흔적 0 |
| `Target page/context/browser has been closed`는 **원인이 아니라 후행 증상**이다 | 테스트가 예산을 소진해 타임아웃되면 Playwright가 페이지를 정리하며 이 메시지를 남긴다 |
| 만성 flake의 실제 원인은 **앱 결함**이었다 | 동작 줄이기 사용자의 hydration 붕괴(#525), 이미지 큐 포화로 커밋되지 않는 네비게이션(#530) |
| 현재 CI workers — **Desktop Chrome 1 · Mobile Android 2** | `deploy.yml` 매트릭스가 `E2E_WORKERS`로 주입, 미지정·비정상 값이면 1로 폴백 |
| 현재 평균 CPU busy — **42~55%**(workers:1) / **82~86%**(MA workers:2) | 잡 요약에 매 런 기록됨 |

## 폐기된 가설 (재제안 금지)

| 가설 | 어떻게 반증됐나 |
|---|---|
| **"2코어/7GB 러너 → 호스트 OOM → OOM-killer가 브라우저 kill"** (#462) | 코어 수부터 틀렸다(실측 4코어/16GB). 메모리 피크는 총량의 15~21%, swap 0, OOM 흔적 0. **결정타**: 동일 시그니처가 `workers:1` · available **13,136 MiB** · OOM 흔적 없음 상태에서 재현됐다(Mobile Android 2/2, run 30626475036) |
| **`--disable-dev-shm-usage`로 해결된다** | chromium·webkit 양쪽에서 재현 = 엔진 무관. Playwright가 이미 기본 적용하고, bare VM의 shm은 GB급이며, webkit은 이 플래그를 무시한다 |
| **캐릭터 이미지를 다운스케일하면 해소된다** | `nukki-enhanced` 2816×1536은 오독이 아니라 고DPI 큰 표시를 위한 **의도된 2x 보정본**이다([`../conventions/image-assets.md`](../conventions/image-assets.md)). 실제 해법은 다운스케일이 아니라 **사전 생성 WebP 변형**이었다(#533) |
| **재실행으로 통과하면 해결된 것이다** | 재실행 통과는 **재현성 진단 결과일 뿐**이다. 2026-07-29 실증: 가드가 카드 이미지 404를 정확히 탐지했는데 `retries:2`가 `1 flaky`로 흡수해 **3.5주간 깨진 채 green**이었다 |

---

## 시간순 기록

### 2026-07-04 — 최초 규명 시도, OOM 가설 채택 (#462, Weekly QA #461)

만성 `Target page/context/browser has been closed`를 조사해 **호스트 OOM**으로 결론지었다.
근거는 `workers:2`+`fullyParallel`이 브라우저 2개 + `pnpm start` Next 서버 + cold-cache sharp
이미지 최적화(2816×1536 84장 → 16.5MiB 비트맵 디코드)를 "2코어/7GB 러너"에 공존시킨다는 것.

**조치**: CI `workers: 2 → 1`. chromium(DC·MA)에서 시그니처가 사라졌다.

webkit(iOS)은 `workers:1`에서도 무거운 홈 이미지 테스트에서 크래시해,
`cross-platform.spec.ts`의 홈 이미지 검사를 **Desktop Chrome 전용 스코프**로 좁히고
`daily-card`의 webkit `_rsc` 프리페치 benign 에러를 필터했다(PR #464, 이슈 #463).
부수적으로 #465가 비로그인 `GET /api/profile/favorite-character`를 401→200(`{characterId:null}`)으로
바꿔 몰입형 진입 콘솔 401을 제거했고(**POST는 401 유지**), 테마 아이콘 `unoptimized`를 제거했다(653KB→webp).

> ⚠️ **이 항목의 원인 진단(OOM)은 2026-07-31에 반증됐다.** 관측 사실("비결정적·코드 무관",
> "workers:1로 빈도가 줄었다")은 유효하고, 인과 설명만 틀렸다.

### 2026-07-29 — `workers:1`에서 재발 (PR #509 CI)

동일 시그니처가 재현. Desktop Chrome이 **21건 실패·37.2m**(정상 대비 5.4배) —
`Test timeout of 30000ms exceeded` / `Target page, context or browser has been closed` /
`page.goto: net::ERR_ABORTED; maybe frame was detached?`.

실패 분포는 navigation 7·immersive-layout 3·theme 2·shinjeom-flow 2 등 **특정 spec과 무관하게 산발**.
동일 커밋 무변경 재실행 → 통과(6m53s) ⇒ **비결정적 확정**. 같은 커밋 Mobile Android는 정상
(179개 9.9m), 직전 #508 런은 Desktop Chrome 180개 7.8m 통과.

배제한 원인: PR 변경분(문서·`.gitignore`·eslint 설정·devDep 버전·`onlyBuiltDependencies` —
설치 로그에 build script 차단 경고 0·477패키지 정상), sharp WASM 폴백
(`@img/sharp-linux-x64@0.35.3` 정상 존재), 병합상태 CI 미검증(#506 15:02Z 머지 → #508 CI 15:28Z 시작).

> ⚠️ **이 시점까지 메모리 계측이 없었다.** OOM은 시그니처 일치 기반 **추정**이었고,
> 직접 관측된 것은 "비결정적·코드 무관"까지다. 이 한계가 다음 항목에서 실측으로 해소된다.

**같은 런에서 드러난 별건**: CI가 `NEXT_PUBLIC_ASSET_BASE_URL` 미설정으로 카드 이미지를 전량
404 서빙하고 있었다(`storageBase()`가 `placeholder.supabase.co`로 폴백, Supabase `card-styles`
버킷은 2026-07-03 삭제). 무결성 가드가 이를 **정확히 탐지했으나** `retries:2`가 흡수해
`1 flaky`로만 남고 CI는 green — **약 3.5주간 방치**. 수정: ① `NEXT_PUBLIC_ASSET_BASE_URL`을
**build 잡과 e2e 잡 양쪽에** 설정(`NEXT_PUBLIC_`은 빌드 타임 인라인이라 build 잡 누락 시
클라이언트 번들 미반영), ② 결함 탐지 가드를 `retries: 0` describe로 분리.

### 2026-07-31 — OOM 가설 반증, CPU가 실제 제약 (#522 → PR #524)

6런(24 E2E 잡)에 1초 간격 자원 계측을 붙여 **메모리 원인을 배제**했다.

| 측정 | 값 |
|---|---|
| 러너 사양 | `nproc=4` · `15989 MiB` (AMD EPYC 7763/9V74) — #462의 "2코어/7GB"는 **코어 수까지 틀렸다** |
| E2E 구간 메모리 피크 | **2.4~3.4 GiB (총량의 15~21%)** |
| 최저 available | 12.4~13.6 GiB |
| swap / dmesg OOM 흔적 | **0 / 0** — 전 잡 예외 없음 |
| CPU busy (workers:1) | 평균 **63~75%**, 버스트 100% (iowait 0.0~0.2% = I/O 대기가 아닌 실제 런큐) |

**결정타**: `expect.toBeVisible: Target page, context or browser has been closed`가
`workers:1` · available 13,136 MiB · swap 0 · OOM 흔적 없음 상태에서 재현됐다
(Mobile Android 2/2, run 30626475036). ∴ **이 시그니처는 OOM의 증거가 아니다.**

`workers:2` 시험(Desktop Chrome 3런)은 테스트 시간을 2.9~3.9m → **2.0~2.9m**로 줄였으나
평균 busy가 **83~95%**로 올라 30s 타임아웃 여유가 얇아졌고, **E2E 임계경로가
Mobile Android(5.0~6.3m)라 CI 벽시계 이득이 0**이어서 `workers:1`로 되돌렸다.

> 교훈: **상향 판단의 기준은 "위험"이 아니라 "이득"이다.** 임계경로가 아닌 잡을 빠르게 만들면
> 테스트 시간은 30~40% 줄어도 CI 총 시간은 그대로다.

계측(`nproc`·피크 메모리·CPU busy%·loadavg·OOM 흔적)은 잡 요약에 **상설로** 남는다.

### 2026-07-31 — 진짜 원인 ①: 동작 줄이기 사용자의 hydration 붕괴 (#525 → PR #526·#527)

`prefers-reduced-motion` 사용자에게 서버와 클라이언트의 **트리 모양이 달라져** React가
전체를 버리고 재생성하고 있었다(React error #418). CI 브라우저가 이 조건에 해당했다.

`useSyncExternalStore` + `getServerSnapshot`으로 SSR 스냅샷을 고정해 해소
(`src/hooks/useReducedMotionSafe.ts`). **평균 CPU busy가 63~75% → 42~55%로 떨어졌다** —
flake의 상당 부분은 인프라가 아니라 **앱이 매 페이지에서 낭비하던 재렌더**였다.

### 2026-08-01 — 진짜 원인 ②: 커밋되지 않는 네비게이션 (S-1, #530)

잔여 flake는 산발이 아니라 `navigation` 스크롤 테스트 **하나**로 수렴했다(3표본 12잡 중 나머지 9잡 clean).
trace 확보 인프라를 붙여 원인을 확정했다: **`click()`이 내부적으로 "waiting for scheduled
navigations to finish"에서 대기**하는데, 홈 전이가 이미지 큐 포화로 커밋되지 않아 예산을 통째로 태웠다.

즉 `Target closed`는 **원인이 아니라 결과**다 — 예산을 소진해 타임아웃된 뒤 Playwright가
페이지를 정리하며 남기는 메시지다.

### 2026-08-01 — Mobile Android `workers:2` 상향 (S-2, #531)

전제 두 가지가 바뀌어 재평가했다: ① hydration 결함 해소로 CPU 여유 확보(42~55%),
② 상시 flake 해소로 안정성 판정이 가능해졌다. 이번에는 **임계경로인 Mobile Android**를 올렸다
(Desktop Chrome은 1 유지 = 대조군).

| 측정 | 결과 |
|---|---|
| 테스트 시간 | 5.0m → **2.9m** / 4.2m → **2.7m** (약 40% 단축) |
| flaky | **0** (2런) |
| 평균 CPU busy | 82~86% |
| 피크 메모리 | 2.9~3.2 GiB (16GB 중) — 메모리는 여전히 무관 |

임계경로는 이제 **Desktop Chrome(3.8~4.7m)**으로 넘어갔다. 추가 상향 검토는
[`../wbs/README.md`](../wbs/README.md)의 **S-3**이다.

### 2026-08-01 — 근본 해소: 런타임 이미지 최적화 제거 (#521 → PR #533)

`navigation` 지연의 물리적 원인은 32px 네비게이션 아이콘 요청이 **4.8MB 캐릭터 원본의
런타임 sharp 최적화 뒤에 큐잉**되는 것이었다. 사전 생성 WebP 변형(5단 사다리)으로 전환해
런타임 최적화 자체를 제거했다.

> **이것은 CI 과제가 아니라 사용자에게 보이는 제품 결함이었다.**
> App Router는 **새 트리가 커밋될 때까지 이전 URL을 유지**한다. 이미지 큐가 포화되면 홈으로
> 이동하는 클릭이 **URL조차 바뀌지 않은 채 30초 넘게** 멈춘다(CI trace 2건 실측).
> 사용자에게는 "탭을 눌렀는데 아무 반응이 없다"로 보인다 — **"콜드 캐시 첫 방문자가 조금
> 느리다"가 아니라 네비게이션 무응답이다.** 이 재분류로 #521의 긴급도가 낮음 → 높음이 됐다.
> E2E가 이 결함을 flake처럼 보이게 만들었을 뿐, 고쳐야 할 것은 테스트가 아니라 앱이었다.

프로덕션 검증: 홈의 캐릭터 `_next/image` 요청 **24 → 0**, 스모크 5/5 통과.

---

## 운영 지침

**이 시그니처(`Target closed` + `net::ERR_ABORTED` + 30s 타임아웃 다발, **평소 7~11분의 3배 이상
소요**)를 만나면**:

1. 동일 커밋 재실행(`gh run rerun <runId> --failed`)으로 **재현성을 확인한다**.
2. 재실행 통과는 **진단 결과일 뿐 해결이 아니다.** 확인된 flake는 넘어갈 신호가 아니라
   추적해야 할 결함이며, **이 문서에 새 항목으로 기록한다**.
3. **단언 실패(깨진 이미지·콘솔 에러 등)는 이 경로 대상이 아니다.** 재시도로 통과해도 실제
   결함일 수 있다 — 2026-07-29 항목이 그 실증이다.

관련 규칙: [`../../.claude/rules/e2e-testing.md`](../../.claude/rules/e2e-testing.md) ·
테스트 정책: [`../tests/e2e-testing.md`](../tests/e2e-testing.md)
