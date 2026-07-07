# Daily Fortune Widget 설계 (오늘의운세 확장)

**날짜:** 2026-05-11  
**상태:** 승인됨  
**담당:** Claude (설계) → Codex (구현)

---

## 개요

홈 화면의 `DailyCard` 위젯을 5개 영역(종합운·연애·직장·건강·재물) 카드를 한 번에 보여주는 `DailyFortune` 위젯으로 교체한다.

DB에는 이미 `service_type='fortune'`이 예약되어 있고 `daily_cards` 테이블이 존재한다. 이 설계는 최소한의 신규 코드로 기존 패턴을 확장한다.

---

## 요구사항

- 5개 영역: `general`(종합운), `love`(연애/인연), `career`(직장/취업), `health`(건강), `wealth`(재물/재정)
- 섹션 진입 시 5개 해석을 한 번에 로드 (API 1회 호출)
- 1+4 레이아웃: 종합운 1장 크게 상단 / 4개 영역 2×2 그리드 하단
- 카드는 뒷면부터 시작, 탭하면 플립하여 해석 표시
- 캐릭터 선택 가능, 변경 시 전체 재로드
- 날짜+캐릭터+영역 해시로 카드 결정 (결정론적, 같은 날 같은 결과)
- 기존 `DailyCard.tsx` 삭제 후 `DailyFortune.tsx`로 대체

---

## 아키텍처

### 1. DB 변경 — `017_daily_fortune_areas.sql`

```sql
ALTER TABLE daily_cards ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'general';
DROP INDEX IF EXISTS daily_cards_date_character_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS daily_cards_date_character_area_key
  ON daily_cards (date, character_id, area);
```

- 기존 `/api/daily-card`는 `area='general'` 기본값으로 그대로 동작
- 유효 `area` 값: `general` | `love` | `career` | `health` | `wealth`

### 2. API — `POST /api/daily-fortune`

**Request (Zod schema: `DailyFortuneSchema`)**
```ts
{ characterId: string, date: string }  // date: "YYYY-MM-DD"
```

**Response**
```ts
{
  areas: {
    area: 'general' | 'love' | 'career' | 'health' | 'wealth',
    cardId: string,
    isReversed: boolean,
    interpretation: string,
    keywords: string[]
  }[]
}
```

**흐름:**
1. Rate limit: `daily-fortune:{ip}` — 10회/분 (`checkRateLimit` 사용)
2. Zod `safeParse` 입력 검증
3. DB에서 해당 날짜·캐릭터의 5개 영역 모두 조회
4. 캐시된 영역 제외, 누락 영역만 AI 호출
5. 카드 결정: `hashDateSeed(date, characterId + area)` — 결정론적 시드
6. AI 1회 호출: 5개 영역을 JSON 객체 하나로 요청 (토큰 절약)
7. `db.upsert("daily_cards", {...}, "date,character_id,area")` 저장
8. 5개 영역 배열 반환

**AI 프롬프트 (1회 JSON 응답):**
```
캐릭터 헤더 + 오늘의 5장 카드 정보를 주고
아래 JSON 형식으로 각 영역 3~4문장 운세 작성:
{ "general": "...", "love": "...", "career": "...", "health": "...", "wealth": "..." }
```

### 3. 컴포넌트 — `DailyFortune.tsx`

```
"use client"

상태:
  flipped: Record<Area, boolean>  (초기: 전부 false)
  data: { areas: AreaResult[] } | null
  isLoading: boolean
  selectedCharId: string

레이아웃:
  <section id="daily-fortune">
    헤더 + 캐릭터 선택 드롭다운
    [로딩 중] 스피너
    [완료] 1+4 그리드:
      상단: 종합운 카드 (크게, 중앙)
      하단: 2×2 그리드 (연애/직장/건강/재물)
    각 카드: CardBack(뒷면) → 탭 → CardFace(앞면) + 해석
  </section>
```

**카드 플립 상태:**  
기존 `DailyCard`의 `isFlipped` 패턴을 5개 영역으로 확장. `flipped[area]` 각각 독립적으로 관리.

**캐릭터 변경 시:**  
`selectedCharId` 변경 → `flipped` 전체 초기화 → `data = null` → `/api/daily-fortune` 재호출.

### 4. i18n 키 추가 (ko·en·ja 3개 locale)

| 키 | KO | EN | JA |
|----|----|----|-----|
| `home.daily-fortune.title` | 오늘의 운세 | Today's Fortune | 今日の運勢 |
| `home.daily-fortune.tap-hint` | 탭하여 운세 확인 | Tap to reveal | タップして確認 |
| `home.daily-fortune.area.general` | 종합운 | Overall | 総合運 |
| `home.daily-fortune.area.love` | 연애/인연 | Love | 恋愛 |
| `home.daily-fortune.area.career` | 직장/취업 | Career | 仕事 |
| `home.daily-fortune.area.health` | 건강 | Health | 健康 |
| `home.daily-fortune.area.wealth` | 재물/재정 | Wealth | 財運 |
| `api.daily-fortune-error` | 오늘의 운세를 불러오지 못했습니다. | Failed to load today's fortune. | 今日の運勢を取得できませんでした。 |

---

## 파일 변경 목록

### 생성 (3개)
| 파일 | 역할 |
|------|------|
| `supabase/migrations/017_daily_fortune_areas.sql` | `daily_cards.area` 컬럼 추가 |
| `src/app/api/daily-fortune/route.ts` | 5개 영역 일일 운세 API |
| `src/components/home/DailyFortune.tsx` | 5카드 운세 위젯 |

### 수정 (6개)
| 파일 | 변경 내용 |
|------|----------|
| `src/app/page.tsx` | `DailyCard` → `DailyFortune` import·사용 |
| `src/lib/validation/api-schemas.ts` | `DailyFortuneSchema` 추가 |
| `src/i18n/translations/ko/index.ts` | `home.daily-fortune.*`, `api.daily-fortune-error` 추가 |
| `src/i18n/translations/en/index.ts` | 동일 (EN) |
| `src/i18n/translations/ja/index.ts` | 동일 (JA) |
| `sonar-project.properties` | 신규 파일 `exclusions` 동기화 |
| `src/components/layout/MobileNav.tsx` | `/#daily-card` → `/#daily-fortune` 앵커 업데이트 |

### 삭제 (1개)
| 파일 | 이유 |
|------|------|
| `src/components/home/DailyCard.tsx` | `DailyFortune.tsx`로 완전 대체 |

---

## 테스트 전략

| 종류 | 파일 | 검증 내용 |
|------|------|----------|
| 단위 | `src/__tests__/api/daily-fortune.test.ts` | 캐시 히트, 캐시 미스·AI 호출, rate limit, 잘못된 입력 |
| E2E | `e2e/*.spec.ts` 기존 파일 | `#daily-card` → `#daily-fortune` 앵커 셀렉터 업데이트 |

---

## 제약·주의사항

- `FallbackProvider` 모듈 레벨 싱글턴 유지 (CircuitBreaker 쿨다운 보존)
- 기존 `/api/daily-card`는 변경하지 않음 (하위 호환)
- `area` 컬럼 마이그레이션 후 기존 `daily_cards` 행은 `area='general'`로 backfill됨 (DEFAULT 적용)
- AI 응답이 JSON 파싱 실패 시 `parseJsonSafe` + `extractFallbackText` 패턴 동일 적용
- 카드 이미지: 기존 `CardFace`/`CardBack`에 `styleId` 그대로 전달
