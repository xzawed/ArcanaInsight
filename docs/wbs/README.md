# WBS — 잔여 작업 분해

> **정본**: 남은 일이 무엇이고 무엇에 막혀 있는지. 완료된 일의 기록은 [`operations/known-issues.md`](../operations/known-issues.md), 진행 중 이슈는 GitHub Issues가 정본이다.
>
> **갱신 시점**: 2026-07-31.

이 문서는 "언젠가 하면 좋은 것"의 목록이 아니다. **각 항목은 왜 지금 안 되어 있는지와 무엇이 있어야 되는지**를 명시한다.

---

## 1. 지금 막혀 있는 것 (Blocked)

| ID | 작업 | 막는 것 | 풀리면 할 일 |
|---|---|---|---|
| B-1 | **#521** 캐릭터 이미지 사전 생성 반응형 변형 | **R2 자격증명(`.env.r2.local`)** — 작업 환경에 없어 파이프라인 끝단 검증 불가 | 변형 생성 스크립트 → 폭 매핑 로더 → `upload:assets:r2` 계열로 업로드 |

> B-1은 **전제가 한 번 정정됐다.** 원래 근거였던 "E2E OOM의 원인"은 #522 실측으로 무효화됐다(메모리 피크 2.4~3.4GiB/16GB, OOM 흔적 0). 남는 정당한 근거는 **콜드 캐시 첫 방문자의 Railway sharp 디코드 비용** 하나이며, 따라서 CI 과제가 아니라 **프런트 성능 과제**다. 긴급도는 낮다.

---

## 2. 선행 조건이 있는 것 (Sequenced)

```
E2E 안정성 확보 ──▶ workers 재평가 ──▶ CI 시간 단축
     (S-1)              (S-2)
```

