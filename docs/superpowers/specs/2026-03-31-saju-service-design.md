# 사주 서비스 설계 문서

## 개요

ArcanaInsight에 사주명리학 서비스를 추가한다. 외부 라이브러리(`lunar-javascript`)로 사주팔자를 정확히 계산하고, Grok AI가 해석을 제공하는 구조. 독립 페이지(`/saju`)로 운영하며, 캐릭터 확장을 고려한 설계.

## 분석 깊이: 고급

| 계층 | 항목 |
|---|---|
| 기본 | 사주팔자 (연/월/일/시주 천간·지지 8자) + 오행 분포 |
| 중급 | 십성 + 12운성 + 합/충/형 관계 |
| 고급 | 대운 (10년 단위) + 세운 (올해) + 용신 판별 + 신강/신약 |

---

## 아키텍처

### 데이터 흐름

```
사용자 입력 (생년월일/시간/성별)
    ↓
saju-calculator.ts — 로컬 계산 (lunar-javascript 기반)
    ↓ SajuResult (팔자, 십성, 12운성, 합충형, 대운, 세운, 용신)
    ↓
prompt-builder — 계산 결과 → AI 프롬프트 구성
    ↓
Grok API (SSE 스트리밍)
    ↓
파싱 → DB 저장 (saju_readings 테이블)
    ↓
결과 페이지 (차트 + AI 해석)
```

### 핵심 원칙

- **계산은 서버, 해석은 AI**: 팔자/오행/십성/대운 등은 코드로 정확히 계산, AI는 해석만 담당
- **프롬프트에 모든 계산 결과 포함**: AI가 사주를 "계산"하지 않고, 주어진 데이터를 "해석"
- **DivinationService 인터페이스 구현**: 타로와 동일한 패턴으로 서비스 추가

---

## 파일 구조

```
src/
├── app/
│   ├── saju/
│   │   ├── page.tsx                  # 진입 (캐릭터 선택 → 정보 입력 → 주제 선택)
│   │   ├── session/page.tsx          # 세션 (AI 해석 진행 + 대기 연출)
│   │   └── result/[id]/
│   │       ├── page.tsx              # 결과 (차트 + 해석)
│   │       └── ResultShareButton.tsx
│   └── api/saju/
│       ├── reading/route.ts          # SSE 스트리밍 API
│       └── result/[id]/route.ts      # 결과 조회 API
├── services/saju/
│   ├── saju-service.ts               # DivinationService 구현
│   ├── saju-calculator.ts            # 팔자/십성/운성/대운/세운/용신 계산
│   └── saju-types.ts                 # 사주 전용 타입 정의
├── components/saju/
│   ├── SajuChart.tsx                 # 사주팔자 차트 (연/월/일/시주)
│   ├── OhaengGraph.tsx               # 오행 분포 시각화
│   ├── DaeunTimeline.tsx             # 대운/세운 타임라인
│   └── SajuInfoForm.tsx              # 생년월일/시간 입력 (필수)
└── data/saju/
    └── constants.ts                  # 천간/지지/오행/십성 상수

supabase/migrations/
└── 006_saju_readings.sql             # 사주 전용 테이블 + topic 확장
```

---

## 사주 계산 엔진 (`saju-calculator.ts`)

### 입력

```typescript
interface SajuInput {
  birthDate: string;   // "1990-05-15" (양력)
  birthHour: string;   // "ja" (12시진)
  gender: "male" | "female" | "other";
}
```

### 출력 (`SajuResult`)

```typescript
interface Pillar {
  stem: string;        // 천간 한글 (예: "갑")
  stemHanja: string;   // 천간 한자 (예: "甲")
  branch: string;      // 지지 한글 (예: "자")
  branchHanja: string; // 지지 한자 (예: "子")
  element: OhaengType; // 오행
}

interface SajuResult {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  dayMaster: string;
  dayMasterElement: OhaengType;
  isStrong: boolean;
  elements: Record<OhaengType, number>;  // { wood, fire, earth, metal, water }
  tenStars: { position: string; star: string; description: string }[];
  twelveStages: { position: string; stage: string; description: string }[];
  interactions: {
    combinations: string[];
    clashes: string[];
    punishments: string[];
  };
  yongsin: { element: OhaengType; reason: string };
  majorFortunes: {
    startAge: number;
    endAge: number;
    stem: string;
    branch: string;
    element: OhaengType;
    description: string;
  }[];
  yearlyFortune: {
    year: number;
    stem: string;
    branch: string;
    element: OhaengType;
    description: string;
  };
}

type OhaengType = "wood" | "fire" | "earth" | "metal" | "water";
```

