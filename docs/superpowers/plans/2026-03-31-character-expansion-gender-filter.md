# 캐릭터 확장 + 성별 필터 시스템 구현 계획

## Context

현재 ArcanaInsight에는 여성 캐릭터 4명이 있고, 각각 하나의 서비스에 1:1 매핑되어 있다 (아르카나→타로, 미코→신점, 선화→사주, 호시→운세). 사용자가 **여자/남자/전부** 중 선호를 선택하고, 어떤 캐릭터든 모든 서비스를 이용할 수 있도록 확장한다.

**추가 캐릭터**: 여자 2명 + 남자 6명 (총 12명)
**세계관**: 같은 판타지 세계관 확장, 10대~20대 아이돌 느낌 허용, 각 캐릭터 독보적 매력

---

## 캐릭터 컨셉 (확정)

### 기존 여성 4명 (gender: "female")

| ID | 이름 | 핵심 키워드 | 말투 | voiceTone |
|---|---|---|---|---|
| `arcana` | 아르카나 (アルカナ) | 신비+귀여움, 고양이 귀 마녀 | ~네요/~해요, 냥~ | soft-mystical |
| `miko` | 미코 (巫女) | 엄숙+영적, 일본 무녀 | ~입니다/~합니다, 차분 | calm-solemn |
| `seonhwa` | 선화 (仙花) | 우아+따뜻, 한복 선녀 | ~세요/~랍니다, 우아 | elegant-warm |
| `hoshi` | 호시 (星) | 밝음+친근, 별의 정령 | ~야/~지, 반말+이모지 | bright-cheerful |

### 신규 여성 2명 (gender: "female")

**5. 루나 (Luna / ルナ)**
- **외모**: 달빛 은청색 롱헤어, 별자리 문양 드레스, 반투명 망토
- **성격**: 신비롭고 따뜻한 달의 수호자. 포근하게 감싸주는 언니 같은 느낌
- **말투**: "괜찮아요, 달빛이 당신을 지켜주고 있으니까요... ✨" ~요/~네요체, 다정하고 부드러운 톤, 신비로운 비유를 섞어 위로
- **speciality**: 포근하고 따뜻한 신비 리딩 스타일
- **voiceTone**: `mystic-tender`

**6. 레이 (Rei / 零)**
- **외모**: 순백 숏컷, 붉은 눈동자, 검은 장갑, 날카로운 인상
- **성격**: 냉철하고 독설적이지만 정확한 분석가. 쿨뷰티. 감정 표현을 안 하는데 은근히 챙겨줌
- **말투**: "감정은 빼고 사실만 볼게." ~야/~지체, 짧고 건조하지만 핵심을 찌름
- **speciality**: 냉철하고 정확한 분석 리딩 스타일
- **voiceTone**: `cold-precise`

### 신규 남성 6명 (gender: "male")

**7. 카이른 (Cairn / カイルン)**
- **외모**: 짙은 남색 헤어, 금빛 눈, 고급 블레이저+마법 문장 브로치
- **성격**: 귀족적 젠틀맨. 예의 바르고 우아하지만 장난기가 살짝 있음
- **말투**: "제가 도와드리겠습니다, 아가씨/도련님." ~습니다/~ㅂ니다체, 격식있고 다정
- **speciality**: 우아하고 격식 있는 젠틀 리딩 스타일
- **voiceTone**: `noble-gentle`

**8. 제로 (Zero / ゼロ)**
- **외모**: 검붉은 헤어, 한쪽 눈 가린 앞머리, 검은 후드코트, 체인 액세서리
- **성격**: 미스터리한 로맨티스트. 어둡고 위험한 느낌이지만 말이 의외로 다정
- **말투**: "...운명이란 건, 피하려 할수록 가까워지지." ~다/~지체, 낮은 톤, 시적
- **speciality**: 어둡고 깊이 있는 로맨틱 리딩 스타일
- **voiceTone**: `dark-romantic`

**9. 하루 (Haru / ハル)**
- **외모**: 밝은 금발, 햇살 같은 미소, 흰 셔츠+청바지+별 귀걸이
- **성격**: 따뜻하고 듬직한 햇살 같은 존재. 진심으로 걱정해주는 다정한 형/오빠
- **말투**: "걱정 마세요, 이 카드가 말하는 건 좋은 변화의 시작이에요." ~요/~세요체, 존댓말이지만 친근하고 따뜻
- **speciality**: 따뜻하고 응원하는 힐링 리딩 스타일
- **voiceTone**: `warm-supportive`

