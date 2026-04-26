# 서비스 아키텍처 — 전체 흐름 개요

ArcanaInsight의 3개 운세 서비스(타로·사주·신점) 사용자 흐름 및 데이터 모델을 정의합니다.

---

## 1. 서비스별 사용자 흐름

### 타로 (4단계)

1. **캐릭터 선택** → 12명 중 선택 (성별 필터 지원). 선호 상담사 설정 시 자동 스킵
2. **개인정보 입력** → 생년월일, 출생시간(12시진), 성별, 혈액형 + 제3자 제공 동의
3. **주제 선택 + 카드 뽑기** → 주제 선택 → 스프레드 선택 → 카드 선택
4. **AI 리딩 결과** → Grok AI가 SSE 스트리밍으로 해석 → 결과 공유(share_token URL)

### 사주 (4단계)

1. **캐릭터 선택** → 12명 중 선택 (성별 필터 지원). 선호 상담사 설정 시 자동 스킵
2. **개인정보 입력** → 생년월일, 출생시간(12시진), 성별, 혈액형 + 제3자 제공 동의
3. **시간단위 × 분석영역 선택** → 시간단위(7) + 분석영역(8) 동시 선택, 년단위 시 "월별 상세" 토글
4. **AI 리딩 결과** → Grok AI가 SSE 스트리밍으로 해석 → 결과 공유

### 신점 (3단계)

1. **캐릭터 선택** → 12명 중 선택. 선호 상담사 설정 시 자동 스킵
2. **주제 선택** → 신수(종합운), 연애/궁합, 재물/사업운, 직장/이직, 건강/액막이, 택일
3. **대화형 상담** → 무제한 문답 → "신점 결과 받기" 버튼으로 종료 (1턴 이상 후 활성화)

> 신점 결과 공유 페이지(`/shinjeom/result/[id]`) 구현 완료 (PR #142) — mypage 링크 활성화

---

## 2. 주제(Topic) 목록 — 총 21개

| 구분 | Topic 값 | 한국어 |
|------|---------|--------|
| 타로 | `love` | 연애 (전체) |
| 타로 | `love-single` | 연애 (솔로) |
| 타로 | `love-couple` | 연애 (커플) |
| 타로 | `finance` | 재물 |
| 타로 | `career` | 직업/직장 |
| 타로 | `health` | 건강 |
| 타로 | `general` | 종합 |
| 사주 분석영역 | `saju-general` | 종합운 |
| 사주 분석영역 | `saju-love-single` | 연애운 (솔로) |
| 사주 분석영역 | `saju-love-couple` | 연애운 (커플) |
| 사주 분석영역 | `saju-career` | 직장·재물운 |
| 사주 분석영역 | `saju-health` | 건강운 |
| 사주 분석영역 | `saju-personality` | 성격·적성 |
| 사주 분석영역 | `saju-compatibility` | 궁합 |
| 사주 분석영역 | `saju-auspicious-date` | 택일 |
| 신점 | `shinjeom-general` | 신수 (종합운) |
| 신점 | `shinjeom-love` | 연애/궁합 |
| 신점 | `shinjeom-wealth` | 재물/사업운 |
| 신점 | `shinjeom-career` | 직장/이직 |
| 신점 | `shinjeom-health` | 건강/액막이 |
| 신점 | `shinjeom-auspicious` | 택일 (날짜 선택) |

정본 코드: `src/data/topics.ts` — `TAROT_TOPICS`, `SAJU_TOPICS`, `SHINJEOM_TOPICS`, `ALL_TOPICS`

---

## 3. 사주 시간단위(`SajuTimeRange`) — 7개

`src/types/session.ts` 정의:

| 값 | 한국어 | 월별 상세 토글 |
|----|--------|--------------|
| `this-week` | 이번 주 | ✗ |
| `this-month` | 이번 달 | ✗ |
| `this-year` | 올해 | ✓ |
| `next-year` | 내년 | ✓ |
| `three-year` | 3년 | ✓ |
| `five-year` | 5년 | ✓ |
| `full-fortune` | 전체 대운 | ✗ |

---

## 4. 타로 스프레드 × 주제 노출 규칙

`src/app/tarot/page.tsx`의 `topicSpreads`에서 주제별로 노출할 스프레드를 제한합니다:

| 주제 | 노출 스프레드 |
|------|-------------|
| 연애 (솔로) | 원카드, 쓰리카드, 5장 켈틱, 10장 켈틱 |
| 연애 (커플) | 원카드, 쓰리카드, 관계 스프레드, 10장 켈틱 |
| 직장/진로 | 원카드, 쓰리카드, 5장 켈틱, 말굽, 10장 켈틱 |
| 재정/금전 | 원카드, 쓰리카드, 말굽, 의사결정, 10장 켈틱 |
| 건강 | 원카드, 쓰리카드, 5장 켈틱 |
| 일반 상담 | 원카드, 쓰리카드, 5장 켈틱, 10장 켈틱, 한 주 전망, 조디악 휠, 생명의 나무 (7종) |

전체 스프레드 정의: `src/data/spreads/` — 10종

---

## 5. 선호 상담사 자동 선택

- 마이페이지에서 선호 상담사를 설정하면 이후 서비스 진입 시 캐릭터 선택 단계 자동 스킵
- `useFavoriteCharacter(skip)` 훅이 `/api/profile/favorite-character`를 통해 `profiles.favorite_character_id` 조회
- API 라우트가 `getDb()`를 사용하므로 `DB_PROVIDER` 추상화 완전 적용
- 캐릭터 상세 페이지 진입: `?character=xxx` URL 파라미터로 스킵 (타로·사주·신점 모두 지원)
- 홈 직접 접속: `useEffect` fallback으로 자동 선택. `skip=true`이면 fetch 생략

---

## 6. 홈 페이지 구성 (`src/app/page.tsx`)

7개 섹션을 순서대로 조합:

1. **HeroSection** — 풀스크린 히어로 (캐릭터 + 카피 + CTA)
2. **CharacterGallery** — 12캐릭터 갤러리 (카드형, 성별 필터 내장)
3. **DailyCard** — 캐릭터별 일일 운세 (탭 전환 + 카드 뒤집기 + 공유)
4. **SkinGallery** — 카드 스킨 갤러리 (6종)
5. **ServiceFlow** — 서비스 이용 흐름 소개
6. **FAQ** — 아코디언 FAQ
7. **BottomCTA** — 하단 행동 유도

> GenderFilter, StatsCounter, ReviewCarousel 컴포넌트는 `components/home/`에 존재하지만 현재 `page.tsx`에서 미사용
