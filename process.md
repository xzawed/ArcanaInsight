# ArcanaInsight — 내부 프로세스 흐름도

## 전체 서비스 아키텍처

```mermaid
graph TB
    subgraph Client["클라이언트 (Next.js App Router)"]
        HOME["홈 페이지<br/>page.tsx"]
        TAROT["타로 서비스<br/>/tarot"]
        SAJU["사주 서비스<br/>/saju"]
        AUTH["인증<br/>/auth/login"]
        MYPAGE["마이페이지<br/>/mypage"]
        CHAR["캐릭터 상세<br/>/character/[id]"]
    end

    subgraph API["API 라우트 (서버)"]
        API_TAROT_SESSION["/api/tarot/session"]
        API_TAROT_READING["/api/tarot/reading"]
        API_SAJU_SESSION["/api/saju/session"]
        API_SAJU_READING["/api/saju/reading"]
        API_DAILY["/api/daily-card"]
    end

    subgraph Services["서비스 레이어"]
        GROK["GrokProvider<br/>AI 스트리밍"]
        TAROT_SVC["TarotService<br/>프롬프트 + 파싱"]
        SAJU_SVC["SajuService<br/>프롬프트 + 파싱"]
        SAJU_CALC["SajuCalculator<br/>사주 계산"]
        PROMPT["PromptBuilder<br/>프롬프트 생성"]
        CLEANER["TextCleaner<br/>응답 정리"]
    end

    subgraph External["외부 서비스"]
        GROK_API["Grok API<br/>(xAI)"]
        SUPABASE["Supabase<br/>PostgreSQL + Auth"]
    end

    HOME --> TAROT & SAJU & AUTH & CHAR
    TAROT --> API_TAROT_SESSION & API_TAROT_READING
    SAJU --> API_SAJU_SESSION & API_SAJU_READING
    HOME --> API_DAILY

    API_TAROT_READING --> TAROT_SVC --> PROMPT
    API_TAROT_READING --> GROK --> GROK_API
    API_TAROT_READING --> CLEANER
    API_SAJU_READING --> SAJU_SVC --> SAJU_CALC
    API_SAJU_READING --> GROK
    API_SAJU_READING --> CLEANER

    API_TAROT_SESSION --> SUPABASE
    API_TAROT_READING --> SUPABASE
    API_SAJU_SESSION --> SUPABASE
    API_SAJU_READING --> SUPABASE
    API_DAILY --> SUPABASE
    AUTH --> SUPABASE
```

---

## 타로 서비스 흐름

### 사용자 여정 (4단계)

```mermaid
flowchart LR
    A["1️⃣ 캐릭터 선택"] --> B["2️⃣ 개인정보 입력<br/>(선택)"]
    B --> C["3️⃣ 주제 + 스프레드<br/>선택"]
    C --> D["4️⃣ 카드 선택<br/>→ AI 리딩"]
```

### 타로 상세 흐름

```mermaid
flowchart TD
    START(["사용자 /tarot 진입"]) --> CHAR_SELECT

    subgraph STEP1["1단계: 캐릭터 선택"]
        CHAR_SELECT["12캐릭터 그리드 표시<br/>성별 필터 지원"]
        CHAR_SELECT --> |"캐릭터 클릭"| CHAR_DETAIL["캐릭터 상세 확인<br/>이름·성격·리딩 스타일"]
        CHAR_DETAIL --> |"상담 시작 버튼"| TOPIC_SELECT
    end

    subgraph STEP2["2단계: 주제 선택"]
        TOPIC_SELECT["6개 주제 표시<br/>연애(솔로/커플)·직장·재정·건강·종합"]
        TOPIC_SELECT --> |"주제 선택"| SPREAD_SELECT
    end

    subgraph STEP3["3단계: 스프레드 선택"]
        SPREAD_SELECT["10종 스프레드 표시<br/>원카드(1장) ~ 조디악(12장)"]
        SPREAD_SELECT --> |"스프레드 선택"| SESSION_CREATE

        USER_INFO["개인정보 입력<br/>(이름·생년월일·성별·출생시)"]
        SPREAD_SELECT -.-> |"선택사항"| USER_INFO
        USER_INFO -.-> SPREAD_SELECT
    end

    subgraph STEP4["4단계: 카드 선택 + 리딩"]
        SESSION_CREATE["POST /api/tarot/session<br/>Supabase 세션 생성"]
        SESSION_CREATE --> CARD_SHUFFLE["78장 카드 셔플<br/>(Fisher-Yates)"]
        CARD_SHUFFLE --> CARD_SPREAD["카드 아크 배치<br/>애니메이션"]
        CARD_SPREAD --> CARD_SELECT{"카드 선택<br/>(필요 장수만큼)"}

        CARD_SELECT --> |"확인 모드 ON"| CONFIRM["확인/다시 고르기<br/>선택"]
        CARD_SELECT --> |"확인 모드 OFF"| AUTO["즉시 다음 카드<br/>(마지막만 확인)"]
        CONFIRM --> |"확인"| CARD_SELECT
        AUTO --> CARD_SELECT

        CARD_SELECT --> |"모든 카드 선택 완료"| READING["AI 리딩 시작"]
    end

    READING --> SSE_STREAM

    subgraph READING_FLOW["AI 리딩 프로세스"]
        SSE_STREAM["POST /api/tarot/reading<br/>SSE 스트리밍 시작"]
        SSE_STREAM --> WAITING["대기 연출<br/>카드 순차 뒤집기 + 캐릭터 대사"]
        SSE_STREAM --> GROK_CALL["GrokProvider.streamReading()<br/>Grok API 호출"]
        GROK_CALL --> PARSE["TarotService.parseResult()<br/>JSON 파싱 + cleanReadingText()"]
        PARSE --> DB_SAVE["Supabase 저장<br/>readings + session_cards"]
    end

    DB_SAVE --> RESULT

    subgraph RESULT_PHASE["결과 표시"]
        RESULT["카드별 해석<br/>종합 해석<br/>조언"]
        RESULT --> SHARE["결과 공유<br/>/tarot/result/[shareToken]"]
        RESULT --> NEW["새로운 상담<br/>/tarot로 이동"]
    end
```

