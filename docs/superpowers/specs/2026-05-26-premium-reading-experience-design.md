# 프리미엄 리딩 경험 설계 (Premium Reading Experience)

**날짜:** 2026-05-26
**상태:** 승인됨
**우선순위:** A (AI 품질) → B (가독성) → C (몰입감)

---

## 1. 목표

타로·사주·신점 리딩을 실제 전문 점술사 수준의 프리미엄 서비스처럼 느끼게 한다.

- 카드 한 장 한 장의 리딩 가치를 높인다
- 결과 텍스트를 현재보다 3배 깊게, 구체적으로
- 긴 텍스트가 나왔을 때 섹션 구조로 가독성 확보
- 현재 리딩 진행 방식(스피너 + 대기 대사)은 유지

---

## 2. 개선 영역 결정

| 축 | 결정 |
|---|---|
| AI 리딩 품질 우선순위 | 분량(D) → 일반론 탈피(A) → 상황 연결(C) → 상징 분석(B) |
| 리딩 스타일 | 실용적 코치 — 상징 설명 + 현실 조언 + 구체적 행동 지침 |
| 카드 해석 구조 | 섹션 구조형 — `symbolism / situation / action` 3분할 |
| 결과 레이아웃 | 섹션 헤더 + 구분선 (B안) |
| 리딩 중 몰입감 | 현재 방식 유지 (A안) — 스피너 + 캐릭터 대기 대사 → 전체 등장 |
| 구현 아키텍처 | JSON 구조 확장 (C안) — 프론트/프롬프트/타입/테스트 전면 정합 |

---

## 3. 데이터 스키마

### 3-1. 타로 응답

```typescript
interface CardInterpretation {
  cardIndex: number
  // 기존 'interpretation' 필드 제거, 아래 3개 필드로 대체
  symbolism: string   // 카드 상징·이미지·전통 의미 (3-4 문단)
  situation: string   // 사용자 상황·주제와 연결 (3-4 문단)
  action:    string   // 구체적 행동 지침 (3-4 문단)
}

interface TarotReadingResult {
  cardInterpretations: CardInterpretation[]
  overallReading: string   // 카드 간 연결·흐름 (12문단+)
  advice:         string   // 전체 조언 (6-9 문단)
}
```

### 3-2. 사주 응답

```typescript
interface SajuSections {
  structure:  string   // 사주 구조·일간·오행 분석 (3-4 문단)
  elements:   string   // 용신·기신·오행 균형·실생활 보완 (3-4 문단)
  fortune:    string   // 대운·세운 흐름·변곡점 시기 (3-4 문단)
  guidance:   string   // 주제별 시기 조언·피해야 할 시기 (3-4 문단)
}

interface SajuReadingResult {
  sajuSections:   SajuSections   // 신규
  overallReading: string         // 기존 유지 (12문단+)
  topicReading:   string         // 기존 유지 (10문단+)
  advice:         string         // 기존 유지 (6문단+)
}
```

### 3-3. 신점 응답 (최종 턴)

```typescript
interface ShinjeomSections {
  spiritual:  string   // 신명의 메시지·영적 통찰·에너지 상태 (3-4 문단)
  current:    string   // 현재 흐름·방향·주변 환경 해석 (3-4 문단)
  obstacles:  string   // 어려움의 근본 원인·업/카르마 관점 (3-4 문단)
  future:     string   // 흐름 전환 시기·조건부 미래 분기 (3-4 문단)
}

interface ShinjeomReadingResult {
  shinjeomSections: ShinjeomSections   // 신규
  overallReading:   string             // 기존 유지 (12문단+)
  topicReading:     string             // 기존 유지 (10문단+)
  advice:           string             // 기존 유지 (6문단+)
}
```

---

## 4. AI 프롬프트 설계

### 4-1. 분량 기준 (3배 적용)

| 항목 | 현재 | 변경 후 |
|---|---|---|
| 카드 symbolism | — | 3-4 문단 |
| 카드 situation | — | 3-4 문단 |
| 카드 action | — | 3-4 문단 |
| **카드 1장 합계** | **3-4 문단** | **9-12 문단** |
| overallReading (타로) | 4-5 문단 | 12문단+ |
| advice (타로) | 2-3 문단 | 6-9 문단 |
| overallReading (사주/신점) | 6문단+ | 12문단+ |
| topicReading (사주/신점) | 4-5문단+ | 10문단+ |
| advice (사주/신점) | 3문단+ | 6-9 문단 |

### 4-2. 타로 카드 섹션별 프롬프트 지시

