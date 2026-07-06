---
name: add-translation-key
description: 번역 키를 3개 언어(ko/en/ja)에 동시 추가하는 절차를 안내한다. "번역 추가", "i18n 키 추가", "UI 텍스트 다국어", "새 텍스트 번역", "언어 키 추가" 등의 요청에 사용한다.
when_to_use: UI에 새 텍스트를 추가할 때, 번역 키가 누락됐을 때, i18n-manager 에이전트 호출 전 절차 확인 시
allowed-tools: Read Grep Bash(pnpm i18n:check)
---

# 번역 키 추가 절차 (ko/en/ja 동시)

## 번역 시스템 구조

```
src/i18n/translations/
├── shared/
│   └── keys.ts          ← SharedKeys 인터페이스 (SSOT 타입 정의)
├── ko/
│   └── index.ts         ← 한국어 번역 (SSOT — 한국어 먼저 작성)
├── en/
│   └── index.ts         ← 영어 번역
└── ja/
    └── index.ts         ← 일본어 번역
```

현재 top-level namespace 19개 (`shared/keys.ts` 정본): `common`, `header`, `footer`, `home`, `settings`, `locale`, `tarot`, `saju`, `mypage`, `character`, `user-info`, `birth-time`, `privacy-consent`, `auth`, `share`, `chat`, `api`, `meta`, `shinjeom`

## 단계별 절차

### Step 1 — SharedKeys에 타입 추가

`src/i18n/translations/shared/keys.ts`의 **단일 `SharedKeys` 인터페이스**에서 해당 namespace(중첩 객체)에 키를 추가한다. (namespace별 `XxxKeys` 인터페이스는 존재하지 않는다.)

```typescript
// 예시: tarot namespace 객체에 새 키 추가 (키는 kebab-case 관례)
export interface SharedKeys {
  // ...
  tarot: {
    // 기존 키들...
    "new-feature-title": string;   // ← 추가
    "new-feature-desc": string;    // ← 추가
  };
  // ...
}
```

### Step 2 — 한국어(ko) 먼저 작성

`src/i18n/translations/ko/index.ts`에 실제 번역 값을 추가한다. **항상 한국어를 먼저 완성한다.**

```typescript
tarot: {
  // 기존 항목들...
  "new-feature-title": "새 기능 제목",
  "new-feature-desc": "새 기능 설명",
}
```

### Step 3 — 영어(en) + 일본어(ja) 동시 추가

같은 키를 `en/index.ts`와 `ja/index.ts`에 각각 추가한다.

```typescript
// en/index.ts
tarot: {
  "new-feature-title": "New Feature Title",
  "new-feature-desc": "New feature description",
}

// ja/index.ts
tarot: {
  "new-feature-title": "新機能タイトル",
  "new-feature-desc": "新機能の説明",
}
```

### Step 4 — 검증

```bash
pnpm i18n:check
```

drift(키 불일치) 없음 확인. 에러 발생 시 누락된 언어의 키를 추가한다.

### Step 5 — UI에서 사용

```tsx
// 클라이언트 컴포넌트 — useT()는 인자 없음, 전체 키(namespace.key)로 조회
const { t } = useT();
return <h1>{t("tarot.new-feature-title")}</h1>;

// 서버 컴포넌트 / API — getRequestLocale + t(key, locale)  (getT는 존재하지 않음)
import { t as translate } from "@/i18n/translations";
import { getRequestLocale } from "@/i18n/server-locale";
const locale = await getRequestLocale();
return translate("tarot.new-feature-title", locale);
```

## 주의사항

- **AI 생성 텍스트는 번역 키를 사용하지 않는다** — AI 리딩 결과는 `ai_locale` 쿠키로 언어를 제어
- **하드코딩 금지** — 모든 UI 텍스트는 `t()` 또는 `useT()`로 노출
- **E2E 셀렉터 동반 수정** — `hasText`/`getByText`를 쓰는 E2E 테스트가 있으면 같은 커밋에 수정

## 복잡한 작업은 i18n-manager 에이전트 위임

네임스페이스 신규 생성, 대량 키 추가, 번역 키 리팩토링은:

```
i18n-manager 에이전트를 호출해서 처리해줘
```
