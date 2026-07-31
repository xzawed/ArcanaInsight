# 명세 (SDD)

> **이 폴더가 답하는 질문**: 시스템이 **무엇을 보장하는가**.
> 어떻게 구현했는지는 [`architecture/`](../architecture/), 어떻게 작업하는지는 [`workflow/`](../workflow/)가 정본이다.

---

## 명세와 설계 문서의 차이

| | 명세 (`specs/`) | 설계 (`architecture/`·`conventions/`) |
|---|---|---|
| 답하는 질문 | 무엇을 **보장**하는가 | 어떻게 **구현**했는가 |
| 어겼을 때 | **코드가 틀린 것** | 문서를 갱신할 수도, 코드를 고칠 수도 있음 |
| 수명 | 제품 결정이 바뀔 때만 변경 | 리팩터링마다 갱신 |

명세는 **검증 가능해야 한다.** 각 명세는 "무엇이 이 계약을 보증하는가"(테스트·가드·타입)를 함께 적는다. 보증 수단이 없는 계약은 계약이 아니라 희망이다.

---

## 목록

### 플랫폼 계약 (`platform/`)

서비스에 걸쳐 공통으로 성립해야 하는 계약.

| 명세 | 내용 | 보증 수단 |
|---|---|---|
| [`rendering-contract.md`](platform/rendering-contract.md) | SSR/hydration — 첫 클라이언트 렌더는 서버와 트리 모양이 같아야 한다 | `cross-platform.spec.ts`의 hydration 가드 (`retries: 0`) |

### 아직 명세화되지 않은 영역

아래는 **코드에는 계약이 있으나 명세 문서가 없는** 영역이다. 현재는 설계 문서가 대신 정본 역할을 한다.

| 영역 | 현재 정본 | 비고 |
|---|---|---|
| 리딩 결과 계약 (`directAnswer`·`overallReading`·`parseError`) | [`architecture/ai-infrastructure.md`](../architecture/ai-infrastructure.md) | `pnpm eval:reading`이 검증 |
| API 입력 계약 (Rate Limit → Zod → Auth → 소유권) | [`conventions/zod-schemas.md`](../conventions/zod-schemas.md) | `src/__tests__/api/`가 검증 |
| DB/Auth 공급자 전환 계약 | [`architecture/db-abstraction.md`](../architecture/db-abstraction.md), [`architecture/auth-abstraction.md`](../architecture/auth-abstraction.md) | 어댑터 단위 테스트 |
| i18n 키 계약 (ko/en/ja 동시성) | [`architecture/i18n.md`](../architecture/i18n.md) | `pnpm i18n:check` |
| 레이아웃 계약 (5:5, dvh, safe-area) | [`conventions/layout-rules.md`](../conventions/layout-rules.md), [`conventions/cross-platform.md`](../conventions/cross-platform.md) | E2E 레이아웃 spec |

> 이 표를 지우려고 서둘러 명세를 양산하지 않는다. **명세는 계약이 실제로 깨져 본 뒤**, 무엇을 보장해야 하는지가 분명해졌을 때 쓰는 것이 가장 정확하다. `rendering-contract.md`가 그렇게 만들어졌다.

---

## 설계 결정 기록

과거 설계 문서와 계획은 [`superpowers/specs/`](../superpowers/) 아래에 **동결 스냅샷**으로 보존된다. 링크 검사에서 제외되며 손대지 않는다 — 당시 결정을 그대로 남기는 것이 목적이다.

---

## 관련 문서

- [`tests/strategy.md`](../tests/strategy.md) — 어떤 계층이 무엇을 검증하는가
- [`wbs/README.md`](../wbs/README.md) — 남은 작업과 막힌 지점
