# 데이터 모델 — 캐릭터·카드·스킨

ArcanaInsight의 정적 데이터(캐릭터, 카드, 스프레드, 스킨) 모델을 정의합니다.

---

## 1. 캐릭터 시스템

12명의 캐릭터, 각자 다른 성격과 말투로 모든 운세 서비스 제공 가능:

| ID | 이름 | 성별 | 말투 | 특기 |
|---|---|---|---|---|
| `arcana` | 아르카나 | 여 | ~네요/~해요, 신비로운 톤 | 직관적·감성 리딩 |
| `miko` | 미코 | 여 | ~입니다/~합니다, 엄숙한 톤 | 영적·깊이 있는 해석 |
| `seonhwa` | 선화 | 여 | ~세요/~랍니다, 우아한 톤 | 지혜로운 동양적 해석 |
| `hoshi` | 호시 | 여 | ~야/~지, 반말+밝은 톤(결과 텍스트엔 이모지 미사용) | 밝고 캐주얼 리딩 |
| `luna` | 루나 | 여 | ~요/~네요, 다정·신비로운 톤 | 포근한 힐링 리딩 |
| `rei` | 레이 | 여 | ~야/~지, 건조하고 핵심적인 톤 | 냉철한 분석 리딩 |
| `cairn` | 카이른 | 남 | ~습니다/~ㅂ니다, 격식 있는 톤 | 우아한 젠틀 리딩 |
| `zero` | 제로 | 남 | ~다/~지, 시적인 저음 톤 | 어둡고 로맨틱 리딩 |
| `haru` | 하루 | 남 | ~요/~세요, 친근하고 따뜻한 톤 | 응원하는 힐링 리딩 |
| `ren` | 렌 | 남 | ~오/~하오, 예스러운 말맛+쉬운 말 설명 | 고요한 선인 리딩 |
| `lix` | 릭스 | 남 | ~는데/~ㄹ까, 장난스러운 톤 | 위트 있는 트릭스터 리딩 |
| `ethan` | 에단 | 남 | ~요/~거든요, 상세하고 친절한 톤 | 학구적 분석 리딩 |

각 캐릭터는 6가지 표정(Mood): `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`

> `idle.png` 파일도 존재하며 `CharacterGallery` 컴포넌트에서 하드코딩으로 사용. `Mood` 타입에는 포함되지 않음.

### CharacterConfig 인터페이스 (`src/types/character.ts`)

```typescript
export interface CharacterConfig {
  id: CharacterId;          // 12종 CharacterId
  name: string;             // 한국어 이름
  nameJp: string;           // 일본어 이름
  gender: Gender;           // "female" | "male"
  greeting: string;         // 기본(한국어) 인사말
  greetingEn?: string;
  greetingJa?: string;
  expressions: Record<Mood, string>;  // mood → 이미지 경로
  idleAnimation: IdleAnimationType;   // "float" | "float-strong" | "bounce" | "breathe"
  personality: string;
  description: string;
  descriptionEn?: string;
  descriptionJa?: string;
  speciality: string;
  specialityEn?: string;
  specialityJa?: string;
  speechStyle: string;      // 말투 묘사
  voiceTone: string;        // 목소리 톤 묘사
  unlocked: boolean;
  effectTheme: EffectTheme; // 파티클·글로우 색상 테마
}

export interface EffectTheme {
  primary: string;                // hex 색상 — 주 글로우/파티클
  secondary: string;              // hex 색상 — 보조
  accent: string;                 // hex 색상 — 강조
  particleStyle: ParticleStyle;   // "sparkle" | "flame" | "petal" | "star" | "snowflake" | "lightning" | "bubble" | "rune"
}
```

---

## 2. 세션 중 캐릭터 표정 규칙

캐릭터는 부수적 요소이므로 표정 변경을 최소화하여 타로·사주 콘텐츠에 집중시킨다. **3단계만** 사용:

| 장면 | 표정 | 설명 |
|------|------|------|
| 세션 진입 + 카드 선택 대기 | `default` | 차분한 기본 표정 |
| 카드 선택 순간 + 리딩/분석 대기 | `mystical` | 신비로운 톤, 카드를 읽는 느낌 |
| 결과 도착 | `smile` | 따뜻한 미소로 결과 전달 |

- 에러 발생 시: `default`로 복귀
- 대기 대사 중: 표정 변경 없음 (`mystical` 유지)

---

## 3. 캐릭터 이미지 경로 규칙

`public/images/characters/[id]/`

| 구분 | 형식 | 경로 패턴 | 해당 캐릭터 |
|------|------|---------|------------|
| 운영용 enhanced nukki PNG | PNG RGB (2816×1536, 고DPI 의도적 2배 · 다운스케일 금지) | `[id]/nukki-enhanced/[mood].png` | 12명 전체 (표시 경로 유일) |

