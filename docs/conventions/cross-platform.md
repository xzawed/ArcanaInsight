# 크로스 플랫폼 품질 규칙 (필수 준수)

> **결정자**: Claude (규칙 정의·예외 승인) | **준수 의무**: Codex (컴포넌트·스타일 구현 시)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)

모든 UI 변경 시 데스크탑(Chrome), 모바일(iOS Safari, Android Chrome) 동일 품질을 보장해야 합니다.

---

## 1. 뷰포트 높이

| 규칙 | 이유 |
|------|------|
| **`100vh` 사용 금지** | iOS Safari에서 주소창/하단바 포함 높이 계산 → 콘텐츠 가려짐 |
| **`100dvh` 사용** | Dynamic Viewport Height — 실제 보이는 영역에 정확히 맞춤 |
| `min-h-screen` 허용 | 페이지 전체 최소 높이 용도만 허용 |

패턴:
```css
h-[calc(100dvh-7rem)]        /* 모바일 */
md:h-[calc(100dvh-3.5rem)]   /* 데스크탑 */
```

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
- 콘솔 에러 (pageerror)
- 이미지 로드 실패
- 주요 링크 200 응답

→ E2E 실행 가이드: [`docs/workflow/e2e-testing.md`](../workflow/e2e-testing.md)