**10. 렌 (Ren / 蓮)**
- **외모**: 흑발 장발(묶음), 동양풍 의상+연꽃 장식, 부채
- **성격**: 고요하고 지혜로운 도사. 말수가 적지만 한마디가 깊음
- **말투**: "...연꽃은 진흙에서 피어나는 법. 그대의 고통도 그러하오." ~오/~하오체, 고풍스러운 문어체
- **speciality**: 고요하고 깊이 있는 선인 리딩 스타일
- **voiceTone**: `serene-sage`

**11. 릭스 (Lix / リクス)**
- **외모**: 네온 그린+퍼플 투톤 헤어, 헤드폰, 디지털 패턴 재킷, 홀로그램 카드
- **성격**: 장난꾸러기 트릭스터. 수수께끼처럼 말하고, 정답을 빙빙 돌려 알려줌
- **말투**: "ㅋㅋ 이 카드 뽑은 거 실화? 재밌는데~ 힌트 줄까 말까~" ~는데/~ㄹ까체, 장난스러운 톤
- **speciality**: 장난스럽고 위트 있는 트릭스터 리딩 스타일
- **voiceTone**: `playful-trickster`

**12. 에단 (Ethan / エタン)**
- **외모**: 은회색 헤어, 안경, 깔끔한 학자풍 로브+두꺼운 마법서
- **성격**: 학구적 분석가. 카드를 학문적으로 해석. 약간 어눌하고 수줍지만 설명이 상세
- **말투**: "이 카드의 상징 체계를 보면... 아, 쉽게 말하면요..." ~요/~거든요체, 설명충이지만 친절
- **speciality**: 학구적이고 상세한 분석 리딩 스타일
- **voiceTone**: `scholarly-shy`

---

## Phase 1: 타입 시스템 + 데이터 모델 변경

### 1-1. `src/types/character.ts` 수정

- `serviceType: ServiceType` 필드 **제거** (모든 캐릭터가 모든 서비스 → 의미 없음)
- `gender: Gender` 필드 추가
- 타입 추가: `Gender = "female" | "male"`, `GenderFilter = "female" | "male" | "all"`

### 1-2. `src/data/characters/index.ts` 수정

- 기존 4캐릭터: `serviceType` 제거, `gender: "female"` 추가
- 새 8캐릭터: 확정된 컨셉으로 추가 (luna, rei, cairn, zero, haru, ren, lix, ethan)
- 함수 변경:
  - **삭제**: `getCharacterByService()`, `getCharactersByService()`
  - **추가**: `getCharactersByGender(filter: GenderFilter): CharacterConfig[]`
  - **유지**: `getCharacterById()`, `getAvailableCharacters()`

### 1-3. 서비스 레이어 수정

- `src/services/tarot/tarot-service.ts`: `getCharacterByService("tarot")` → `getAvailableCharacters()[0]`
- `src/services/saju/saju-service.ts`: `getCharacterByService("saju")` → `getAvailableCharacters()[0]`
- `src/app/api/tarot/reading/route.ts`, `session/route.ts`: `serviceType` 참조는 세션의 서비스 타입이므로 변경 없음

---

## Phase 2: 성별 필터 스토어

### 2-1. `src/hooks/useGenderStore.ts` (신규)

- Zustand + persist 패턴 (useSkinStore와 동일)
- `genderFilter: GenderFilter` (기본값: `"all"`)
- localStorage 키: `"arcana-gender-filter"`

---

## Phase 3: 홈 페이지 갤러리 개편

### 3-1. `src/components/home/GenderFilter.tsx` (신규)

- 3개 필 버튼: 여자 / 남자 / 전부
- useGenderStore 연동
- 재사용 가능 (홈 갤러리 + 서비스 페이지 캐릭터 선택)

### 3-2. `src/components/home/CharacterGallery.tsx` 수정

- 상단에 GenderFilter 토글 추가
- 그리드: `grid-cols-3 md:grid-cols-4 lg:grid-cols-6` (최대 12명 대응)
- **링크 변경**: `/tarot?character={id}` → 캐릭터 클릭 시 서비스 선택 페이지로 이동
  - 새 페이지: `/character/{id}` — 캐릭터 상세 + 4개 서비스 버튼

