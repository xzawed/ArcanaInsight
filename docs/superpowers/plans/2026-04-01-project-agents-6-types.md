# ArcanaInsight 프로젝트 전용 에이전트 6종 생성

## Context

ArcanaInsight 프로젝트에서 반복적으로 수행되는 작업(서비스 추가, 캐릭터 관리, 프롬프트 관리, DB 마이그레이션, 카드 스킨 파이프라인, 코드 검증)을 자동화하기 위한 프로젝트 전용 커스텀 에이전트 6종을 생성한다. 기존 superpowers 스킬(brainstorming, TDD, debugging 등)과 중복되지 않으며, DivinationService 패턴, 12캐릭터 시스템, 78장 카드/6스킨 체계에 특화된다.

## 생성할 파일

모든 에이전트는 `.claude/agents/` 디렉토리에 마크다운 파일로 생성한다.

```
.claude/agents/
├── divination-scaffold.md
├── character-integrity.md
├── prompt-lab.md
├── migration-guard.md
├── skin-pipeline.md
└── arcana-verify.md
```

## 구현 단계

### Step 1: .claude/agents/ 디렉토리 확인 및 생성

### Step 2: divination-scaffold.md 생성
- **역할**: 새 DivinationService 구현체 추가 시 7개 파일 일괄 스캐폴딩
- **참조 파일**:
  - `src/types/service.ts` (DivinationService 인터페이스)
  - `src/services/tarot/tarot-service.ts` (기존 패턴)
  - `src/services/saju/saju-service.ts` (기존 패턴)
  - `src/hooks/useSession.ts`, `src/hooks/useSajuSession.ts` (Zustand 스토어 패턴)
  - `src/app/api/tarot/reading/route.ts` (SSE 스트리밍 패턴)
  - `supabase/migrations/006_saju_readings.sql` (마이그레이션 패턴)
- **생성 대상**: 서비스 클래스, Zustand 스토어, 페이지 3개, API 라우트, DB 마이그레이션
- **검증 포함**: DivinationService 인터페이스 메서드 구현, 레이아웃 5:5 규칙, Topic 타입 호환성

### Step 3: character-integrity.md 생성
- **역할**: 캐릭터 데이터-이미지-대사-프롬프트 정합성 검증
- **검증 항목**: CharacterConfig 필드 완전성, 이미지 6표정 존재, 대기 대사 존재, 서비스 연동 일관성
- **참조 파일**:
  - `src/data/characters/index.ts` (캐릭터 데이터)
  - `src/data/characters/waiting-lines.ts` (대기 대사)
  - `src/types/character.ts` (Mood, CharacterConfig 타입)
  - `public/images/characters/` (이미지 에셋)

### Step 4: prompt-lab.md 생성
- **역할**: Grok AI 프롬프트 관리/테스트/캐릭터 말투 검증
- **기능**: review(인벤토리), compare(말투 대조), test(API 시뮬레이션), optimize(토큰 최적화)
- **참조 파일**:
  - `src/services/core/prompt-builder.ts` (프롬프트 빌더)
  - `src/services/core/grok-provider.ts` (AI Provider)
  - `src/data/characters/index.ts` (speechStyle, personality)

### Step 5: migration-guard.md 생성
- **역할**: Supabase 마이그레이션 생성/검증/RLS 감사
- **기능**: create(자동 번호 할당 + 템플릿 생성), validate(호환성), audit(RLS 정책)
- **참조 파일**:
  - `supabase/migrations/` (전체 마이그레이션 파일)
  - `src/types/session.ts` (Topic, SpreadType 타입)

### Step 6: skin-pipeline.md 생성
- **역할**: 카드 스킨 생성→검수→업로드 파이프라인
- **기능**: generate(이미지 생성), verify(78+1장 완전성), upload(Supabase Storage), status(현황)
- **참조 파일**:
  - `scripts/generate-skin-images.ts` (생성 스크립트)
  - `scripts/upload-skin-images.ts` (업로드 스크립트)
  - `src/data/skins/index.ts` (스킨 정의)

### Step 7: arcana-verify.md 생성
- **역할**: CLAUDE.md 4단계 검증 + 프로젝트 특화 규칙 검증
- **기능**: tsc+lint+build 5회 반복, 레이아웃 5:5 규칙, DivinationService 인터페이스 준수, any 타입 사용 금지
- **참조**: CLAUDE.md 코드 변경 프로세스

## 검증

- 각 에이전트 파일이 `.claude/agents/` 에 정상 생성되었는지 확인
- 에이전트 파일 내 참조 경로가 실제 존재하는 파일인지 검증
- `pnpm tsc --noEmit` + `pnpm lint` + `pnpm build` 영향 없음 확인 (에이전트 파일은 코드가 아니므로 빌드에 영향 없음)
