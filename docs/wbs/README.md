# WBS — 잔여 작업 분해

> **정본**: 남은 일이 무엇이고 무엇에 막혀 있는지. 완료된 일의 기록은 [`operations/known-issues.md`](../operations/known-issues.md), 진행 중 이슈는 GitHub Issues가 정본이다.
>
> **갱신 시점**: 2026-08-01.

이 문서는 "언젠가 하면 좋은 것"의 목록이 아니다. **각 항목은 왜 지금 안 되어 있는지와 무엇이 있어야 되는지**를 명시한다.

---

## 1. 지금 막혀 있는 것 (Blocked)

| ID | 작업 | 막는 것 | 풀리면 할 일 |
|---|---|---|---|
| — | *(현재 막힌 항목 없음)* | — | — |

> **직전까지 막혀 있던 B-1(#521 캐릭터 반응형 변형)은 해소됐다 (2026-08-01, #533).**
> 막던 것은 R2 자격증명이었고 wrangler OAuth로 우회해 변형 420개를 업로드·전수 200 검증했다.
> 결과: 홈의 캐릭터 `_next/image` 요청 **24 → 0**, 프로덕션 스모크 5/5.
> 경위는 [`../operations/e2e-incidents.md`](../operations/e2e-incidents.md)의 2026-08-01 항목.

---

## 2. 선행 조건이 있는 것 (Sequenced)

```
E2E 안정성 확보 ──▶ workers 재평가 ──▶ CI 시간 단축
     (S-1)              (S-2)
```

| ID | 작업 | 선행 조건 | 근거 |
|---|---|---|---|
| ~~S-1a~~ | ~~`Target closed` 잔여 발생률 재측정~~ | — | **완료** — 3표본 12잡에서 잔여 flake가 **단일 테스트**(`navigation` 스크롤 후 이동)로 수렴함을 확인. 나머지 9잡은 clean |
| ~~S-1~~ | ~~E2E 잔여 비결정성 제거~~ | — | **완료(#530)** — trace로 `click()` 내부 네비게이션 대기가 예산을 태우는 것을 확인하고 evaluate 디스패치로 차단 |
| ~~S-2~~ | ~~CI `workers` 상향 재평가~~ | — | **완료** — 임계경로인 Mobile Android를 2로 상향. 2런 실측: 5.0m→2.9m·4.2m→2.7m, **flaky 0**, CPU 82~86% |
| ~~S-3~~ | ~~임계경로가 된 Desktop Chrome 상향 검토~~ | — | **종결 — 이득 없음(실측)**. 아래 참조 |

> **S-1a를 먼저 둔 것이 옳았다.** 원래 WBS는 S-1을 무조건 선행으로 두었는데, 그 사이 hydration 결함이 해소된 상태였다. 재측정 없이 "안정성 확보"를 선행 조건으로 걸었다면 S-2는 열리지 않았을 것이다.
>
> ⚠️ **`navigation.spec.ts:221` flake는 아직 해소되지 않았다.** #530·#533으로 크게 줄었으나 #533 이후 런에서도 `1 flaky`가 관측된다(job 91301390897 DC workers:1 CPU 46.6%, job 91305502434 MA workers:2 CPU 78.2% — **부하가 낮은 쪽에서도 났다**). 잡 결론은 success라 로그의 `1 flaky`를 직접 봐야 드러난다. 다음 조치는 테스트를 더 고치는 것이 아니라 **flaky 런의 trace로 실패 지점을 확정하는 것**이다. 상세: [`../operations/e2e-incidents.md`](../operations/e2e-incidents.md) 2026-08-01(2차) 항목.

> **S-3 종결 근거 (2026-08-01 실측)**
>
> ① **임계경로가 Desktop Chrome이라는 전제가 틀렸다.** S-2 이후 7런에서 임계경로는 DC 3회·MA 4회로 **교대**하고 격차는 10~104s다.
> ② **인용하던 `3.8~4.7m`은 #533 이전 값**이다. 런타임 최적화 제거 후 DC는 약 2m50s로 MA와 동률이다.
> ③ **자원 여유가 얇다.** workers:1에서 이미 평균 busy 58~63%·피크 97% 이상이다(42~55%라는 기존 기록도 실측과 어긋나 정정했다).
>
> 격차의 부호가 런마다 바뀌므로 DC만 올렸을 때의 이득 기댓값은 0에 가깝다. **남은 실질 레버는 workers가 아니라 `navigation.spec.ts:221` flake다.**
> 계측 표와 job id는 [`../operations/e2e-incidents.md`](../operations/e2e-incidents.md)가 정본.

---

## 3. 언제든 할 수 있는 것 (Ready)

| ID | 작업 | 규모 | 비고 |
|---|---|---|---|
| R-2 | 커버리지 측정 범위 점진 확장 | 소~중 | 화이트리스트 방식. 파일 추가 시 임계값 재보정 동반 |
| R-3 | 타로 `interpretation` 레거시 필드 제거 | 소 | 구포맷 저장 리딩이 소멸했는지 확인이 선행 |
| ~~R-4~~ | ~~중복 캐릭터 마스터(`default.png`) 정리~~ | — | **완료 (2026-08-01)**. 아래 참조 |

> **R-1(docs 전면 재배치)은 파기됐다.** 아래 "하지 않는 것"을 참조. 그 대신 실제로 필요했던 두 가지 — **게이트 강화**와 **테스트 문서 응집**은 완료했다.

> **R-4 완료 (2026-08-01).** `default.png`는 12명 전원 `idle.png`와 SHA-256이 일치하는 중복이었다.
> 원인은 사고가 아니라 절차였다 — 캐릭터 추가 시 `default.png`를 복사해 `idle.png`을 만들게 돼 있었고,
> 그 결과 홈이 같은 그림을 두 URL로 각각 내려받았다.
>
> **삭제 규모**: 로컬 72파일(마스터 12 + 변형 60) + R2 동일 키 72개, 약 42 MiB.
>
> **검증**: 삭제 전 4개 게이트(프로덕션 HTML `default-` 0건 · `Cache-Control: no-store` · idle 전수 200 ·
> 로컬 72파일 git 추적 · 72파일 전부 idle과 바이트 동일) 통과 후, 키 1건 시험 삭제로 동작을 확인하고 진행했다.
> 삭제 후 캐시 우회 전수 검증에서 **default 72/72 = 404, idle 72/72 = 200**, `pnpm smoke:prod` 5/5 통과.
>
> **동반 변경**: `CharacterImageFileStem`에서 `default` 제거(파일이 없는데 타입만 허용하면 그 조합이 그대로 404다),
> 업로드 스크립트를 **금지 목록 → 허용 목록**으로 전환(`nukki-enhanced/` 직속만 업로드).
> 후자는 `nukki-enhanced_bakup/`(오타)과 중간 산출물 `nukki/`가 금지 목록을 통과하던 것을 막는다.
>
> ⚠️ 되돌려야 하면 로컬 파일을 git에서 복원(`git checkout <이 커밋의 부모> -- public/images/characters`)한 뒤
> `pnpm upload:characters:r2:skip` — 존재하는 키는 건너뛰므로 사실상 선택 복구가 된다.

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