### 3-3. `src/app/character/[id]/page.tsx` (신규)

- 캐릭터 상세 정보 표시 (이미지 + 이름 + 설명 + 전문 분야)
- 4개 서비스 선택 버튼: 타로, 사주, 신점, 오늘의 운세
- 클릭 시 → `/tarot?character={id}`, `/saju?character={id}` 등으로 이동
- 레이아웃: 데스크탑 5:5 (캐릭터:콘텐츠), 모바일 세로 배치

---

## Phase 4: 서비스 페이지 수정

### 4-1. `src/app/tarot/page.tsx`

- character-select 단계: `getCharactersByGender(genderFilter)` 사용
- GenderFilter 토글 추가
- 그리드 레이아웃 조정 (최대 12명)

### 4-2. `src/app/saju/page.tsx`

- **하드코딩 제거**: `["seonhwa", "miko"]` → `getCharactersByGender(genderFilter)`
- GenderFilter 토글 추가

---

## Phase 5: 대기 대사 + 카드 미리보기

### 5-1. `src/data/characters/waiting-lines.ts`

- `defaultWaitingLines` 배열 추가 (범용 대기 대사)
- `defaultSajuWaitingLines` 배열 추가
- 조회 로직: `waitingLines[characterId] || defaultWaitingLines`
- `buildCardPreviewLine`: switch문 → 템플릿 Record 방식으로 전환, default 폴백 추가

---

## Phase 6: 캐릭터 이미지 (별도 진행)

- 각 캐릭터당: 6 표정 JPG + nukki/ 6 PNG + sprites/
- `public/images/characters/{characterId}/` 구조
- 컨셉 확정 후 이미지 생성 스크립트로 진행
- 개발 중에는 placeholder 이미지 사용

---

## 수정 파일 요약

| 파일 | 변경 |
|---|---|
| `src/types/character.ts` | serviceType 제거, gender/Gender/GenderFilter 추가 |
| `src/data/characters/index.ts` | 8캐릭터 추가, gender 필드, 함수 변경 |
| `src/data/characters/waiting-lines.ts` | default 폴백 추가, 템플릿 전환 |
| `src/hooks/useGenderStore.ts` | **신규** — 성별 필터 Zustand 스토어 |
| `src/components/home/GenderFilter.tsx` | **신규** — 성별 필터 토글 UI |
| `src/components/home/CharacterGallery.tsx` | 필터 + 그리드 개편 + 링크 변경 |
| `src/app/character/[id]/page.tsx` | **신규** — 캐릭터 상세 + 서비스 선택 |
| `src/app/tarot/page.tsx` | 성별 필터 적용, 그리드 조정 |
| `src/app/saju/page.tsx` | 하드코딩 제거, 성별 필터 적용 |
| `src/services/tarot/tarot-service.ts` | getCharacterByService 제거 |
| `src/services/saju/saju-service.ts` | getCharacterByService 제거 |

---

## 구현 순서

1. Phase 1 (타입 + 데이터) — 모든 것의 기반
2. Phase 2 (성별 스토어) — 독립적
3. Phase 5 (대기 대사) — 독립적
4. Phase 4 (서비스 페이지) — Phase 1, 2 의존
5. Phase 3 (홈 갤러리 + 캐릭터 페이지) — Phase 1, 2 의존
6. Phase 6 (이미지) — 병렬 진행 가능

---

## 검증 방법

1. `pnpm tsc --noEmit` — serviceType 제거로 인한 타입 에러 모두 해결 확인
2. `pnpm lint` — 0 errors
3. `pnpm build` — 빌드 성공
4. 수동 테스트:
   - 홈 → 성별 필터 전환 → 캐릭터 목록 필터링 확인
   - 캐릭터 클릭 → `/character/{id}` → 서비스 선택 → 해당 서비스 페이지 진입
   - 타로/사주 페이지 → 캐릭터 선택에서 성별 필터 동작 확인
   - 세션 진행 → 대기 대사 정상 표시 확인
   - 브라우저 새로고침 → 성별 필터 설정 유지 확인

---

## 미결 사항 (향후 별도 진행)

- 캐릭터 이미지 생성 (Grok imagine-image-pro 모델로 생성 예정)
- 신점/오늘의 운세 서비스 페이지 구현 (현재 미존재, 캐릭터 랜딩 페이지에서 링크는 준비)