- 운영용 enhanced 이미지는 1408×768 색상 소스를 2배로 업스케일한 2816×1536 RGB PNG이다. 고DPI 대형 표시(캐릭터 상세 모바일 100vw)를 위한 의도적 2배이므로 다운스케일하지 않는다.
- 예: `/images/characters/arcana/nukki-enhanced/default.png`
- 예: `/images/characters/miko/nukki-enhanced/default.png`
- 소스·백업 폴더(`nukki/`, `nukki/backup-v2/`, `_backup/`)는 #447에서 리포지토리에서 제거되어 현재는 `nukki-enhanced/`만 존재한다(롤백용 사본은 git 히스토리·외부 백업).

---

## 4. 타로 카드 데이터

`src/data/cards/`

| 파일 | 내용 |
|------|------|
| `major-arcana.ts` | 메이저 아르카나 22장 (이름, 의미, 정/역방향 해석) |
| `minor-arcana.ts` | 마이너 아르카나 56장 (4 수트 × 14장) |
| `symbols.ts` | 카드 심볼 정의 |

카드 이미지: `public/images/cards/` — SVG 포맷
- `major/` — 00-fool ~ 21-world
- `cups/`, `wands/`, `swords/`, `pentacles/` — 마이너 아르카나 슈트별
- `card-back.svg` — 카드 뒷면

---

## 5. 스프레드 목록

`src/data/spreads/` — 10종 정의

| 이름 | 카드 수 |
|------|--------|
| 원카드 | 1장 |
| 쓰리카드 | 3장 |
| 5장 켈틱 | 5장 |
| 관계 스프레드 | 7장 |
| 말굽 | 7장 |
| 의사결정 | 5장 |
| 한 주 전망 | 7장 |
| 조디악 휠 | 12장 |
| 생명의 나무 | 10장 |
| 10장 켈틱 | 10장 |

---

## 6. 카드 비주얼 시스템

카드 비주얼은 두 가지 독립적인 시스템으로 구성된다.

### 6-1. 카드 아트 스타일 (CardStyles)

`src/data/cardStyles.ts` — AI 생성 카드 이미지의 아트 스타일 4종

| StyleId | 이름 | 설명 |
|---------|------|------|
| `dark-fantasy` | 다크 판타지 | 어둠의 마법과 고딕 판타지 |
| `art-nouveau` | 아르누보 | 자연의 곡선과 금빛 장식 |
| `anime-mystical` | 애니메 미스티컬 | 일본 애니메이션 스타일 |
| `modern-digital` | 모던 디지털 | 홀로그램과 디지털 아트 |

**테마 자동 매핑** (`THEME_TO_STYLE_MAP`):

| 테마 | 자동 스타일 |
|------|-----------|
| `midnight` | `dark-fantasy` |
| `dawn` | `art-nouveau` |
| `sunset` | `modern-digital` |
| `spring`, `summer` | `anime-mystical` |
| `autumn` | `dark-fantasy` |
| `winter` | `art-nouveau` |

**사용자 오버라이드 스토어** (`src/hooks/useCardStyleStore.ts`):
- `styleOverride: CardStyleId | null` — `null`이면 테마 자동 매핑 사용
- `useSkinMode: boolean` — `true`이면 카드가 아트 스타일 대신 팔레트 스킨(`useSkinStore.selectedSkinId`)을 렌더링
- `setStyleOverride(id)` — 오버라이드 설정 + `useSkinMode`를 `false`로 초기화
- `clearOverride()` — 오버라이드 해제(자동 매핑 복귀) + `useSkinMode`를 `false`로 초기화
- `enableSkinMode()` — 팔레트 스킨 모드로 전환
- `resolvedStyle(activeTheme)` — 최종 적용 스타일 ID 반환. 스킨 모드면 `null` 반환(consumer는 `?? undefined`로 변환해 `CardFace`/`CardBack`에 전달)
- `persist` key: `'arcana-card-style'` (localStorage)

**이미지 URL 헬퍼** (`src/lib/storage/card-style.ts`) — `storageBase()`가 `NEXT_PUBLIC_ASSET_BASE_URL`(설정 시 Cloudflare R2 `cdn.xzawed.xyz`) ↔ Supabase Storage(폴백)를 분기(DB_PROVIDER와 독립). `next.config.ts` remotePatterns가 자산 호스트를 env에서 동적 파생. **card-styles는 2026-07-03 R2로 무손실 이전, Supabase card-styles 버킷 삭제(0객체)** — 정본 [`../conventions/image-assets.md`](../conventions/image-assets.md) §5:
- `getCardStyleImageUrl(styleId, cardId)` — 카드 앞면 URL (`{base}/card-styles/cards/{styleId}/{suit}/{n}.png`)
- `getCardStyleBackUrl(styleId)` — 스타일별 카드 뒷면 URL (`card-back.webp`)
- `getServiceBackgroundUrl(service, theme)` — 서비스 배경 URL (`backgrounds/{service}/{theme}.png`)

