# 카드 스킨 시스템 설계

## 개요

타로카드 이미지를 Grok AI로 고품질 생성하고, 6가지 분위기별 스킨을 제공하여 사용자가 취향에 맞는 카드 디자인으로 타로 리딩을 받을 수 있게 하는 시스템.

## 스킨 정의

총 6가지 분위기별 스킨. 모두 무료 제공. 기본 스킨: `gold-luxury`.

| ID | 이름 | 색상 팔레트 | 분위기 |
|---|---|---|---|
| `gold-luxury` | Gold Luxury | 미드나잇 블루 + 금박 + 아르데코 | 고전적, 최고급, 라이더-웨이트 현대 재해석 |
| `dark-gothic` | Dark Gothic | 칠흑 + 핏빛 레드 + 은빛 | 어둡고 강렬한 중세 오컬트 |
| `celestial-mystic` | Celestial Mystic | 딥 네이비 + 별자리 + 달빛 실버 | 천체/점성술, 고요하고 깊은 우주적 |
| `pastel-dream` | Pastel Dream | 라벤더 + 로즈쿼츠 + 수채화 번짐 | 몽환적, 치유와 위로 |
| `neon-cyberpunk` | Neon Cyberpunk | 블랙 + 시안/마젠타 네온 + 회로 | 미래적 디지털 오라클 |
| `emerald-enchant` | Emerald Enchant | 딥 그린 + 에메랄드 + 식물/덩굴 | 자연과 마법, 숲의 신비 |

## 이미지 사양

### 생성

- **모델**: Grok `grok-2-image` (xAI 이미지 생성 API)
- **해상도**: 1024×1024 PNG
- **앞면**: 78장 × 6스킨 = 468장 (메이저 22장 + 마이너 56장, 각 카드별 고유 일러스트)
- **뒷면**: 1장 × 6스킨 = 6장 (스킨별 통일된 디자인)
- **총 이미지**: 474장

### 프롬프트 전략

각 스킨별로 스타일 프리픽스를 정의하고, 카드별 고유 심볼/장면 설명을 조합.

```
[스킨 스타일 프리픽스] + [카드별 장면/심볼 설명] + [공통 품질 지시어]
```

- **스타일 프리픽스**: 스킨의 색상, 분위기, 아트 스타일을 고정하는 프롬프트
- **카드별 설명**: 기존 `generate-card-images.ts`의 카드별 프롬프트 활용/확장
- **품질 지시어**: `"ultra-detailed, museum-quality, professional tarot card illustration, no text, no numbers, no letters"` 등

### 저장

- **Supabase Storage** 버킷: `card-skins`
- **경로 규칙**:
  - 앞면: `{skinId}/front/{cardId}.png` (예: `gold-luxury/front/major-00.png`)
  - 뒷면: `{skinId}/back.png` (예: `gold-luxury/back.png`)
- **접근**: Public 버킷, CDN URL로 클라이언트에서 직접 로드
- **썸네일**: Supabase 이미지 변환 API 활용 (`?width=200&height=320` 등)

## 스킨 선택 시스템

### 저장 방식

- **비로그인 사용자**: `localStorage`에 `selectedSkin` 키로 스킨 ID 저장
- **로그인 사용자**: `profiles` 테이블의 `selected_skin` 컬럼에 저장 + localStorage 동기화
- **기본값**: `gold-luxury`

### 선택 UI 위치

1. **홈 페이지 스킨 갤러리 섹션** (신규): 8개 홈 섹션 사이에 추가
   - 각 스킨의 샘플 카드 3~4장 미리보기 (대표 메이저 아르카나)
   - 스킨 이름 + 한줄 설명
   - 클릭 시 즉시 적용 + 시각적 피드백 (체크마크, 글로우 등)
2. **마이페이지 설정**: 로그인 사용자가 설정 변경 가능

## 데이터 구조

### 스킨 메타데이터 (`src/data/skins/index.ts`)

```typescript
interface CardSkin {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    background: string;
  };
  sampleCards: string[]; // 갤러리에 보여줄 샘플 카드 ID 목록
}
```

### Supabase URL 헬퍼

```typescript
function getCardImageUrl(skinId: string, cardId: string): string;
function getCardBackUrl(skinId: string): string;
```

Supabase Storage 공개 URL 패턴:
`{SUPABASE_URL}/storage/v1/object/public/card-skins/{skinId}/front/{cardId}.png`

### DB 스키마 변경

`profiles` 테이블에 `selected_skin` 컬럼 추가:

```sql
ALTER TABLE profiles ADD COLUMN selected_skin TEXT DEFAULT 'gold-luxury';
```

## 컴포넌트 변경

### 변경되는 기존 컴포넌트