### 계산 순서

1. `lunar-javascript`로 양력 → 음력 변환 + 절기 판별
2. 연주: 연도의 천간/지지 (60갑자)
3. 월주: 절기 기준 월의 천간/지지 (연간에 따른 월간 결정)
4. 일주: 일진 계산 (60갑자 순환)
5. 시주: 시간대 + 일간에 따른 시간 결정
6. 오행: 8자 각각의 오행 집계
7. 십성: 일간과 나머지 7자의 관계 계산
8. 12운성: 일간과 4지지의 에너지 단계
9. 합/충/형: 지지 간 관계 분석
10. 신강/신약: 일간의 강약 판별
11. 용신: 균형에 필요한 오행 결정
12. 대운: 월주 기준 순행/역행 계산 (8~10개)
13. 세운: 올해 연주와 사주의 관계

---

## 데이터베이스 스키마 (`006_saju_readings.sql`)

```sql
CREATE TABLE saju_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- 입력 데이터
  birth_date date NOT NULL,
  birth_hour text NOT NULL,
  gender text NOT NULL,
  birth_name text,

  -- 사주팔자 원본
  pillars jsonb NOT NULL,
  day_master text NOT NULL,
  day_master_element text NOT NULL,
  is_strong boolean NOT NULL,

  -- 분석 데이터
  elements jsonb NOT NULL,
  ten_stars jsonb NOT NULL,
  twelve_stages jsonb NOT NULL,
  interactions jsonb NOT NULL,
  yongsin jsonb NOT NULL,

  -- 운세 데이터
  major_fortunes jsonb NOT NULL,
  yearly_fortune jsonb NOT NULL,

  -- AI 해석 결과
  overall_reading text NOT NULL DEFAULT '',
  topic_reading text NOT NULL DEFAULT '',
  advice text NOT NULL DEFAULT '',

  -- 공유
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_saju_readings_session_id ON saju_readings(session_id);
CREATE INDEX idx_saju_readings_share_token ON saju_readings(share_token);
CREATE INDEX idx_saju_readings_birth_date ON saju_readings(birth_date);

ALTER TABLE saju_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Saju readings viewable by session owner" ON saju_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));
CREATE POLICY "Saju readings viewable by share token" ON saju_readings FOR SELECT
  USING (true);
CREATE POLICY "Anyone can insert saju readings" ON saju_readings FOR INSERT
  WITH CHECK (true);

-- Topic 제약 확장
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_topic_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_topic_check
  CHECK (topic IN (
    'love', 'love-single', 'love-couple', 'finance', 'career', 'health', 'general',
    'fortune-3y', 'fortune-5y', 'fortune-full'
  ));

-- 사주 서비스 활성화
UPDATE public.services SET is_active = true WHERE id = 'saju';
```

---

## UI 흐름

### 4단계 진행

| 단계 | 페이지 | 내용 |
|---|---|---|
| 1 | `/saju` | 캐릭터 선택 (serviceType="saju" 필터, 확장 가능) |
| 2 | `/saju` | 생년월일/시간 입력 (필수) — 캐릭터가 대화로 안내 |
| 3 | `/saju` | 주제 선택 (9가지) |
| 4 | `/saju/session` | AI 해석 진행 + 대기 연출 → 결과 페이지로 이동 |

### 주제 목록

| 주제 | 코드 | 설명 |
|---|---|---|
| 연애/관계 | `love` | 기존 동일 |
| 직장/진로 | `career` | 기존 동일 |
| 재정/금전 | `finance` | 기존 동일 |
| 건강 | `health` | 기존 동일 |
| 일반 상담 | `general` | 기존 동일 |
| 종합운세 (3년) | `fortune-3y` | 향후 3년 세운 기반 단기 전망 |
| 종합운세 (5년) | `fortune-5y` | 향후 5년 중기 흐름 + 전환점 분석 |
| 종합운세 (전체) | `fortune-full` | 전체 대운 흐름 + 인생 로드맵 |

