---
name: theme-creator
description: 새 테마를 추가하거나 기존 테마 색상을 수정한다. "테마 추가", "새 테마 만들어줘", "색상 변경" 등의 요청에 사용한다.
---

# theme-creator 에이전트

ArcanaInsight의 동적 테마 시스템에 새 테마를 추가하거나 기존 테마를 수정한다.

## 참조 파일

- `src/hooks/useTheme.ts` — ThemeId, ThemeConfig, themes 정의, 자동 감지 로직
- `src/components/layout/ThemeProvider.tsx` — CSS 변수 자동 적용
- `src/app/globals.css` — 기본 CSS 변수 (SSR fallback)
- `src/components/layout/Header.tsx` — 테마 선택 드롭다운

## 현재 테마 목록

| ID | 이름 | 적용 시점 (auto) |
|----|------|------------------|
| midnight | 한밤의 신비 | 밤 22시~새벽 6시 (`hour>=22 \|\| hour<6`) |
| dawn | 새벽빛 여명 | 아침 6시~12시 (`hour<12`) |
| sunset | 황혼의 노을 | 저녁 18시~22시 (`hour>=18`) |
| spring | 벚꽃 봄바람 | 3~5월, 낮 12시~18시 |
| summer | 한여름 밤 | 6~8월, 낮 12시~18시 |
| autumn | 가을 단풍 | 9~11월, 낮 12시~18시 |
| winter | 겨울 설경 | 12~2월, 낮 12시~18시 |

> **시간 우선순위**: midnight → dawn → sunset → 계절(낮) 순으로 적용. 새 테마에 auto 조건 추가 시 기존 7개와 충돌하지 않도록 `getAutoTheme()` 분기 순서에 유의한다.

## 새 테마 추가 절차

### 1. 수집할 정보
- `id` — 테마 ID (영문 소문자, 예: `sakura`)
- `name` — 영문 이름
- `nameKo` — 한국어 이름
- `nameJa` — 일본어 이름 (선택, ThemeConfig optional)
- `icon` — 이모지 아이콘
- `iconPath` — 아이콘 이미지 경로 (**필수** — 누락 시 ThemeConfig 타입 오류, 예 `/images/icons/theme-{id}.png`)
- 9가지 색상 (hex):
  - `bg` — 배경
  - `surface` — 표면
  - `card` — 카드 배경
  - `border` — 테두리
  - `primary` — 메인 컬러 (→ arcana-purple)
  - `secondary` — 보조 컬러 (→ arcana-indigo)
  - `accent` — 강조 컬러 (→ arcana-gold)
  - `text` — 텍스트
  - `muted` — 보조 텍스트
- auto 적용 조건 (선택): 시간대 또는 계절

### 2. 수정 파일

**`src/hooks/useTheme.ts`**:
1. `ThemeId` 유니온에 새 ID 추가
2. `themes` 객체에 새 ThemeConfig 추가
3. auto 적용 시 `getAutoTheme()` 함수 조건 추가 (선택)

### 3. 검증

```bash
pnpm tsc --noEmit
pnpm lint
```

- ThemeId에 추가된 ID가 themes 객체에 있는지
- Header.tsx의 themeList에 자동으로 포함되는지 (Object.values(themes))
- CSS 변수 9개가 모두 정의되었는지

## 색상 가이드라인

hex 값은 `#RRGGBB` 형식 기준 — 각 채널(RR/GG/BB)의 밝기 범위를 나타냄.

- `bg`: 가장 어두운 배경 (예: `#0a0818` — R/G/B 모두 #0a~#1a 수준)
- `surface`: bg보다 약간 밝은 표면 (예: `#120e24` — #12~#26 수준)
- `card`: surface보다 약간 밝은 카드 영역 (예: `#1a1535` — #1a~#34 수준)
- `border`: 테두리, card보다 밝은 (예: `#2d2558` — #2a~#5e 수준)
- `primary`: 메인 강조색 (밝고 선명한 색, 예: `#8b5cf6`)
- `secondary`: primary와 유사하지만 다른 톤 (예: `#6366f1`)
- `accent`: 골드/포인트 색상 (예: `#f59e0b`)
- `text`: 밝은 텍스트 (예: `#e2d9f3` — #e0~#ff 수준)
- `muted`: 흐린 보조 텍스트 (예: `#9b8ec4` — #80~#b8 수준)
