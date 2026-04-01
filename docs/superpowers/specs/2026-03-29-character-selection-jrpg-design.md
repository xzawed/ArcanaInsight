# 캐릭터 선택 + JRPG 누끼 스타일 — 디자인 스펙

## 개요

타로 첫 페이지에 4명의 캐릭터 선택 기능을 추가하고, 세션 페이지에서 캐릭터를 JRPG 스타일 투명 배경 누끼로 화면 좌측 40%에 대형 표시한다. Grok AI로 4캐릭터 × 6표정 = 24장의 투명 배경 캐릭터 이미지를 생성한다.

## 1. 타로 첫 페이지 — 캐릭터 선택 + 주제 선택

### 2단계 흐름

**Step 1 — 캐릭터 선택:**
- 4명의 캐릭터를 카드 형태로 가로 배치 (모바일은 2×2 그리드)
- 각 카드: 누끼 캐릭터 이미지 + 이름 + 성격 한줄 소개 + 리딩 스타일 태그
- 호버 시 캐릭터가 살짝 올라오는 효과 + 보라 글로우
- 선택 시 캐릭터가 크게 등장하며 인사 대사 표시 (VN 스타일 전환)

**Step 2 — 주제 선택:**
- 선택된 캐릭터가 좌측에 대형으로 표시 (세션 페이지 미리보기)
- 우측에 주제 카드 5개 배치
- 하단 대화창에 캐릭터가 "어떤 이야기를 들려주실 건가요?" 안내

### 상태 관리

- `useSessionStore`에 `characterId: string` 상태 추가 + `setCharacterId()` 메서드
- 캐릭터 선택 → `setCharacterId()` → 주제 선택 → 세션 진입

## 2. 세션 페이지 — JRPG 대형 캐릭터 + 카드 리딩

### 레이아웃 (페르소나 스타일)

- **좌측 40%**: 캐릭터 누끼 — 하단 앵커, 전신~반신 크기. 표정에 따라 이미지 전환 + Framer Motion 부유/호흡 효과
- **우측 55%**: 카드 영역 — 카드 선택 단계에서는 팬 덱, 리딩 단계에서는 스프레드 배치
- **하단 25~30%**: VN 대화창 — 기존 DialogueBox 유지
- **배경**: 신비로운 점술실 + 파티클 + 비네팅 (기존 유지)

### 캐릭터 표정 전환 타이밍

| 상황 | 표정 | 모션 |
|------|------|------|
| 카드 선택 대기 | idle | 부유 모션 루프 |
| 카드 선택 시 | surprised | 1회 → idle 복귀 |
| 리딩 시작 | mystical | 글로우 모션 루프 |
| 결과 해석 | serious → smile | 종합 해석에서 전환 |
| AI 응답 스트리밍 | talking | 대사 중 루프 |

### 모바일 대응

- 캐릭터가 상단 30%에 축소 표시, 카드가 중간, 대화창이 하단
- 캐릭터 크기 `max-w-[200px]`으로 제한

## 3. 캐릭터 누끼 이미지 생성

### 생성 방식

- Grok API(`grok-imagine-image-pro`)로 4캐릭터 × 6표정 = 24장 생성
- 프롬프트에 `"white background, full body, character only, no background elements, anime illustration"` 지정
- 생성 후 배경을 프로그래밍으로 제거하여 투명 PNG 변환

### 캐릭터별 프롬프트 핵심

- **아르카나(arcana)**: 은발 고양이 귀, 보라색 눈, 보라/검정 드레스, 수정구슬
- **미코(miko)**: 흰색 하카마, 검은 장발, 붉은 리본, 신성한 부적
- **선화(seonhwa)**: 한복+판타지, 꽃장식, 부채, 우아한 분위기
- **호시(hoshi)**: 파스텔톤, 별 모티프, 짧은 머리, 밝고 발랄

### 표정별 프롬프트 변형

- **idle**: 차분한 표정, 편안한 자세
- **talking**: 입 살짝 열림, 한 손 제스처
- **happy**: 밝은 미소, 두 손 모음
- **serious**: 집중, 진지한 눈빛
- **mystical**: 눈 감음, 마법 오라, 양팔 펼침
- **surprised**: 놀란 표정, 입에 손

### 파일 구조

```
public/images/characters/
├── arcana/nukki/    ← 투명 배경 누끼
│   ├── idle.png, talking.png, happy.png, serious.png, mystical.png, surprised.png
├── miko/nukki/
│   ├── idle.png, talking.png, happy.png, serious.png, mystical.png, surprised.png
├── seonhwa/nukki/
│   ├── idle.png, talking.png, happy.png, serious.png, mystical.png, surprised.png
└── hoshi/nukki/
    ├── idle.png, talking.png, happy.png, serious.png, mystical.png, surprised.png
```

## 4. 캐릭터별 리딩 스타일 분리

### 캐릭터 데이터 수정

- `src/data/characters/index.ts`에서 4명 모두 `unlocked: true`로 변경
- `getAvailableCharacters()` 함수 추가 (전체 캐릭터 반환)
- 기존 `getCharacterByService()` 유지 (하위 호환)

### 세션 흐름 변경

- `useSessionStore`에 `characterId: string` 상태 + `setCharacterId()` 추가
- `/tarot` 페이지: 캐릭터 선택 → `setCharacterId()` → 주제 선택 → 세션 진입
- `/tarot/session`: `getCharacterById(characterId)` 사용 (기존 `getCharacterByService("tarot")` 대체)
- API 라우트 `/api/tarot/reading`: request body에 `characterId` 추가, 프롬프트 빌더에 해당 캐릭터 전달

### AI 프롬프트 자동 분리

- `prompt-builder.ts`의 시스템 프롬프트에 캐릭터 `personality`, `speechStyle`, `voiceTone`이 이미 주입됨
- 캐릭터가 바뀌면 프롬프트도 자동 반영 → 프롬프트 빌더 자체 변경 불필요

### SpriteAnimator 수정

- `MOOD_CONFIGS`를 캐릭터 ID 기반으로 동적 로드
- 이미지 경로: `/images/characters/${characterId}/nukki/${mood}.png`
- CharacterDisplay에 `characterId` prop 추가 (또는 스토어에서 참조)

## 5. 영향 범위

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/tarot/page.tsx` | 2단계 흐름 (캐릭터 선택 → 주제 선택) |
| `src/app/tarot/session/page.tsx` | 캐릭터 40% 대형 배치, characterId 기반 로드 |
| `src/components/character/SpriteAnimator.tsx` | 캐릭터ID 기반 동적 이미지 경로 |
| `src/components/character/CharacterDisplay.tsx` | characterId prop, 40% 대형 스타일 |
| `src/hooks/useSession.ts` | characterId 상태 추가 |
| `src/data/characters/index.ts` | unlocked: true, getAvailableCharacters() |
| `src/app/api/tarot/reading/route.ts` | characterId 파라미터 추가 |
| `scripts/generate-character-images.mjs` | 4캐릭터 24장 생성 + 배경 제거 |

### 신규 파일

| 파일 | 내용 |
|------|------|
| `src/components/character/CharacterCard.tsx` | 캐릭터 선택 카드 컴포넌트 |
| `public/images/characters/*/nukki/*.png` | 24장 투명 배경 누끼 이미지 |

## 6. 제외 사항

- 미코/선화/호시 전용 서비스(신점/사주/운세) 구현은 이번 스코프 제외
- 캐릭터 잠금/해제 시스템 제거 (4명 모두 무조건 사용 가능)
- 캐릭터별 배경 테마 변경은 이번 제외 (동일 배경 사용)