| 컴포넌트 | 변경 내용 |
|---|---|
| `CardFace.tsx` | 프로시저럴 SVG 렌더링 → Supabase CDN 이미지 `<Image>` 로 교체. 스킨 context에서 현재 스킨 읽어 URL 조합. 이미지 로딩 실패 시 기존 SVG 폴백. |
| `CardBack.tsx` | 프로시저럴 SVG → 스킨별 뒷면 이미지로 교체. 동일한 폴백 로직. |
| `CardItem.tsx` | 스킨 store 연동하여 현재 스킨 ID를 CardFace/CardBack에 전달. |
| `page.tsx` (홈) | SkinGallery 섹션 추가 (DailyCard 섹션 앞 또는 뒤에 배치). |

### 신규 컴포넌트/파일

| 파일 | 용도 |
|---|---|
| `src/data/skins/index.ts` | 6개 스킨 메타데이터 정의 |
| `src/hooks/useSkinStore.ts` | Zustand 스토어. 스킨 선택/변경/persist (localStorage + DB 동기화) |
| `src/components/home/SkinGallery.tsx` | 홈 페이지 스킨 선택 갤러리 섹션 |
| `src/components/skin/SkinSelector.tsx` | 스킨 선택 카드 UI (갤러리/마이페이지 공용) |
| `src/lib/supabase/storage.ts` | Supabase Storage URL 헬퍼 함수 |
| `scripts/generate-skin-images.ts` | 6스킨 대응 이미지 생성 스크립트 (기존 스크립트 확장) |
| `scripts/upload-skin-images.ts` | 생성된 이미지를 Supabase Storage에 업로드하는 스크립트 |
| `supabase/migrations/007_skin_selection.sql` | profiles 테이블에 selected_skin 컬럼 추가 |

## 이미지 생성 스크립트

기존 `scripts/generate-card-images.ts`를 확장하여 `scripts/generate-skin-images.ts` 작성.

### 실행 방법

```bash
# 전체 생성 (6스킨 × 79장 = 474장)
GROK_API_KEY=xxx pnpm tsx scripts/generate-skin-images.ts

# 특정 스킨만
GROK_API_KEY=xxx pnpm tsx scripts/generate-skin-images.ts --skin=gold-luxury

# 특정 카드만
GROK_API_KEY=xxx pnpm tsx scripts/generate-skin-images.ts --skin=gold-luxury --card=major-00

# 뒷면만
GROK_API_KEY=xxx pnpm tsx scripts/generate-skin-images.ts --skin=gold-luxury --back-only
```

### 생성 후 업로드

```bash
# 로컬 생성 이미지를 Supabase Storage에 업로드
SUPABASE_SERVICE_ROLE_KEY=xxx pnpm tsx scripts/upload-skin-images.ts

# 특정 스킨만
SUPABASE_SERVICE_ROLE_KEY=xxx pnpm tsx scripts/upload-skin-images.ts --skin=gold-luxury
```

### Rate Limiting

- Grok API 호출 간 2초 딜레이 (기존 스크립트와 동일)
- 스킨당 79장 × 2초 = 약 160초(~3분). 전체 6스킨 = 약 18분
- 실패 시 개별 카드 재생성 가능 (`--card` 옵션)

## 렌더링 전략

### 이미지 로딩

- Next.js `<Image>` 컴포넌트 사용 (lazy loading, 자동 최적화)
- `sizes` prop으로 뷰포트별 적절한 사이즈 로드
- Supabase 이미지 변환으로 카드 크기에 맞는 리사이즈 제공

### 폴백

이미지 로딩 실패 시 기존 프로시저럴 SVG 렌더링으로 폴백:

```
Supabase CDN 이미지 → 로딩 실패 → 기존 SVG 렌더링
```

### 프리로딩

- 카드 선택 페이지 진입 시, 현재 스킨의 뒷면 이미지 프리로드
- 카드 선택(뒤집기) 시 해당 카드 앞면 이미지 로드

## 홈 페이지 SkinGallery 섹션

### 위치

홈 8개 섹션 중 DailyCard(4번) 뒤, StatsCounter(5번) 앞에 배치.

### 구성

- 섹션 타이틀: "나만의 카드 디자인을 선택하세요" (또는 유사 문구)
- 6개 스킨을 가로 스크롤 또는 그리드로 배치
- 각 스킨 카드:
  - 샘플 카드 3~4장 팬(fan) 형태로 겹쳐 미리보기
  - 스킨 이름 (한국어)
  - 한줄 분위기 설명
  - 현재 선택된 스킨 하이라이트 (글로우 + 체크마크)
- 클릭 시 즉시 적용, 토스트 알림 "Gold Luxury 스킨이 적용되었습니다"

### 레이아웃

- 데스크탑: 3열 그리드 (2행 × 3열)
- 모바일: 가로 스크롤 캐러셀

## 비기능 요구사항

- **성능**: 카드 이미지는 lazy loading. 초기 페이지 로드에 영향 없어야 함.
- **접근성**: 스킨 선택 시 키보드 네비게이션 지원. 이미지에 적절한 alt 텍스트.
- **오류 처리**: Supabase Storage 접근 불가 시 기존 SVG 폴백으로 서비스 중단 없음.
- **확장성**: 새 스킨 추가 = `data/skins/index.ts`에 메타데이터 추가 + 이미지 생성/업로드. 코드 변경 최소화.
