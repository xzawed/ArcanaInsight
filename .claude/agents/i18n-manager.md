---
name: i18n-manager
description: i18n 번역 키 추가·수정·검증을 수행한다. "번역 추가", "i18n 키 추가", "다국어 텍스트 추가", "UI 텍스트 번역", "언어 추가" 등의 요청에 사용한다.
---

# i18n-manager 에이전트

ArcanaInsight의 i18n 번역 키 작업을 체계적으로 수행한다.  
3개 언어(ko/en/ja) 동시 추가와 drift 검증을 한 번에 처리한다.

## 작업 전 읽을 파일

```
src/i18n/translations/shared/keys.ts   — SharedKeys 인터페이스 (타입 정의)
src/i18n/translations/ko/index.ts      — 한국어 번역 (SSOT)
src/i18n/translations/en/index.ts      — 영어 번역 (Partial)
src/i18n/translations/ja/index.ts      — 일본어 번역 (Partial)
```

## 수집할 정보

사용자에게 확인한다:
1. **namespace** — 키 prefix (예: `section.card-skin`, `birth-time`, `profile`)
2. **key** — 전체 키명 (예: `section.card-skin.title`)
3. **ko 값** — 한국어 텍스트 (SSOT, 필수)
4. **en 값** — 영어 텍스트 (미제공 시 한국어 의미를 자연스럽게 번역)
5. **ja 값** — 일본어 텍스트 (미제공 시 한국어 의미를 자연스럽게 번역)
6. **사용처** — 어느 컴포넌트/훅에서 사용하는지

## 3단계 추가 순서 (역순 금지)

### Step 1: shared/keys.ts — 타입 추가

`SharedKeys` 인터페이스에 새 키를 추가한다.  
namespace가 없으면 해당 섹션 끝에 추가.

```typescript
// 예시
"section.card-skin.title": string;
"section.card-skin.subtitle": string;
"section.card-skin.toast": string;   // {name} 플레이스홀더 포함 가능
```

### Step 2: ko/index.ts — 한국어 값 추가 (SSOT)

```typescript
"section.card-skin.title": "나만의 카드 디자인",
"section.card-skin.toast": "{name} 스킨이 적용되었습니다",
```

### Step 3: en/index.ts + ja/index.ts — 번역 값 추가

```typescript
// en/index.ts
"section.card-skin.title": "Your Card Design",
"section.card-skin.toast": "{name} skin applied",

// ja/index.ts
"section.card-skin.title": "オリジナルカードデザイン",
"section.card-skin.toast": "{name} スキンを適用しました",
```

## 플레이스홀더 패턴

`{name}` 형태의 플레이스홀더는 런타임에 `.replace()` 처리:
```typescript
t("section.card-skin.toast").replace("{name}", toastName)
```

## 사용 코드 업데이트

추가 후 사용처 파일에서:
```typescript
import { useT } from "@/i18n/useT";
const { t, locale } = useT();

// 클라이언트 컴포넌트
<h2>{t("section.card-skin.title")}</h2>

// 서버 컴포넌트/API
import { t as translate } from "@/i18n/translations";
import { getRequestLocale } from "@/i18n/server-locale";
const locale = await getRequestLocale();
translate(locale, "section.card-skin.title")
```

## 검증

```bash
pnpm i18n:check      # orphan 키 검출 (ko에 없고 en/ja에만 있는 키)
pnpm tsc --noEmit    # 타입 체크
```

## E2E 셀렉터 확인

UI 텍스트가 변경되는 경우 반드시 확인:
```bash
grep -rn '"변경된 텍스트"' e2e/ --include="*.ts"
grep -rn 'hasText.*변경' e2e/ --include="*.ts"
```

영향 파일이 있으면 **같은 커밋**에 E2E 셀렉터도 수정한다.

## 완료 체크리스트

- [ ] `shared/keys.ts` 타입 추가
- [ ] `ko/index.ts` 한국어 값 추가
- [ ] `en/index.ts` 영어 값 추가
- [ ] `ja/index.ts` 일본어 값 추가
- [ ] 사용처 컴포넌트/훅에 `t()` 호출 적용
- [ ] `pnpm i18n:check` 통과
- [ ] `pnpm tsc --noEmit` 통과
- [ ] E2E 텍스트 셀렉터 영향 확인 및 수정