**[symbolism] 카드 상징 분석**
- 카드 그림의 주요 요소(인물·동물·색상·숫자·배경)를 구체적으로 언급
- 전통 타로(RWS/토트) 상징 의미와 원소·수비학적 배경 포함
- 정방향/역방향 에너지 차이 설명
- 금지: "~를 상징합니다" 단순 나열
- 필수: "이 카드에서 ~는 ~이기 때문에 ~를 의미합니다" 연결 구조

**[situation] 현재 상황 연결**
- 카드가 놓인 위치(과거/현재/미래/장애물 등)의 관점에서만 해석
- 사용자가 선택한 주제(연애/커리어/건강 등)와 반드시 연결
- 구체적 현실 상황 예시 포함 ("상대방이 연락을 끊었다면…", "이직을 고민 중이라면…")
- 금지: 위치·주제 무관한 일반론
- 다른 카드 참조 금지 (카드 간 연결은 overallReading에서만)

**[action] 구체적 행동 지침**
- 지금 당장 할 수 있는 행동 2-3가지를 구체적으로 명시
- 피해야 할 행동 1가지 명시
- 시간적 관점 포함 ("이번 주 안에", "한 달 내로", "지금 당장")
- 금지: "내면의 소리를 들어라" 같은 추상적 조언
- 금지: "변화가 올 것입니다" 같은 수동적 예언

### 4-3. 사주·신점 섹션별 프롬프트 지시

**사주 [structure]**: 일간 오행·음양·십신 특성 → 격국 판단 → 강약 → 현재 삶의 패턴과 연결
**사주 [elements]**: 용신·기신 명시 → 오행 과다/부족 → 실생활 보완법(색상·음식·방향·활동)
**사주 [fortune]**: 현재 대운 단계·에너지 방향 → 세운 흐름 → 변곡점 시기 → 주의 시기
**사주 [guidance]**: 주제별 유리한 시기·불리한 시기 → 지금 당장 할 것 → 피할 것

**신점 [spiritual]**: 신명이 가장 강하게 전하는 메시지 → 현재 영적 에너지 상태 → 업·인연의 관점
**신점 [current]**: 지금 흐름의 방향 → 주변 환경·인간관계 에너지 → 현재 당기고 있는 것
**신점 [obstacles]**: 어려움의 근본 원인(업/환경/자신) → 막고 있는 에너지 → 풀어야 할 것
**신점 [future]**: 흐름 전환 조건 → 좋아지는 시기(조건부) → 피해야 할 선택

---

## 5. max_tokens 조정 (3배)

### 5-1. 타로

```
현재: min(4000 + cardCount × 2500 + 5000, 60000)
변경: min(12000 + cardCount × 7500 + 15000, 60000)

1장: 34,500  |  2장: 42,000  |  3장: 49,500
4장: 57,000  |  5장+: 60,000 (캡 적용)
```

### 5-2. 사주

```
현재                       변경
this-week/month/year=16,000  → 48,000
three-year=20,000            → 60,000
next-year=20,000             → 60,000
five-year=22,000             → 60,000
full-fortune=25,000          → 60,000
includeMonthly=28,000        → 60,000
```

### 5-3. 신점

```
현재: 최종턴=16,000 / 대화턴=3,000
변경: 최종턴=48,000 / 대화턴=6,000
```

> 5장+ 타로, 3년+ 사주, 신점 최종턴은 60,000 캡 적용.
> 출력 토큰만 과금되므로 상한 자체는 비용 무영향.

---

## 6. 프론트엔드 컴포넌트

### 6-1. 신규 컴포넌트

**`src/components/session/ReadingSectionBlock.tsx`**

```
props:
  label:   string   // i18n 키로 전달 (reading.section.symbolism 등)
  icon:    string   // 섹션별 고정 이모지:
                    //   symbolism  → "✦"
                    //   situation  → "◈"
                    //   action     → "▶"
                    //   saju.*     → "✦" / "◈" / "▶" / "◎" 순서
                    //   shinjeom.* → "✦" / "◈" / "▶" / "◎" 순서
  content: string   // 섹션 텍스트

렌더링:
  [금색 라벨 텍스트 — 11px, 대문자, 자간 2px, color: #F59E0B]
  [가로 구분선 — rgba(139,92,246,0.25)]
  [ReadingText — 본문 텍스트]
```

### 6-2. 변경 컴포넌트

**`src/components/tarot/CardInterpretationList.tsx`**
- 현재: `interpretation` 텍스트 1개 렌더링
- 변경: `symbolism` → `situation` → `action` 순서로 `ReadingSectionBlock` 3개

**사주 결과 컴포넌트**
- `sajuSections.structure` / `elements` / `fortune` / `guidance` 순서로 `ReadingSectionBlock` 4개
- 이후 기존 `overallReading` / `topicReading` / `advice` 유지

