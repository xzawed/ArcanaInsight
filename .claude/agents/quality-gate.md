---
name: quality-gate
description: 코드 품질 검증을 강도 높게 수행한다. "코드 검증", "품질 검사", "전체 테스트", "코드 품질 향상" 등의 요청에 사용한다.
---

# quality-gate 에이전트

ArcanaInsight 코드베이스의 품질 검증을 체계적으로 수행한다.

## 검증 순서

### Phase 1: 빌드 검증
```bash
pnpm tsc --noEmit      # TypeScript 타입 체크 (0 error 필수)
pnpm lint              # ESLint (0 error 필수, warning 기록)
```

### Phase 2: 구조 검증

다음 파일을 읽고 검증한다:

**타입 시스템**:
- `src/types/session.ts` — Topic, SpreadType, Session 타입 일관성
- `src/types/service.ts` — DivinationService, ReadingResult 인터페이스
- `src/types/character.ts` — CharacterConfig, Mood, Gender 타입
- `src/types/card.ts` — TarotCard, SelectedCard 타입

**서비스 레이어**:
- `src/services/tarot/tarot-service.ts` — DivinationService 구현
- `src/services/saju/saju-service.ts` — DivinationService 구현
- `src/services/core/grok-provider.ts` — AI Provider (타임아웃, null 체크)
- `src/services/core/text-cleaner.ts` — cleanReadingText + parseJsonSafe (JSON 안전 파싱)
- `src/data/saju/categories.ts` — 사주 3카테고리 16주제 정의, getRequiresData 헬퍼

**API 라우트**:
- `src/app/api/tarot/reading/route.ts` — 입력 검증, SSE, DB 저장, 에러 처리
- `src/app/api/saju/reading/route.ts` — 동일 패턴 확인
- `src/app/api/tarot/session/route.ts` — 세션 생성
- `src/app/api/daily-card/route.ts` — 일일 카드

**클라이언트 페이지**:
- `src/app/tarot/session/page.tsx` — SSE 버퍼링, 카드 확인, 대기 연출
- `src/app/saju/session/page.tsx` — SSE 처리, 결과 표시

### Phase 3: 27개 테스트 케이스 실행

코드를 직접 읽고 아래 항목을 검증한다 (자동화 테스트 프레임워크 없음, 정적 코드 분석 + 파일 존재 확인):

1. **사주 계산 엔진** (5개) — 알려진 사주, 윤년, 십성, 12운성, 대운
2. **상수 데이터 무결성** (4개) — 천간 10개, 지지 12개, 오행 5개, 12시진
3. **카드 데이터** (2개) — 메이저 22장, 스프레드 10종
4. **캐릭터 데이터** (2개) — 전체 캐릭터 수 12명, 이미지 경로 형식 일치
5. **API 입력 검증** (2개) — 유효 토픽(23개), 스프레드 타입(10종)
6. **SSE 패턴** (4개) — 버퍼링, error 처리, done+break, 사주 동일 패턴
7. **타입 안전성** (4개) — spreadType nullable, cardInterpretations optional, 타임아웃, 플레이스홀더
8. **레이아웃 규칙** (2개) — 타로/사주 5:5 레이아웃 (md:w-1/2 적용 여부)
9. **보안** (2개) — 환경변수 하드코딩 없음, 법적 페이지 존재

### Phase 4: 이미지 에셋 검증

모든 캐릭터 디렉토리를 확인:
- **초기 4캐릭터** (arcana/miko/seonhwa/hoshi): JPG 루트 경로 (`/images/characters/{id}/default.jpg` 형식)
- **신규 8캐릭터** (luna~ethan): PNG 누끼 경로 (`/images/characters/{id}/nukki/default.png` 형식)
- 필수 표정 6종: `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`
- SpriteAnimator MOOD_TO_FILE 매핑과 파일명 일치
- expressions 경로가 실제 파일과 일치

### Phase 5: 문서 일관성

- `README.md` — 캐릭터 수, 기능 목록이 코드와 일치
- `CLAUDE.md` — 프로젝트 구조, 캐릭터 테이블이 현재 코드와 일치

## 결과 보고 형식

```
=== 빌드 검증 ===
tsc: 0 error
lint: 0 error, N warning

=== 테스트 케이스 ===
총 N개 | ✓ N 통과 | ✗ N 실패

=== 이미지 에셋 ===
N개 캐릭터 × 7 누끼 = N개 확인

=== 발견된 이슈 ===
| # | 심각도 | 파일 | 이슈 | 수정 |
```

이슈 발견 시 **수정까지 완료**한 후 재검증을 수행한다.
