# Zod 스키마 컨벤션 및 API 입력 검증

---

## 1. `null` vs `undefined` 규칙 ⚠️ 중요

> 2026-04-24 타로 리딩 전체 불능 장애의 원인이었습니다.

`JSON.stringify`의 동작 차이:
- `null` → 직렬화됨 (`{"field": null}`)
- `undefined` → 제거됨 (`{}`)

| 상황 | Zod 규칙 |
|------|---------|
| Zustand store 초기값이 `null`인 필드 | `.nullish()` 사용 |
| `undefined`만 올 수 있는 필드 | `.optional()` 사용 |
| 둘 다 올 수 있는 필드 | `.nullish()` 사용 |

잘못 사용하면 프로덕션에서만 400 오류 발생 (로컬 빌드·lint·tsc는 모두 통과).

---

## 2. API 스키마 필수 적용

새 API 라우트 추가 시:
1. `src/lib/validation/api-schemas.ts`에 Zod 스키마 먼저 정의
2. `safeParse()` 검증 후 로직 진행
3. **타입 단언 (`as { ... }`) 사용 금지**

```ts
// ✅ 올바른 패턴
const result = schema.safeParse(await request.json());
if (!result.success) {
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}
const { field1, field2 } = result.data;

// ❌ 금지 패턴
const body = await request.json() as { field1: string };
```

---

## 3. 기존 스키마 목록

`src/lib/validation/api-schemas.ts` — 7종:

| 스키마 | 용도 |
|--------|------|
| `TarotReadingSchema` | 타로 리딩 요청 |
| `SajuReadingSchema` | 사주 리딩 요청 |
| `ShinjeomMessageSchema` | 신점 메시지 요청 |
| `TarotSessionSchema` | 타로 세션 생성 |
| `SajuSessionSchema` | 사주 세션 생성 |
| `ShinjeomSessionSchema` | 신점 세션 생성 |
| `DailyCardSchema` | 일일 카드 요청 |

---

## 4. SSR 비결정 값 금지

`"use client"` 컴포넌트에서 React error #418(hydration mismatch) 방지:

```ts
// ❌ 금지 — SSR·CSR 불일치
const [date, setDate] = useState(new Date());
return <div>{date.toLocaleDateString()}</div>;

// ✅ 올바른 패턴
const [date, setDate] = useState<Date | null>(null);
useEffect(() => setDate(new Date()), []);
return <div>{date?.toLocaleDateString() ?? ""}</div>;
```

`new Date()`, `Math.random()` 등 비결정 값은 반드시 `useEffect` 내에서만 호출.
초기값은 `""` / `0` / `[]` / `null` 등 안전한 상수로 설정.

---

## 5. SonarCloud 테스트 리포트 주의

`sonar.testExecutionReportPaths`는 SonarCloud 전용 `<testExecutions version="1">` XML 형식만 허용 — Vitest/Playwright의 표준 JUnit `<testsuites>` 포맷과 **비호환**.

커버리지: `sonar.javascript.lcov.reportPaths` (lcov 포맷만 사용)
