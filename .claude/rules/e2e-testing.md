---
paths:
  - "e2e/**"
---

# E2E 테스트 규칙

## 셀렉터 오탐 방지 패턴

```typescript
// ❌ 금지 — hidden 요소 오탐
page.locator('img').first()
page.getByText('짧은글자')

// ✅ 권장 — aria-label 또는 data-testid 우선
page.getByRole('button', { name: '타로 시작하기' })
page.getByTestId('start-button')

// ✅ 텍스트 셀렉터는 충분히 고유한 문자열만
page.getByText('카드를 직접 선택해주세요', { exact: true })
```

## service-navigation.ts 헬퍼 의존성

서비스 진입 로직(타로/사주/신점 페이지 이동, 주제 선택, 카드 선택)은  
**반드시** `e2e/helpers/service-navigation.ts` 1파일에 집중한다.

UI 변경 시 이 파일을 **먼저** 수정 → 이 파일을 import하는 spec 파일들은 자동 대응.  
직접 수정하면 PR #347~#350 패턴(4개 spec 일괄 실패) 재발.

```bash
# 영향 파일 사전 탐색 필수
grep -rn "service-navigation" e2e/ --include="*.ts"
```

## CI 재현성 필수 조건

1. **`playwright.config.ts`의 `use.locale: "ko"` 유지 필수**  
   CI 브라우저 기본값 en-US → 제거 시 SSR 영어 렌더링 → 한국어 단언 전부 실패 (PR #243, 23개 실패)

2. **CI vs 로컬 차이**
   - CI: `pnpm start` (프로덕션 빌드), retries: 2
   - 로컬: `pnpm dev`, retries: 0, reuseExistingServer: true
   - Pre-PR 훅에 E2E 전체 포함 권장 안 함 — CI에서 재검증

3. **hidden 요소 확인**  
   모바일 뷰포트에서 데스크탑 전용 요소가 hidden 처리되므로,  
   `toBeVisible()` 단언 전에 뷰포트 컨텍스트 확인.

## 컴포넌트 삭제·교체 전 testId 사전 점검

컴포넌트를 삭제하거나 다른 컴포넌트로 교체하기 전에 E2E가 의존하는 testId가 없는지 확인한다.

```bash
# 변경 전 필수 실행
grep -rn "getByTestId\|data-testid" e2e/ --include="*.ts" | grep "<변경할 컴포넌트명>"
```

testId가 발견되면 새 컴포넌트에 동일한 testId를 유지하거나 E2E를 동시 수정한다.  
**같은 커밋에 포함하지 않으면 CI에서 즉시 실패한다.** (PR #412 1차 실패 원인)

## 외부 URL Image에 priority 금지

Cloudflare R2/CDN(`cdn.xzawed.xyz`)·Supabase Storage 등 외부 URL을 `src`로 쓰는 `<Image>`에는 **`priority` 속성을 붙이지 않는다.**

```tsx
// ❌ 금지 — <link rel="preload"> 가 window.load 를 블로킹
<Image src="https://...supabase.co/..." priority ... />

// ✅ 권장 — loading="lazy" 기본값, window.load 비블로킹
<Image src="https://...supabase.co/..." ... />
```

`priority` 는 `<link rel="preload">` 를 `<head>` 에 추가하므로 CI 환경에서 외부 이미지 응답이
느리면 `waitForLoadState("load")` 가 20-30s 블로킹 → E2E 타임아웃 유발.  
LCP 요소(히어로 이미지 등)가 아닌 배경·데코 이미지에는 절대 사용하지 않는다. (PR #412 2차 실패 원인)

## 텍스트 변경 시 E2E 동시 수정 규칙

버튼·레이블 텍스트를 변경할 때는 **같은 커밋**에 E2E 셀렉터도 수정한다.

```bash
# 변경 전 영향 파일 grep 필수
grep -rn '"변경할 텍스트"' e2e/ --include="*.ts"
grep -rn "hasText.*변경할" e2e/ --include="*.ts"
```