| ID | 작업 | 선행 조건 | 근거 |
|---|---|---|---|
| **S-1a** | **`Target closed` 잔여 발생률 재측정** | — | hydration 결함(#525)이 flake의 **얼마나 큰 몫**이었는지 아직 모른다. 동일 커밋을 여러 번 돌려 현재 main의 실제 발생률을 먼저 잰다 |
| S-1 | E2E 잔여 비결정성 제거 | **S-1a 결과** | 발생률이 사실상 0이면 S-1은 **모니터링으로 강등**하고 S-2로 넘어간다. 여전히 유의미하면 그때 조사한다 — hydration을 또 고치는 일이 아니다 |
| S-2 | CI `workers` 상향 재평가 | S-1 판정 | 상시 flake가 있으면 `workers:1`과 `2`의 안정성 차이를 분리할 수 없다. #522에서 이 이유로 상향을 보류했다 |

> **S-1a를 먼저 두는 이유**: 원래 WBS는 S-1을 무조건 선행으로 두었는데, 그 사이 hydration 결함이 해소됐다. **남은 flake가 얼마인지 모르는 채로** "안정성 확보"를 선행 조건으로 걸면 S-2가 영원히 열리지 않는다. 재측정이 판정을 대신한다.

> **S-2를 시작하는 방법**: `deploy.yml` 매트릭스의 `workers:` 값만 바꾸면 된다(`E2E_WORKERS`로 주입). 잡 요약에 `nproc`·피크 메모리·CPU busy%·loadavg가 매 런 기록되므로 판단 근거는 이미 갖춰져 있다.
>
> **알려진 사실**: 4코어 러너에서 `workers:1`이 이미 평균 CPU busy 63~75%다. `workers:2`는 Desktop Chrome 테스트를 2.9~3.9m → 2.0~2.9m로 줄이지만 busy가 83~95%가 된다. 그리고 **E2E 벽시계의 임계경로는 Mobile Android(5.0~6.3m)** 이므로 Desktop Chrome만 올리면 CI 총 시간은 줄지 않는다.

---

## 3. 언제든 할 수 있는 것 (Ready)

| ID | 작업 | 규모 | 비고 |
|---|---|---|---|
| R-2 | 커버리지 측정 범위 점진 확장 | 소~중 | 화이트리스트 방식. 파일 추가 시 임계값 재보정 동반 |
| R-3 | 타로 `interpretation` 레거시 필드 제거 | 소 | 구포맷 저장 리딩이 소멸했는지 확인이 선행 |

> **R-1(docs 전면 재배치)은 파기됐다.** 아래 "하지 않는 것"을 참조. 그 대신 실제로 필요했던 두 가지 — **게이트 강화**와 **테스트 문서 응집**은 완료했다.

---

## 4. 의도적으로 하지 않는 것 (Won't do — 재제안 금지)

재검토 비용을 없애기 위해 명시한다. 상세 근거는 [`operations/known-issues.md`](../operations/known-issues.md)의 "파기 확정 항목".

| 항목 | 이유 |
|---|---|
| rate-limit Redis 전환 | **이미 구현돼 있다** (`checkUpstash`). env 미설정 시 in-memory 폴백이며 Railway 단일 인스턴스에선 동등 |
| `postgres-adapter.ts` `as any` 6건 제거 | 런타임 버그 없음. Drizzle 제네릭 구조적 불일치라 재설계 비용이 불합리 |
| parseError 리딩 resume 기능 | 저가치 엣지케이스 과설계. 현 필터링 동작이 올바름(사용자 확정) |
| SupabaseAdapter 통합 테스트 | CI Test DB 투자 대비 효용 부족. E2E가 DB 계층을 간접 커버 |
| **러너 메모리 증설(larger runner)** | #522 실측상 **무의미** — 메모리는 병목이 아니다(13GB 여유) |
| **docs 전면 재배치** (`architecture`·`conventions` → `design/`, `operations` → `ops/`, `workflow` 3분할) | 검토 결과 **비용만 크고 이득이 없다.** ① `docs/design/`은 이미 시각 디자인 자산이 점유해 이름이 충돌한다 — "자산은 동결, 그런데 여기로 옮긴다"는 계획 자체가 모순이었다. ② 코딩 스타일·Zod·커밋 규칙은 제품 디자인이 아니라 **엔지니어링 컨벤션**이라 `design/`은 잘못된 분류다. ③ `workflow/`를 tests·ops·process로 3분할하면 `ci-cd.md`·`scripts.md` 같은 경계 문서의 **소속이 모호**해져 오배치가 는다. ④ `operations` → `ops`는 순수 개명이라 참조 churn만 남는다. **실제로 필요했던 것**(테스트 문서 응집, 게이트 강화)은 이미 처리했다 |

---

## 4-1. 최근 해소 (기록)

| 항목 | 처리 |
|---|---|
| **문서 게이트가 정작 진입 문서를 검사하지 않던 문제** | `check-doc-links`가 `docs/` 안만 봤다. 링크가 가장 많고 세션마다 읽히는 `CLAUDE.md`(25곳)·`.claude/**`·루트 `README*.md`·`e2e/README.md`는 **아무도 검사하지 않았다.** 범위를 확장(33 → 58파일) |
| **`check-env-docs`의 조용한 통과** | 정본 문서가 없으면 경고만 찍고 `exit(0)`이었다. 문서를 옮기면 **검사가 꺼진 채 CI가 초록**이 된다. 하드 실패로 전환하고 red→green 실증 |
| 테스트 문서 응집 | `unit-testing.md`·`e2e-testing.md`를 `workflow/` → `tests/`로 이동해 `strategy.md`와 같은 곳에 뒀다 |

## 5. 상류를 기다리는 것 (Waiting)

| 항목 | 조건 |
|---|---|
| `brace-expansion` dev 전용 취약점 | 상류 eslint/minimatch가 patched 2.x line을 채택하면 자동 해소. 블랭킷 override는 lint를 깨뜨림(실증) |

---

## 관련 문서

- [`operations/known-issues.md`](../operations/known-issues.md) — 완료·파기 기록의 정본
- [`tests/strategy.md`](../tests/strategy.md) — S-1의 판단 기준
- [`specs/platform/rendering-contract.md`](../specs/platform/rendering-contract.md) — S-1에서 이미 해소된 부분