---

## 사주 서비스 흐름

### 사용자 여정 (4단계)

```mermaid
flowchart LR
    A["1️⃣ 캐릭터 선택"] --> B["2️⃣ 개인정보 입력<br/>(필수)"]
    B --> C["3️⃣ 시간단위 ×<br/>분석영역 선택"]
    C --> D["4️⃣ AI 사주 분석"]
```

### 사주 상세 흐름

```mermaid
flowchart TD
    START(["사용자 /saju 진입"]) --> CHAR_SELECT

    subgraph STEP1["1단계: 캐릭터 선택"]
        CHAR_SELECT["12캐릭터 그리드 표시<br/>성별 필터 지원"]
        CHAR_SELECT --> |"캐릭터 클릭"| INFO_INPUT
    end

    subgraph STEP2["2단계: 개인정보 입력 (필수)"]
        INFO_INPUT["UserInfoForm<br/>이름·생년월일·출생시·성별"]
        INFO_INPUT --> |"입력 완료"| SAJU_SELECT
    end

    subgraph STEP3["3단계: 시간단위 × 분석영역"]
        SAJU_SELECT["시간단위 7개<br/>이번 주 ~ 전체 대운"]
        SAJU_SELECT --> TIME_SELECT{"시간단위 선택"}
        TIME_SELECT --> |"년단위 선택 시"| MONTHLY["월별 상세 토글<br/>(ON/OFF)"]
        TIME_SELECT --> AREA_SELECT
        MONTHLY --> AREA_SELECT

        AREA_SELECT["분석영역 8개<br/>종합운·연애·직장·건강·성격·궁합·택일"]
        AREA_SELECT --> |"모두 선택 완료"| START_BTN["사주 분석 시작 버튼"]
    end

    START_BTN --> SESSION_CREATE

    subgraph STEP4["4단계: AI 사주 분석"]
        SESSION_CREATE["POST /api/saju/session<br/>Supabase 세션 생성"]
        SESSION_CREATE --> CALC["SajuCalculator<br/>사주팔자 계산"]
    end

    CALC --> CALC_DETAIL

    subgraph CALCULATION["사주 계산 엔진"]
        CALC_DETAIL["천간·지지 계산<br/>연주·월주·일주·시주"]
        CALC_DETAIL --> ELEMENTS["오행 분포 분석<br/>목·화·토·금·수"]
        ELEMENTS --> STARS["십성 + 12운성<br/>합·충·형 관계"]
        STARS --> FORTUNE["대운·세운·월운<br/>계산"]
        FORTUNE --> YONGSIN["용신 판단<br/>신강/신약 분석"]
    end

    YONGSIN --> PROMPT_BUILD

    subgraph READING_FLOW["AI 리딩 프로세스"]
        PROMPT_BUILD["SajuService.buildSajuPrompt()<br/>사주 데이터 + 주제 지시문"]
        PROMPT_BUILD --> GROK_CALL["POST /api/saju/reading<br/>SSE 스트리밍"]
        GROK_CALL --> GROK_API["GrokProvider.streamReading()<br/>Grok API 호출"]
        GROK_API --> PARSE["SajuService.parseResult()<br/>JSON 파싱 + cleanReadingText()"]
        PARSE --> DB_SAVE["Supabase 저장<br/>saju_readings + sessions"]
    end

    DB_SAVE --> RESULT

    subgraph RESULT_PHASE["결과 표시"]
        RESULT["SajuChart 사주 차트<br/>OhaengGraph 오행 그래프<br/>DaeunTimeline 대운 타임라인"]
        RESULT --> READING_DISPLAY["종합 해석<br/>주제별 해석<br/>조언"]
        READING_DISPLAY --> SHARE["결과 공유"]
        READING_DISPLAY --> NEW["새로운 상담"]
    end
```