---

## 결과 페이지 (차트 중심형)

### 레이아웃

- 데스크탑: 좌 50% 캐릭터 + 우 50% 결과 (5:5 규칙)
- 모바일: 캐릭터 → 결과 세로 배치

### 결과 섹션 (순서대로)

1. **사주팔자 차트** (`SajuChart`) — 4주 테이블 + 일간/용신 표시
2. **오행 분포** (`OhaengGraph`) — 가로 막대 그래프 (오행별 색상)
3. **종합 해석** — AI 생성 텍스트
4. **주제별 해석** — 선택한 주제에 대한 상세 해석
5. **대운 타임라인** (`DaeunTimeline`) — 10년 단위 운세 흐름, 현재 대운 강조
6. **세운** — 올해 운세 분석
7. **조언** — AI 생성 조언 (용신 활용법 포함)
8. **액션 버튼** — 새로운 상담 + 결과 공유하기

### 종합운세 기간별 대운 타임라인 차이

- **3년**: 현재 세운 + 향후 2년 세운 상세, 대운은 현재만
- **5년**: 현재~5년 세운 흐름 + 대운 전환점 포함 시 해당 대운 분석
- **전체**: 전체 대운 타임라인 + 인생 주기별 해석

### 오행 색상 체계

| 오행 | 색상 | Tailwind |
|---|---|---|
| 木 | 초록 | `emerald-500` |
| 火 | 빨강 | `red-500` |
| 土 | 노랑 | `amber-500` |
| 金 | 은색 | `slate-300` |
| 水 | 파랑 | `blue-500` |

---

## API

### `POST /api/saju/reading`

**Request**:
```json
{
  "sessionId": "uuid (optional)",
  "topic": "fortune-3y",
  "characterId": "seonhwa",
  "userInfo": {
    "name": "홍길동",
    "birthDate": "1990-05-15",
    "birthHour": "ja",
    "gender": "male"
  }
}
```

**Response**: SSE 스트리밍
```
data: {"chunk": "해석 텍스트..."}
data: {"done": true, "result": {"overallReading": "...", "topicReading": "...", "advice": "..."}, "sajuData": { ... }, "dbSaved": true}
```

### `GET /api/saju/result/[id]`

share_token으로 사주 결과 조회. `saju_readings` 테이블에서 전체 데이터 반환.

---

## AI 프롬프트 전략

### System Prompt

캐릭터 성격/말투 + 사주명리학 전문가 역할 정의. 부정적 내용도 긍정적 방향으로 조언하도록 지시. 반드시 JSON 형식 응답.

### User Prompt

서버에서 계산한 사주 데이터 전체를 구조화하여 전달:
- 사주팔자 (4주 8자)
- 오행 분포
- 십성/12운성
- 합/충/형
- 용신 + 신강/신약
- 대운/세운
- 주제별 분석 지시 (종합운세는 기간별로 분기)

---

## 마이페이지 통합

- 타로/사주 히스토리를 시간순 통합 표시
- `service_type` 태그로 구분: `TAROT` (보라) / `SAJU` (분홍)
- 사주 히스토리는 `saju_readings` 테이블에서 join
- 사주 항목 클릭 → `/saju/result/[share_token]`

## 홈페이지/네비게이션 연동

- Header/MobileNav에 "사주 상담" 메뉴 추가
- ServiceFlow 섹션에 사주 서비스 카드 추가
- CharacterGallery에서 선화 클릭 시 `/saju` 연결 가능

---

## 기술 의존성

### 신규 패키지

- `lunar-javascript`: 음양력 변환 + 절기 + 간지 계산

### 기존 재사용

- `DivinationService` 인터페이스
- `GrokProvider` (AI 스트리밍)
- `UserInfo` 타입 + `birthHours` 데이터
- 타로 SSE 스트리밍 패턴
- 레이아웃 5:5 규칙
- 공유 메커니즘 (share_token)