**신점 결과 컴포넌트**
- `shinjeomSections.spiritual` / `current` / `obstacles` / `future` 순서로 `ReadingSectionBlock` 4개
- 이후 기존 `overallReading` / `topicReading` / `advice` 유지

### 6-3. 섹션 라벨 텍스트 (한/영/일 i18n 키 추가 필요)

| 키 | 한국어 | 영어 | 일본어 |
|---|---|---|---|
| `reading.section.symbolism` | 카드가 말하는 것 | What the Card Says | カードが語ること |
| `reading.section.situation` | 지금 당신의 상황 | Your Current Situation | あなたの今の状況 |
| `reading.section.action` | 지금 할 수 있는 것 | What You Can Do Now | 今できること |
| `reading.section.saju.structure` | 사주 구조 분석 | Saju Structure | 四柱の構造 |
| `reading.section.saju.elements` | 오행과 용신 | Elements & Yongsin | 五行と用神 |
| `reading.section.saju.fortune` | 대운과 세운 흐름 | Fortune Flow | 大運・歳運の流れ |
| `reading.section.saju.guidance` | 시기별 조언 | Period Guidance | 時期別アドバイス |
| `reading.section.shinjeom.spiritual` | 신명의 메시지 | Spiritual Message | 神霊のメッセージ |
| `reading.section.shinjeom.current` | 현재 흐름 | Current Flow | 現在の流れ |
| `reading.section.shinjeom.obstacles` | 어려움의 원인 | Root of Obstacles | 困難の原因 |
| `reading.section.shinjeom.future` | 미래의 흐름 | Future Flow | 未来の流れ |

---

## 7. 영향 파일 목록

| 분류 | 파일 | 변경 내용 |
|---|---|---|
| 타입 | `src/types/` (관련 타입 파일) | `CardInterpretation`, `TarotReadingResult`, `SajuReadingResult`, `ShinjeomReadingResult` 확장 |
| 프롬프트 | `src/services/tarot/tarot-service.ts` | 신규 JSON 스키마 지시 + 3배 깊이 요구사항 |
| 프롬프트 | `src/services/saju/saju-service.ts` | `sajuSections` 추가 + 3배 깊이 |
| 프롬프트 | `src/services/shinjeom/shinjeom-service.ts` | `shinjeomSections` 추가 + 3배 깊이 |
| Zod 스키마 | 각 서비스 파서 | 신규 필드 포함 스키마 확장 |
| API 라우트 | `src/app/api/tarot/reading/route.ts` | `computeReadingMaxTokens` 공식 변경 |
| API 라우트 | `src/app/api/saju/reading/route.ts` | `computeSajuReadingMaxTokens` 변경 |
| API 라우트 | `src/app/api/shinjeom/message/route.ts` | 토큰 상수 변경 |
| 컴포넌트 | `src/components/session/ReadingSectionBlock.tsx` | **신규 생성** |
| 컴포넌트 | `src/components/tarot/CardInterpretationList.tsx` | 섹션 렌더링으로 교체 |
| 컴포넌트 | 사주 결과 페이지 컴포넌트 | `sajuSections` 렌더링 추가 |
| 컴포넌트 | 신점 결과 컴포넌트 | `shinjeomSections` 렌더링 추가 |
| i18n | `src/i18n/translations/` (ko/en/ja) | 섹션 라벨 11개 키 추가 |
| 테스트 | `src/__tests__/api/tarot/` | 신규 스키마 기준 전면 수정 |
| 테스트 | `src/__tests__/api/saju/` | 신규 스키마 기준 전면 수정 |
| 테스트 | `src/__tests__/api/shinjeom/` | 신규 스키마 기준 전면 수정 |

---

## 8. 구현 순서 (권장)

1. 타입 확장 (`CardInterpretation`, `SajuReadingResult`, `ShinjeomReadingResult`)
2. Zod 스키마 + 파서 업데이트 (3서비스)
3. AI 프롬프트 수정 (3서비스)
4. max_tokens 조정 (3개 API 라우트)
5. `ReadingSectionBlock` 컴포넌트 신규 생성
6. `CardInterpretationList` 업데이트 (타로)
7. 사주 결과 컴포넌트 업데이트
8. 신점 결과 컴포넌트 업데이트
9. i18n 번역 키 11개 추가 (ko/en/ja)
10. 테스트 전면 수정 (3서비스)

---

## 9. 비고

- 클라이언트 타임아웃(240s)은 유지 — max_tokens 증가로 응답 시간이 길어질 수 있으나, 기존 설계 마진 내에서 처리 가능
- `parseError: truncated` 빈도가 늘 수 있음 → 5장+ 타로는 섹션 단위 fallback 처리 검토 필요 (v2에서 개선)
- 대기 중 캐릭터 대사는 현행 유지. 추후 대사 내용 업그레이드는 별도 작업으로 분리
