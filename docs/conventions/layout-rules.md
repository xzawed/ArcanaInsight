# 레이아웃 규칙 (필수 준수)

캐릭터가 등장하는 **모든 페이지**에서 반드시 지켜야 하는 공통 레이아웃 규칙입니다.
타로/사주 주제 선택 · 세션 · 결과 페이지, 캐릭터 상세 페이지, 향후 추가되는 모든 캐릭터 등장 페이지에 동일 적용됩니다.

---

## 1. 5:5 비율 레이아웃

| 화면 | 구조 |
|------|------|
| **데스크탑(md 이상)** | 좌측 캐릭터 `md:w-1/2` + 우측 콘텐츠 `md:w-1/2` — 가로 5:5 flex |
| **모바일(md 미만)** | `flex-col` 세로 배치 — 캐릭터 → 콘텐츠 순서 |

---

## 2. 캐릭터 이미지 블렌딩 (CSS mask 표준값)

배경과 자연스럽게 블렌딩하기 위해 아래 표준값을 **반드시 그대로** 사용합니다. 수치 임의 변경 금지.

```
top:          transparent 0% → black 14%
bottom:       transparent 0% → black 18%
left / right: transparent 0% → black 10%
```

구현 패턴 (`CharacterDisplay.tsx` 기준):

```tsx
style={{
  WebkitMaskImage: [
    "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
    "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
    "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
    "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
  ].join(", "),
  WebkitMaskComposite: "destination-in, destination-in, destination-in",
  maskImage: "...(동일)",
  maskComposite: "intersect, intersect, intersect",
}}
```

- `CharacterDisplay` 컴포넌트 사용 시 자동 적용됨
- 직접 `<Image>`를 쓸 때: 이 스타일을 래퍼 `div`에 직접 적용

---

## 3. 컴포넌트 조합

캐릭터 등장 UI의 표준 조합:

```tsx
<CharacterDisplay character={character} mood={mood} />
<TypingDialogue text={dialogue} />
```

- `CharacterDisplay`: 이미지 + 블렌딩 처리 일체화
- `TypingDialogue`: 한 글자씩 타이핑 효과 + SSE 스트리밍 연동

---

## 4. 모바일 캐릭터 영역 높이

캐릭터 등장 페이지의 모바일 캐릭터 영역: **`h-[25%]`** 통일

콘텐츠 영역: **`overflow-y-auto`** 필수 (뷰포트 내 스크롤 보장)

```tsx
// 모바일 캐릭터 영역
<div className="h-[25%] md:h-auto md:w-1/2">
  <CharacterDisplay ... />
</div>

// 콘텐츠 영역
<div className="flex-1 overflow-y-auto md:w-1/2">
  {/* 콘텐츠 */}
</div>
```

---

## 5. 위반 시 영향

- 5:5 비율 미준수 → 데스크탑에서 캐릭터/콘텐츠 불균형
- CSS mask 수치 변경 → 배경 블렌딩 이질감 (Mobile iOS에서 더 눈에 띔)
- `overflow-y-auto` 누락 → 모바일에서 콘텐츠 잘림

## 6. LanguageSwitcher 분리 규칙

데스크탑·모바일 LanguageSwitcher는 반드시 별도 `ref` + 별도 `data-testid` 사용. 동일 ref 공유 시 React last-wins로 outside-click 오탐 → 드롭다운이 선택 즉시 닫힘 (PR #211 테마 드롭다운 교훈). 데스크탑 `data-testid="lang-option-${l}"`, 모바일 `data-testid="mobile-lang-option-${l}"`. 상세: [`i18n-style.md`](i18n-style.md)
