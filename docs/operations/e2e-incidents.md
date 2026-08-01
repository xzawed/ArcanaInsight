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
| 만성 flake의 **최종 원인은 테스트 코드**였다 | `waitForFunction` 옵션이 2번째 인자에 있어 타임아웃이 걸리지 않았다 — 5초 의도가 93.1초를 태웠다(아래 2026-08-01(3차)). 앞선 앱 결함 수정(#525·#530·#533)은 별개로 유효하다 |
| 현재 CI workers — **Desktop Chrome 1 · Mobile Android 2** | `deploy.yml` 매트릭스가 `E2E_WORKERS`로 주입, 미지정·비정상 값이면 1로 폴백 |
| 현재 평균 CPU busy — **58~63%**(DC workers:1) / **86~88%**(MA workers:2) | #536 런 실측(job 91309224089·91309224110). 피크 loadavg 3.79~8.84 / nproc=4 |
| E2E 임계경로는 **고정돼 있지 않다** — DC·MA가 교대한다 | 7런 실측에서 DC 3회·MA 4회, 격차 10~104s (아래 2026-08-01 정정 항목) |

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

### 2026-08-01 (2차) — 앞선 두 항목의 결론을 정정한다

위 **S-2 항목**과 **#533 항목**이 남긴 두 결론을 실측으로 확인해 보니 사실과 달랐다.
이 문서의 규칙대로 기존 항목은 고치지 않고 여기서 명시적으로 무효화한다.

#### ① 무효화 — "임계경로는 이제 Desktop Chrome으로 넘어갔다"

**임계경로는 고정돼 있지 않다.** S-2 이후 7런의 E2E 잡 실측(잡 소요 최댓값 기준):

| run | Desktop Chrome | Mobile Android | 임계경로 | 격차 |
|---|---:|---:|---|---:|
| 30648064642 | 522s | 257s | DC | 265s |
| 30650214380 | 298s | 353s | MA | 55s |
| 30674508043 | 232s | 242s | MA | 10s |
| 30675293732 | 325s | 221s | DC | 104s |
| 30676659221 | 233s | 316s | MA | 83s |
| 30677985557 | 231s | 216s | DC | 15s |
| 30679911587 | 226s | 252s | MA | 26s |

**DC 3회 · MA 4회로 교대한다.** 게다가 `Desktop Chrome 3.8~4.7m`이라는 수치는 **#533 이전 값**이라
이미 낡았다 — #533이 런타임 이미지 최적화를 제거해 DC는 현재 약 **2m50s** 수준이고 MA와 동률이다.

따라서 "DC를 올리면 벽시계가 준다"는 전제가 성립하지 않는다. 격차의 부호가 런마다 바뀌므로,
DC만 올렸을 때의 이득 기댓값은 **0에 가깝다.** WBS **S-3은 이 근거로 종결**한다.

#### ② 무효화 — "navigation flake는 #530·#533으로 해소됐다"

**해소되지 않았다.** #533 머지 이후 런에서도 같은 테스트가 재시도를 유발한다.

| job | 프로젝트 | workers | 결과 | 평균 CPU busy |
|---|---|---:|---|---:|
| 91301390897 | Desktop Chrome | 1 | `1 flaky` · 93 passed (4.3m) | 46.6% |
| 91305502434 | Mobile Android | 2 | `1 flaky` · 94 passed (4.3m) | 78.2% |

둘 다 동일 테스트다 — `e2e/navigation.spec.ts:221:7 › 페이지 내 스크롤 후 다른 페이지 이동 시 초기화`.
**CPU 부하가 낮은 쪽(46.6%)에서도 났다**는 점이 중요하다. 자원 압박만으로는 설명되지 않는다.

잡 결론은 `success`라 `gh pr checks`로는 보이지 않는다 — **로그의 `1 flaky`를 직접 봐야** 드러난다.
이것이 "재시도가 결함을 삼킨다"는 문제의 또 다른 얼굴이다.

> 다음 조치는 **테스트를 더 고치는 것이 아니다.** `navigation.spec.ts:221`의 주석은 스스로
> "#521이 끝나면 90s 예산을 되돌린다"고 적어 뒀고 #521은 끝났다. 되돌리기 전에 flaky 런의
> trace 아티팩트(`playwright-report-*`, 보관 7일)를 열어 **실패 지점을 먼저 확정**해야 한다.

#### ③ 갱신 — CPU busy 실측치

`평균 CPU busy 42~55%(workers:1)`는 #536 런 실측과 어긋난다.

| job | 프로젝트 | workers | 평균 busy | 피크 loadavg (nproc=4) | 피크 busy |
|---|---|---:|---:|---:|---:|
| 91309224089 | Desktop Chrome | 1 | **62.5%** | 3.79 | 97.5% |
| 91309224103 | Desktop Chrome | 1 | 58.0% | 5.24 | 98.5% |
| 91309224110 | Mobile Android | 2 | **88.1%** | 8.84 | 100.0% |

workers:1에서도 이미 60% 안팎이고 피크는 97% 이상이다 — **DC 상향의 자원 여유는 문서가
말하던 것보다 얇다.** 이것도 S-3 종결 근거에 포함된다.

---

### 2026-08-01 (3차) — 만성 flake의 진짜 원인: 캡이 걸리지 않은 대기 하나

`navigation.spec.ts`의 잔여 flake를 trace 아티팩트로 추적해 원인을 확정했다.
**인프라도 앱도 아니었다 — 테스트 코드의 시그니처 오용이었다.**

#### 실측 (run 30676659221, job 91305502434, Mobile Android)

| 단계 | 소요 |
|---|---:|
| Navigate to `/tarot` | 0.5s |
| Expect `toBeVisible` (캐릭터 카드) | 0.2s |
| Evaluate `window.scrollTo(0, 300)` | 0.1s |
| **Wait for function** | **93.1s** ← 전 예산 소진 |
| After Hooks (teardown) | 4.1s |
| **테스트 총계** | **94.2s** |

문제의 코드는 **5초 캡을 의도**했다.

```ts
await page.waitForFunction(() => window.scrollY > 0, { timeout: 5000 }).catch(() => {});
```

#### 왜 5초가 93초가 되는가

시그니처는 `waitForFunction(pageFunction, arg?, options?)`이고 **`arg`의 타입이 `any`**다.
따라서 `{ timeout: 5000 }`은 `options`가 아니라 **`arg`로 직렬화되어 페이지에 넘어가고**,
predicate가 인자를 쓰지 않으면 조용히 버려진다. `options`는 `{}`가 된다 —
`playwright-core/lib/client/frame.js`에 옵션을 추론하는 휴리스틱은 **없다**.

그리고 이 저장소는 `use.actionTimeout`을 설정하지 않으므로 기본값이 **0 = 무제한**이다
(`playwright/lib/index.js`의 `actionTimeout: [0, …]` → `_defaultContextTimeout = 0`).
결국 이 대기는 **테스트 예산을 전부 태울 때까지 멈추지 않는다.**

`.catch(() => {})`로 soft wait를 의도한 자리도 **거부가 발생하지 않아 catch가 실행되지 않는다.**
TypeScript도(`arg: any`) 기본 lint 규칙도(해당 규칙 없음) 이것을 잡지 못한다.

#### 배제한 가설 — 전부 증거로

| 가설 | 반증 |
|---|---|
| 브라우저 사망·OOM | 스크린캐스트 프레임 **454개가 90초 내내 균일**(~4.6fps) — 살아서 렌더 중이었다 |
| 네트워크 지연 | 네트워크 trace **83건 요청 전부 완료**, 미완료 0 |
| 목적지(홈)가 느림 | 홈에 도달조차 못 했다. `/tarot`의 scrollY 대기에서 멈췄다 |
| CPU 압박 | 같은 테스트가 Desktop Chrome workers:1 · **평균 CPU 46.6%** 에서도 실패했다 |

> 이 표가 중요한 이유: 이 flake는 그동안 **인프라 문제로 세 번 오진**됐다(OOM → workers →
> 목적지 속도). 매번 그럴듯했고 매번 틀렸다. 원인은 처음부터 테스트 코드 한 줄에 있었다.

#### 간헐적이었던 이유

`window.scrollY > 0`은 보통 즉시 참이 된다. 참이 되지 않는 경우 —
문서가 뷰포트보다 짧아 `scrollTo`가 no-op이 되는 순간 — 에만 무한 대기가 된다.
**예산을 90초로 올린 조치는 실패를 더 느리게 만들었을 뿐이다.**

#### 조치

- 저장소 전체에서 같은 오용 **27곳**을 찾아 `waitForFunction(fn, undefined, { … })`로 교정.
  이미 올바르던 3인자 2곳(`theme.spec.ts`·`cross-platform.spec.ts`)은 건드리지 않았다
- **ESLint 커스텀 룰** `arcana/no-waitforfunction-options-as-arg` 신설 —
  `eslint-plugin-playwright`에 해당 규칙이 없어 직접 만들었다. 셀프테스트에 등록해 red 검증
- `navigation.spec.ts:221`에 **스크롤 가능 여부 hard gate** 추가. 이게 없으면 문서가 짧을 때
  scrollY가 0→0이라 "초기화 성공"으로 **공허하게 통과**한다 — 정작 검증하려던 것을 못 본다
- 예산 재산정: `test.setTimeout` 90s → **60s**, 단계 예산 합 46s
  (성공 시도 trace 실측 총시간은 **2.1초**였다)

#### 후속 (같은 날, 수정 검증 중 드러난 2차 원인)

타임아웃을 고치자 **경계 안에서 정확히 실패**했다 — 93초 hang 대신
`TimeoutError: page.waitForFunction: Timeout 3000ms exceeded` (`navigation.spec.ts:258`).
이것이 수정의 첫 성과다: 이제 실패가 원인을 가리킨다.

드러난 2차 원인: `/tarot`은 `useResetScrollOnStep(step)`을 쓰는데, 이 훅이 마운트 시
`window.scrollTo(0, 0)`을 **즉시 + rAF + rAF 이중**으로 세 번 실행한다
("다양한 렌더링 타이밍에 대응"이 의도). 테스트의 `scrollTo(0, 300)`가 그 사이에 끼면
곧바로 0으로 되돌려져 `scrollY > 0`이 영원히 참이 되지 않는다. hydration 타이밍에 달려
있어 **간헐적**이다. 홈에서 같은 패턴이 통과하는 이유가 이것이다 — **홈은 이 훅을 쓰지 않는다.**

앱 동작은 의도된 것이므로 테스트가 맞췄다: `expect.poll`로 **스크롤이 유지될 때까지 재시도**하고,
진짜로 불가능하면 5초 안에 실패한다. 로컬 Mobile Android **5회 연속 통과**(8.5~10.5초).

---

### 2026-08-01 (4차) — `ERR_BLOCKED_BY_ORB` 최초 관측 (미해결, 관측 중)

PR #542 CI에서 이미지 무결성 가드(`retries: 0`)가 처음 보는 실패를 냈다.

```
[Desktop Chrome] › e2e/cross-platform.spec.ts › 이미지 — 모든 이미지 로드 성공
Error: 네트워크 이미지 실패: net::ERR_BLOCKED_BY_ORB
       https://cdn.xzawed.xyz/characters/haru/nukki-enhanced/idle-320.webp
```

#### 사후 실측 — 자산은 온전하다

| 검사 | 결과 |
|---|---|
| `haru/idle-320.webp` | **200 · `Content-Type: image/webp` · 4950 bytes** |
| 12캐릭터 `idle-320.webp` content-type | **전부 `image/webp`** |
| R2 ↔ 로컬 무결성(크기 + ETag=md5) | **12/12 완전 일치** |
| 이 시그니처의 CI 이력 | 최근 5런 **0건 — 이번이 최초** |
| 동일 커밋 재실행 | **통과** (재현 안 됨) |

#### 판정: 일시적 전달 조건 — 다만 **해결이 아니라 관측 중**이다

ORB(Opaque Response Blocking)는 Chrome이 no-cors `<img>` 응답을 "이미지로 안전하게 쓸 수
있는가"로 걸러 막는 기능이다. **정상 webp 바이트 + `image/webp` + 200이면 발동할 이유가 없다.**
따라서 사후 실측과 모순되지 않으려면 **CI 그 순간의 응답이 지금과 달랐어야** 한다 —
Cloudflare 챌린지/인터스티셜, WAF·rate limit 페이지, 5xx, 또는 200으로 위장한 비이미지 본문.

> R-4(default 72키 삭제)와의 인과는 **약하다.** 삭제 대상은 `default*`뿐이고 idle은 전수 200이며,
> 삭제 직후 돌아간 런 2건(30682887736·30681342481)은 ORB 0건이었다.

#### ⚠️ ORB를 `ERR_ABORTED`처럼 예외로 넣지 마라

| | `net::ERR_ABORTED` | `net::ERR_BLOCKED_BY_ORB` |
|---|---|---|
| 의미 | 요청 **취소**(hydration `src` 교체·언마운트) | 응답 수신 후 **"이미지가 아니다"로 차단** |
| 사용자 체감 | 교체 성공 시 정상 | **그 이미지는 실제로 깨져 보인다** |
| 예외 처리 | 정당 | **금지** |

예외로 넣으면 200으로 위장한 챌린지 페이지·잘못된 본문을 삼키게 된다. 그것은 카드 이미지 404를
**3.5주간 green으로 통과**시킨 2026-07-29 사고와 같은 방향의 후퇴다.

#### 조치 — 예외가 아니라 관측과 위생

- 가드에 **진단 메타 기록** 추가: 실패 시 `status`·`content-type`·`cf-cache-status`·`cf-ray`를
  함께 남긴다. 지금 형태는 "ORB only"라 **200+비이미지**와 **4xx**를 구분할 수 없다 —
  그것이 이번 조사를 어렵게 만든 구조적 맹점이었다
- **캐릭터 자산에 `Cache-Control` 누락을 교정**(`upload-characters-r2.ts`). 카드·스킨은
  `public, max-age=31536000, immutable`인데 캐릭터만 없어 `cf-cache-status: DYNAMIC`이었다 —
  **가장 무거운 자산이 매 요청 오리진을 탔다.** ORB의 증명된 원인은 아니지만 노출을 줄인다
  > ⚠️ 기존 R2 객체에는 소급 적용되지 않는다. 헤더를 실제로 반영하려면 재업로드가 필요하다

#### 재발하면 볼 것

1. 실패 메시지의 **메타 필드** — `status<400 + ct=text/html`이면 챌린지/인터스티셜,
   `status>=400`이면 오리진·키 문제, `ct=image/*`인데 ORB면 본문 위장
2. 러너에서 **독립 probe**: `curl -sI` + `curl -s --range 0-15 | xxd` (기대: `RIFF….WEBP`).
   브라우저만 막히고 curl은 정상이면 **엣지 차등**(봇/IP) 후보
3. Cloudflare **Security Events**를 `cf-ray`·시각으로 조회 — Bot Fight Mode,
   Browser Integrity Check, rate limiting 규칙이 GitHub Actions IP를 오탐하는지
4. 다수 URL 동시 ORB면 WAF/CF 장애, 특정 캐릭터·폭만 반복이면 객체·키 문제

**임계값**: 2주 내 2회 이상 같은 시그니처면 CDN 설정 조사를 우선한다. 그때도 가드 예외는 금지다.

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
