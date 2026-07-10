# 크로스 플랫폼 품질 규칙 (필수 준수)

모든 UI 변경 시 데스크탑(Chrome), 모바일(iOS Safari, Android Chrome) 동일 품질을 보장해야 합니다.

---

## 1. 뷰포트 높이

| 규칙 | 이유 |
|------|------|
| **`100vh` / `min-h-screen` 사용 금지** | Tailwind `min-h-screen`은 `min-height:100vh`로 컴파일된다. `100vh`는 모바일에서 large viewport(주소창 숨김 높이)로 해석되어 가시 영역(`100dvh`)을 초과한다. 더 나아가 **페이지 래퍼의 `min-h-screen`은 `main`의 `pt-14 pb-14`(112px)와 합산되어** 콘텐츠 길이와 무관하게 document가 항상 가시 뷰포트를 초과하는 '유령 스크롤'(빈 영역)을 만든다 → 사용자가 가짜 바닥(false bottom)을 페이지 끝으로 오인 (PR #428) |
| **`min-h-dvh` / `100dvh` 사용** | Dynamic Viewport Height — 실제 보이는 영역에 정확히 맞춤. `body`는 `min-h-dvh flex flex-col`(sticky-footer 컨테이너) |
| 풀스크린 영역은 chrome 오프셋을 차감 | 헤더(3.5rem) + 모바일 네비(3.5rem)를 뺀 가용 높이를 사용 |

패턴:
```css
/* 스테이지가 화면을 정확히 채워야 할 때(몰입형 등) */
h-[calc(100dvh-7rem)]            /* 모바일: 헤더+네비 차감 */
md:h-[calc(100dvh-3.5rem)]       /* 데스크탑: 헤더만 차감 */

/* 중앙정렬·풀스크린 래퍼의 최소 높이(오버플로 없이 채움) */
min-h-[calc(100dvh-7rem)]
md:min-h-[calc(100dvh-3.5rem)]
```

- **콘텐츠 페이지 래퍼에는 viewport 높이 min을 두지 않는다.** `body`(`min-h-dvh flex flex-col`) + `main`(`flex-1`) + `Footer`(`mt-auto`)의 sticky-footer 구조가 짧은 콘텐츠에서도 화면을 채우므로, 페이지 래퍼의 `min-h-screen`은 중복이며 위의 유령 스크롤을 유발한다.
- **중앙정렬이 필요한 래퍼**(로그인 등)만 `min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)]`로 chrome을 차감해 채운다.
- ⚠️ **`dvh` 기반 `min-height` + 외부 lazy 이미지 동거 금지 (E2E load 지연 회귀)**: `ServiceBackground`처럼 외부(Cloudflare R2/CDN `cdn.xzawed.xyz`) URL `loading="lazy"` 이미지를 렌더하는 페이지의 래퍼에 `min-h-[calc(100dvh-…)]`(dvh) 를 쓰면, lazy 이미지의 load 가 ~수십초 지연되어 Playwright `waitForLoadState("load")` 가 타임아웃한다(PR #428에서 `(immersive)` 진입 페이지·`PageSpinner` 적용 시 `navigation.spec.ts` 회귀로 확인). 외부 이미지 페이지는 **dvh 래퍼를 두지 말고** 스테이지 자체(`h-[calc(100dvh-7rem)]`)로 높이를 지배한다(몰입형 진입 페이지는 outer min-height **제거**로 해소 — PR #431, §6). 외부 lazy 이미지가 없는 페이지(중앙정렬 로그인=로컬 bg, `PageSpinner`)만 `min-h-[calc(100dvh-…)]` 허용.

---

## 2. Safe Area (노치/홈바 대응)

`src/app/layout.tsx`:
```ts
viewport: { viewportFit: "cover" }
```

`src/app/globals.css`:
```css
body { padding-top: env(safe-area-inset-top); }
```

- **하단 고정 요소**(MobileNav 등): 반드시 `pb-[env(safe-area-inset-bottom)]` 적용
- 새로운 `position: fixed` bottom 요소 추가 시 safe area 패딩 필수
- **문서 끝 흐름(flow) 요소 ↔ 고정 하단 네비 겹침 주의**: `MobileNav`(fixed bottom-0, 불투명)는 뷰포트 하단 ~3.5rem + safe-area를 덮는다. `main`의 `pb-14`는 `main` **자기 콘텐츠**만 회피시키므로, `main` **바깥 형제**인 `Footer`처럼 문서 끝에 오는 요소는 직접 클리어런스를 가져야 한다.
  - `Footer`: `pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0` (모바일 네비 본체 + safe-area 회피, 데스크탑은 네비가 `md:hidden`이라 패딩 제거). 미적용 시 저작권 행이 네비 뒤로 영구히 가려진다 (PR #428).

---

## 3. 터치 인터랙션

`globals.css`에 전역 적용 (수정 금지):

```css
* { -webkit-tap-highlight-color: transparent; }
button, a, input { touch-action: manipulation; }   /* 더블탭 줌 방지 */
```

- `overflow-x: clip` 사용 (`overflow-x: hidden` 대신 — iOS 스크롤 바운스 호환)

---

## 4. 포커스 관리

```css
:focus { outline: none; }
:focus-visible { outline: 2px solid ...; }   /* 키보드만 표시 */
```

- `FocusReset` 컴포넌트가 페이지 전환 시 포커스 해제 + 스크롤 초기화 자동 처리
- `<Link>`, `<button>` 클릭 후 포커스 잔류 → CSS 전역 처리로 해결됨

---

## 5. 스크롤 컨테이너

`globals.css`에 전역 적용:
```css
.overflow-y-auto { -webkit-overflow-scrolling: touch; }
```

- `FocusReset`이 페이지 전환 시 내부 스크롤 컨테이너 `scrollTop = 0` 자동 초기화

---

## 6. 레이아웃 그룹 — 몰입형 vs 사이트 (이중 스크롤 방지)

App Router Route Group으로 렌더 라우트를 두 레이아웃으로 분리합니다 (괄호 그룹은 URL에 영향 없음).

| 그룹 | 레이아웃 파일 | Footer | 대상 라우트 |
|------|-------------|--------|-----------|
| **(immersive)** | `src/app/(immersive)/layout.tsx` | **미렌더** | 타로·사주·신점 진입/세션 페이지, `character/[id]` |
| **(site)** | `src/app/(site)/layout.tsx` | 렌더 | 홈, `*/result/[id]`, 마이페이지, 설정, 약관·개인정보, auth, dev |

- **RootLayout**(`src/app/layout.tsx`)은 `html`/`body`·Provider·`Header`·전역 오버레이(ToastHost, LocaleConfirmModal, InteractionClickParticles)만 렌더한다. `main`/`Footer`/`MobileNav` 소유권은 그룹 레이아웃에 있다.
- **이중 스크롤 금지**: `100dvh` 몰입형 스테이지 아래로 Footer가 붙으면 document가 추가로 스크롤되는 '이중 스크롤'이 발생한다. 몰입형 그룹은 **Footer를 렌더하지 않아** 구조적으로 이를 차단한다. 새 몰입형 페이지는 반드시 `(immersive)/` 그룹에 둔다.
- 몰입형 `main`은 `pt-14 pb-14 md:pb-0`(Header·MobileNav 높이 보정) + `MobileNav`를 유지한다.
- **몰입형 진입 페이지 outer 래퍼는 min-height를 두지 않는다** (`relative overflow-hidden`, PR #431): 내부 스테이지(`h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)]`)가 높이를 직접 지배해 `main`이 정확히 가시 뷰포트를 채운다(이중 스크롤 0). outer에 `min-h-screen`(100vh)을 두면 스테이지 위로 ~112px 잉여 스크롤이 생기고, `min-h-[calc(100dvh-…)]`(dvh)로 바꾸면 외부 `ServiceBackground` lazy 이미지 load 지연으로 E2E `load` 타임아웃(§1) — **둘 다 금지, min-height 제거가 정답**.
- **(site) 그룹은 sticky-footer 구조로 정렬**: `body`(`min-h-dvh flex flex-col`) + `main`(`flex-1`) + `Footer`(`mt-auto`). (site) 페이지 래퍼에는 `min-h-screen`을 두지 않는다(§1 유령 스크롤). `Footer`는 §2의 모바일 네비 회피 클리어런스를 가진다.
- 모바일 고정 오버레이가 대사창(z-30)을 가리지 않도록 `z-40`/`bottom-36` 이상으로 배치한다 (예: `ReadingProgressIndicator`).

---

## 7. 폼 입력 (iOS 대응)

| 요소 | 규칙 |
|------|------|
| `input[type="date"]` | iOS Safari 네이티브 피커 호환, 텍스트 좌측 정렬 유지 |
| `<select>` | `appearance-none` 사용 시 반드시 커스텀 화살표 아이콘(▼) 추가 |
| 모든 입력 폼 | 키보드 올라올 때 `position: fixed` 요소가 가리지 않는지 확인 |

---

## 8. 검증 (E2E)

크로스 플랫폼 규칙 위반은 `e2e/cross-platform.spec.ts`에서 자동 감지됩니다:
- 콘솔 에러 (pageerror) — daily-card는 webkit `_rsc` 무해 pageerror 필터
- 이미지 로드 성공 — Desktop Chrome 전용(#464, 대용량 홈 이미지가 메모리 취약 webkit 크래시 유발해 non-DC는 test.skip)
- 주요 링크 200 응답

→ E2E 실행 가이드: [`docs/workflow/e2e-testing.md`](../workflow/e2e-testing.md)
