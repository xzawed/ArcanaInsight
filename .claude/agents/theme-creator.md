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
| midnight | 한밤의 신비 | 밤 20시~새벽 5시 |
| dawn | 새벽빛 여명 | 새벽 5시~8시 |
| sunset | 황혼의 노을 | 해질녘 17시~20시 |
| spring | 벚꽃 봄바람 | 3~5월 낮 |
| summer | 한여름 밤 | 6~8월 낮 |
| autumn | 가을 단풍 | 9~11월 낮 |
| winter | 겨울 설경 | 12~2월 낮 |

## 새 테마 추가 절차

### 1. 수집할 정보
- `id` — 테마 ID (영문 소문자, 예: `sakura`)
- `name` — 영문 이름
- `nameKo` — 한국어 이름
- `icon` — 이모지 아이콘
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

- `bg`: 가장 어두운 색 (#0a~#1a 범위)
- `surface`: bg보다 약간 밝은 (#12~#26)
- `card`: surface보다 약간 밝은 (#1a~#34)
- `border`: card보다 밝은 (#2a~#5e)
- `primary`: 메인 강조색 (밝고 선명한 색)
- `secondary`: primary와 유사하지만 약간 다른 톤
- `accent`: 골드/포인트 색상
- `text`: 밝은 텍스트 (#e0~#ff 범위)
- `muted`: 흐린 텍스트 (#80~#b8 범위)
