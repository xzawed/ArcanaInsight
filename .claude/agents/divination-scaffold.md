---
name: divination-scaffold
description: 새 DivinationService 구현체 추가 시 필요한 파일들을 일괄 스캐폴딩한다. "신점 서비스 추가", "새 운세 서비스 만들어줘", "fortune 서비스 구현" 등의 요청에 사용한다.
---

# divination-scaffold 에이전트

새 DivinationService 구현체를 ArcanaInsight 프로젝트에 추가할 때 사용한다.
기존 TarotService, SajuService 패턴을 정확히 따라 파일을 생성한다.

## 참조해야 할 기존 패턴 파일

작업 전 반드시 이 파일들을 읽어 패턴을 파악한다:

- `src/types/service.ts` — DivinationService 인터페이스 정의
- `src/types/session.ts` — Topic, SpreadType 유니온 타입
- `src/services/tarot/tarot-service.ts` — 카드 기반 서비스 패턴
- `src/services/saju/saju-service.ts` — 정보 입력 기반 서비스 패턴
- `src/hooks/useSession.ts` — 타로 Zustand 스토어 패턴
- `src/hooks/useSajuSession.ts` — 사주 Zustand 스토어 패턴
- `src/app/api/tarot/reading/route.ts` — SSE 스트리밍 API 패턴
- `src/app/api/saju/reading/route.ts` — 사주 API 패턴
- `src/app/saju/page.tsx` — 서비스 메인 페이지 패턴
- `supabase/migrations/006_saju_readings.sql` — 마이그레이션 패턴

## 스캐폴딩 전 수집할 정보

사용자에게 다음을 확인한다:
1. `serviceName` — 서비스 ID (영문 소문자, 예: `shinjeom`, `fortune`)
2. `serviceNameKo` — 서비스 한국어 명칭 (예: `신점`, `오늘의 운세`)
3. `linkedCharacterId` — 기본 연결 캐릭터 ID (예: `miko`, `hoshi`)
4. `hasCards` — 카드 선택 단계 존재 여부 (타로처럼 카드 필요 → true, 사주처럼 정보 입력 → false)
5. `topics` — 서비스 전용 토픽 목록 (예: `["love", "health"]` 또는 신규 토픽)

## 생성할 파일 목록 (총 6~7개)

### 1. 서비스 클래스
**경로**: `src/services/{serviceName}/{serviceName}-service.ts`

DivinationService 인터페이스를 구현한다. 필수 메서드:
- `id: string`
- `name: string`
- `getCharacter(): CharacterConfig` — `getCharacterById(linkedCharacterId)`로 조회
- `startSession(topic: Topic): Omit<Session, "id" | "createdAt">`
- `getSystemPrompt(characterId?: string): string` — `buildSystemPrompt(character)` 활용
- `getReadingPrompt(context: SessionContext): string`
- `parseResult(aiResponse: string): ReadingResult` — `cleanReadingText()` 포함

### 2. Zustand 세션 스토어
**경로**: `src/hooks/use{ServiceName}Session.ts`

`create<State>()` 기본 패턴. 포함할 상태:
- `phase`: 서비스 고유 단계 (`topic-select` → ... → `result`)
- `selectedTopic: Topic | null`
- `chatMessages: ChatMessage[]`
- `readingResult: ReadingResult | null`
- `isStreaming: boolean`
- hasCards가 true이면 카드 관련 상태 추가

### 3. 서비스 메인 페이지
**경로**: `src/app/{serviceName}/page.tsx`

**필수 준수**: 레이아웃 5:5 규칙
- `'use client'` 지시문 필요
- 데스크탑(md 이상): 좌측 캐릭터 `md:w-1/2` + 우측 콘텐츠 `md:w-1/2`
- 모바일: `flex-col` 세로 배치 (캐릭터 → 콘텐츠)
- `CharacterDisplay` 컴포넌트 사용
- `TypingDialogue`로 캐릭터 대사 표시

### 4. 세션 페이지
**경로**: `src/app/{serviceName}/session/page.tsx`

- SSE 스트리밍 수신 처리
- 레이아웃 5:5 규칙 준수
- 스트리밍 중/완료 후 UI 상태 분기

### 5. API 리딩 라우트
**경로**: `src/app/api/{serviceName}/reading/route.ts`

SSE 스트리밍 패턴 (기존 패턴과 동일):
```typescript
// 핵심 구조
const service = new {ServiceName}Service();
const provider = new GrokProvider();
const systemPrompt = service.getSystemPrompt(characterId);
const readingPrompt = service.getReadingPrompt(context);
// ReadableStream + TextEncoder로 SSE 전송
// 완료 시 parseResult() + Supabase DB 저장
```

### 6. DB 마이그레이션
**경로**: `supabase/migrations/{nextNumber}_{serviceName}.sql`

번호는 기존 마이그레이션 파일 목록을 확인해 다음 번호 자동 할당 (예: 007이 최신이면 008).

포함 항목:
- `{serviceName}_readings` 테이블 생성 (sessions(id) 외래키)
- 인덱스 생성
- RLS 활성화 + 정책 설정
- `sessions` 테이블의 `service_type` CHECK 제약 확장 (필요 시)
- `topics` CHECK 제약 확장 (새 토픽 추가 시)

### 7. 대기 대사 추가 (선택)
**파일**: `src/data/characters/waiting-lines.ts`

`linkedCharacterId` 키로 대기 대사 배열 추가. 없으면 `defaultWaitingLines`가 fallback으로 사용됨.

## 생성 후 검증

```bash
pnpm tsc --noEmit   # 타입 에러 확인
pnpm lint           # ESLint 확인
```

타입 에러 발생 시:
1. `src/types/session.ts`의 `Topic` 유니온에 새 토픽 추가됐는지 확인
2. DivinationService 인터페이스 메서드가 모두 구현됐는지 확인
3. SSE 응답 타입 일치 확인

## 레이아웃 5:5 규칙 체크리스트

생성된 페이지 파일에서 다음을 확인한다:
- [ ] 최상위 컨테이너에 `flex` + `flex-col md:flex-row` 적용
- [ ] 캐릭터 영역: `w-full md:w-1/2`
- [ ] 콘텐츠 영역: `w-full md:w-1/2`
- [ ] 캐릭터 이미지에 CSS mask 그라디언트 적용 (배경 블렌딩)