---

## AI 리딩 파이프라인 (타로/사주 공통)

```mermaid
sequenceDiagram
    participant C as 클라이언트
    participant API as API 라우트
    participant SVC as Service<br/>(Tarot/Saju)
    participant PB as PromptBuilder
    participant GP as GrokProvider
    participant GROK as Grok API (xAI)
    participant TC as TextCleaner
    participant DB as Supabase

    C->>API: POST /api/{tarot|saju}/reading
    API->>SVC: getSystemPrompt(characterId)
    SVC->>PB: buildSystemPrompt(character)
    PB-->>SVC: 시스템 프롬프트<br/>(캐릭터 성격 + 작문 규칙 + JSON 형식)
    SVC-->>API: 시스템 프롬프트

    Note over API: 타로: buildReadingPrompt()<br/>사주: buildSajuPrompt()

    API->>GP: streamReading(system, user)
    GP->>GROK: POST /v1/chat/completions<br/>(stream: true)

    loop SSE 청크 수신
        GROK-->>GP: data: {"choices":[{"delta":{"content":"..."}}]}
        GP-->>API: yield chunk
        API-->>C: data: {"chunk":"..."}
    end

    GROK-->>GP: data: [DONE]
    GP-->>API: 스트림 종료

    API->>SVC: parseResult(fullResponse)
    SVC->>TC: parseJsonSafe(raw)
    TC-->>SVC: 파싱된 JSON 객체
    SVC->>TC: cleanReadingText(text)
    TC-->>SVC: 정리된 텍스트
    SVC-->>API: ReadingResult

    API->>DB: INSERT readings/saju_readings
    API->>DB: UPDATE sessions (completed)
    DB-->>API: share_token

    API-->>C: data: {"done":true, "result":{...}, "shareToken":"..."}
```

---

## 상태 관리 흐름 (Zustand)

```mermaid
stateDiagram-v2
    [*] --> TopicSelect: /tarot 진입

    state "타로 세션 상태 (useSessionStore)" as TarotState {
        TopicSelect --> CardShuffle: setSpreadType()
        CardShuffle --> CardSelect: setPhase("card-select")
        CardSelect --> Reading: startReading()
        Reading --> Result: setPhase("result")
        Result --> [*]: reset()
    }

    state "사주 세션 상태 (useSajuSessionStore)" as SajuState {
        [*] --> InfoInput: /saju 진입
        InfoInput --> SajuSelect: setUserInfo()
        SajuSelect --> SajuReading: setPhase("reading")
        SajuReading --> SajuResult: setPhase("result")
        SajuResult --> [*]: reset()
    }

    state "캐릭터 상태 (useCharacterStore)" as CharState {
        [*] --> Default: 초기
        Default --> Smile: 인사
        Smile --> Mystical: 카드 선택 유도
        Mystical --> Surprised: 카드 선택됨
        Surprised --> Serious: 카드 해석 중
        Serious --> Smile: 결과 완료
    }
```

---

## 인증 흐름

```mermaid
sequenceDiagram
    participant U as 사용자
    participant APP as ArcanaInsight
    participant SB as Supabase Auth
    participant OAuth as Google/Kakao

    U->>APP: 로그인 버튼 클릭
    APP->>SB: signInWithOAuth(provider)
    SB->>OAuth: OAuth 리다이렉트
    OAuth-->>U: 인증 화면
    U->>OAuth: 승인
    OAuth-->>SB: 인증 코드
    SB-->>APP: /auth/callback 리다이렉트
    APP->>SB: exchangeCodeForSession()
    SB-->>APP: 세션 토큰
    APP-->>U: 인증 완료 → 홈으로 이동

    Note over APP,SB: 비로그인도 서비스 이용 가능<br/>(세션 user_id = null)
```

---

## 데이터베이스 스키마 관계