**카드 스킨 URL 헬퍼** (`src/lib/storage/index.ts`) — `skinBase()`가 `NEXT_PUBLIC_ASSET_BASE_URL`(R2) → postgres 로컬(`/images/skins`) → Supabase(폴백) 3-way 분기. **card-skins(6종)는 2026-07-07 R2로 무손실 이전, Supabase card-skins 버킷 삭제(Supabase Storage 0)** — 업로드 정본 `pnpm upload:skins:r2`:
- `getCardImageUrl(skinId, cardId)` — 스킨 카드 앞면 URL (`{base}/card-skins/{skinId}/front/{cardId}.png`)
- `getCardBackUrl(skinId)` — 스킨별 카드 뒷면 URL (`back.png`)
- `getCardThumbnailUrl(skinId, cardId)` — 썸네일(원본 URL 반환, 변환 파라미터 없음)

---

### 6-2. 카드 팔레트 스킨 (Skins)

`src/data/skins/index.ts` — SVG 카드의 색상 팔레트 6종

| SkinId | 이름 |
|--------|------|
| `gold-luxury` | 골드 럭셔리 |
| `dark-gothic` | 다크 고딕 |
| `celestial-mystic` | 셀레스티얼 미스틱 |
| `pastel-dream` | 파스텔 드림 |
| `neon-cyberpunk` | 네온 사이버펑크 |
| `emerald-enchant` | 에메랄드 인챈트 |

이미지 경로 로직: `src/lib/storage/index.ts` — `getCardImageUrl()` / `getCardBackUrl()` (`skinBase()` 3-way)
- `NEXT_PUBLIC_ASSET_BASE_URL` 설정 시(운영): Cloudflare R2 — `{base}/card-skins/{skinId}/...`
- `postgres` 모드: `/images/skins/...` 정적 파일
- 그 외: Supabase Storage 폴백 (⚠️ card-skins 버킷은 2026-07-07 R2 이전으로 삭제됨 — 실질 미사용)

---

### 6-3. 설정 페이지 통합

`/settings` "카드 스킨" 섹션에서 두 시스템을 통합 표시한다.  
테마 자동 매핑 1개 + 아트 스타일 4개 + 팔레트 스킨 6개 = **총 11개** 버튼이 동일한 그리드에 표시됨.  
홈 페이지 `SkinGallery`는 테마 자동 매핑 없이 아트 스타일 4개 + 팔레트 스킨 6개 = **10개**를 표시한다.

---

## 7. 정적 데이터 파일 위치

| 데이터 | 파일 |
|--------|------|
| 캐릭터 메타데이터 | `src/data/characters/index.ts` |
| 대기 대사 | `src/data/characters/waiting-lines.ts` (ko/en/ja 분리) |
| 타로 토픽 | `src/data/topics.ts` |
| 스프레드 | `src/data/spreads/` |
| 사주 상수 (천간·지지·오행) | `src/data/saju/constants.ts` |
| 사주 카테고리 | `src/data/saju/categories.ts` |
| 카드 아트 스타일 | `src/data/cardStyles.ts` |
| 팔레트 스킨 | `src/data/skins/index.ts` |
| 홈 페이지 정적 데이터 | `src/data/home/` (faq.ts) |
| MBTI 16타입 상수 | `src/data/mbti.ts` |
| 토픽 메타 정보 | `src/data/topics-meta.ts` |
| 신점 문화적 해석 데이터 | `src/data/shinjeom/cultural-readings.ts` |

## 다국어 데이터

- 카드 데이터는 `name`, `nameKo`, `nameJa`를 함께 가진다. 리딩 의미문은 현재 한국어 중심이며 AI 응답 언어는 프롬프트 locale 지시로 제어한다.
- 캐릭터 데이터는 `greetingEn`, `greetingJa`, `descriptionEn`, `descriptionJa`, `specialityEn`, `specialityJa` 필드를 가진다.
- 대기 대사는 `waiting-lines.ts`, `waiting-lines-en.ts`, `waiting-lines-ja.ts`, `waiting-lines-i18n.ts`로 분리되어 locale별로 조회한다.
- UI 사전은 `src/i18n/translations/{ko,en,ja}/index.ts`에 있으며, 미번역 키는 ko fallback을 사용한다.

상세: [`i18n.md`](i18n.md)