```mermaid
erDiagram
    profiles {
        uuid id PK
        text birth_name
        date birth_date
        text gender
        text birth_hour
        uuid favorite_character_id
        timestamp privacy_agreed_at
    }

    sessions {
        uuid id PK
        uuid user_id FK
        text service_type
        text topic
        text spread_type
        text status
        text character_id
        timestamp completed_at
        timestamp created_at
    }

    readings {
        uuid id PK
        uuid session_id FK
        jsonb card_interpretation
        text overall_reading
        text advice
        text share_token
        timestamp created_at
    }

    session_cards {
        uuid id PK
        uuid session_id FK
        text card_id
        int position
        boolean is_reversed
    }

    saju_readings {
        uuid id PK
        uuid session_id FK
        date birth_date
        text birth_hour
        text gender
        jsonb pillars
        jsonb elements
        jsonb ten_stars
        jsonb twelve_stages
        jsonb interactions
        text day_master
        text day_master_element
        boolean is_strong
        jsonb yongsin
        jsonb major_fortunes
        jsonb yearly_fortune
        text overall_reading
        text topic_reading
        text advice
        text share_token
        timestamp created_at
    }

    daily_cards {
        uuid id PK
        text character_id
        date card_date
        text card_id
        text interpretation
        timestamp created_at
    }

    profiles ||--o{ sessions : "user_id"
    sessions ||--o| readings : "session_id"
    sessions ||--o{ session_cards : "session_id"
    sessions ||--o| saju_readings : "session_id"
```

---

## 홈 페이지 구성 흐름

```mermaid
flowchart TD
    subgraph HomePage["홈 페이지 (page.tsx) — 7개 섹션"]
        H1["HeroSection<br/>풀스크린 히어로 + CTA"]
        H2["CharacterGallery<br/>12캐릭터 카드 갤러리"]
        H3["DailyCard<br/>캐릭터별 일일 운세"]
        H4["SkinGallery<br/>카드 스킨 6종"]
        H5["ServiceFlow<br/>서비스 이용 흐름 소개"]
        H6["FAQ<br/>자주 묻는 질문"]
        H7["BottomCTA<br/>하단 행동 유도"]

        H1 --> H2 --> H3 --> H4 --> H5 --> H6 --> H7
    end

    H1 --> |"타로 상담 시작"| TAROT["/tarot"]
    H3 --> |"캐릭터 탭 클릭"| DAILY_API["POST /api/daily-card"]
    H2 --> |"캐릭터 클릭"| CHAR["/character/[id]"]
    CHAR --> TAROT & SAJU["/saju"]
```

---

## 일일 카드 흐름

```mermaid
sequenceDiagram
    participant U as 사용자
    participant DC as DailyCard 컴포넌트
    participant API as /api/daily-card
    participant DB as Supabase
    participant GP as GrokProvider

    U->>DC: 캐릭터 탭 클릭
    DC->>API: POST { characterId, date }

    API->>DB: daily_cards에서 캐시 조회<br/>(character_id + card_date)

    alt 캐시 존재
        DB-->>API: 저장된 카드 + 해석
        API-->>DC: { card, interpretation }
    else 캐시 없음
        API->>API: hashDateSeed()로<br/>오늘의 카드 결정
        API->>GP: generateReading()<br/>(캐릭터 말투로 해석)
        GP-->>API: AI 해석 텍스트
        API->>DB: daily_cards에 캐시 저장
        API-->>DC: { card, interpretation }
    end

    DC-->>U: 카드 뒤집기 애니메이션<br/>+ 해석 표시
```

---

## 파일 구조 → 흐름 매핑

| 흐름 단계 | 주요 파일 |
|---|---|
| **홈 페이지** | `src/app/page.tsx`, `src/components/home/*` |
| **인증** | `src/app/auth/login/page.tsx`, `src/lib/supabase/*` |
| **타로 선택** | `src/app/tarot/page.tsx` |
| **타로 세션** | `src/app/tarot/session/page.tsx` |
| **타로 API** | `src/app/api/tarot/session/route.ts`, `src/app/api/tarot/reading/route.ts` |
| **타로 결과 공유** | `src/app/tarot/result/[id]/page.tsx` |
| **사주 선택** | `src/app/saju/page.tsx` |
| **사주 세션** | `src/app/saju/session/page.tsx` |
| **사주 API** | `src/app/api/saju/session/route.ts`, `src/app/api/saju/reading/route.ts` |
| **AI 프롬프트** | `src/services/core/prompt-builder.ts`, `src/services/saju/saju-service.ts` |
| **AI 호출** | `src/services/core/grok-provider.ts` |
| **응답 정리** | `src/services/core/text-cleaner.ts` |
| **사주 계산** | `src/services/saju/saju-calculator.ts` |
| **카드 데이터** | `src/data/cards/*`, `src/data/spreads/*` |
| **캐릭터 데이터** | `src/data/characters/*` |
| **상태 관리** | `src/hooks/useSession.ts`, `src/hooks/useSajuSession.ts`, `src/hooks/useCharacter.ts` |
