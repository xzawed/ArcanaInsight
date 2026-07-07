---
name: skin-manager
description: 카드 스킨 추가/관리/이미지 생성을 수행한다. "스킨 추가", "카드 디자인 변경", "새 카드 스킨" 등의 요청에 사용한다.
---

# skin-manager 에이전트

ArcanaInsight의 카드 스킨 시스템을 관리한다.

> **저장소**: 카드 스킨 이미지는 **Cloudflare R2**(`cdn.xzawed.xyz/card-skins/…`)가 정본이다.
> (2026-07-07 Supabase Storage `card-skins` 버킷 → R2 무손실 이전. card-styles 선례와 동일 패턴.)
> `NEXT_PUBLIC_ASSET_BASE_URL`(R2 CDN) 미설정 시 Supabase Storage로 폴백하나, 운영은 R2를 사용한다.

## 참조 파일

- `src/data/skins/index.ts` — 스킨 정의 (6종)
- `src/hooks/useSkinStore.ts` — 스킨 선택 상태 (Zustand + persist)
- `src/components/skin/SkinSelector.tsx` — 스킨 선택 UI
- `src/components/card/CardFace.tsx` — skinId prop으로 이미지/SVG 분기
- `src/components/card/CardBack.tsx` — skinId prop으로 이미지/SVG 분기
- `src/lib/storage/index.ts` — 스킨 이미지 URL 빌더(정본). R2↔Supabase↔postgres 로컬 3-way 폴백
- `src/lib/supabase/storage.ts` — `CARD_SKINS_BUCKET` 상수만 보유
- `scripts/generate-skin-images.ts` — Grok 스킨 이미지 생성 스크립트 (output → `public/images/skins/`)
- `scripts/generate-assets/upload-skins-r2.ts` — Cloudflare R2 업로드 (`pnpm upload:skins:r2`, ETag=md5 검증)
- `scripts/download-skin-images.ts` — (레거시) Supabase Storage → 로컬 다운로드. Supabase 버킷 삭제 후 무효

## 현재 스킨 목록

| ID | 이름 | 설명 |
|----|------|------|
| gold-luxury | 골드 럭셔리 | 미드나잇 블루와 금박의 최고급 아르데코 |
| dark-gothic | 다크 고딕 | 핏빛 악센트의 어둡고 강렬한 중세 오컬트 |
| celestial-mystic | 셀레스티얼 미스틱 | 별자리와 달빛의 천상 세계 |
| pastel-dream | 파스텔 드림 | 수채화처럼 번지는 몽환적 라벤더 세계 |
| neon-cyberpunk | 네온 사이버펑크 | 홀로그램 회로와 네온의 미래적 디지털 오라클 |
| emerald-enchant | 에메랄드 인챈트 | 에메랄드 보석과 숲의 자연 마법 |

## 스킨 이미지 구조

Cloudflare R2 버킷의 `card-skins/` prefix (로컬 스테이징 `public/images/skins/`도 동일 구조):
```
card-skins/
└── {skinId}/
    ├── back.png            # 카드 뒷면
    └── front/
        ├── major-00.png    # 바보
        ├── major-01.png    # 마법사
        ├── ...             # 메이저 22장
        ├── wands-01.png    # 완드 에이스
        └── ...             # 마이너 56장 (앞면 78장)
    (스킨당 79장 = 앞면 78 + 뒷면 1)
```

URL은 `@/lib/storage`의 `getCardImageUrl(skinId, cardId)` / `getCardBackUrl(skinId)`로 조회한다
(R2 base = `${NEXT_PUBLIC_ASSET_BASE_URL}/card-skins`).

## 새 스킨 추가 절차

### 1. 수집할 정보
- `id` — 스킨 ID (영문 kebab-case)
- `name` — 영문 이름
- `nameKo` — 한국어 이름
- `description` — 설명 (1줄)
- `previewColor` — 미리보기 색상 (hex)
- `stylePrompt` — 이미지 생성 스타일 프롬프트

### 2. 수정 파일

**`src/data/skins/index.ts`**: skins 배열에 추가

### 3. 이미지 생성 전 백업 (필수)

**이미지 생성·교체 전 반드시 기존 이미지를 백업한다.** 스킨 이미지는 **R2**(`card-skins/{skinId}/…`)에 있으므로,
덮어쓰기 전 해당 스킨 객체를 R2에서 다운로드해 `scripts/backup-v2/{skinId}/`에 보관한다.

```bash
mkdir -p scripts/backup-v2/{skinId}
# R2(cdn.xzawed.xyz/card-skins/{skinId}/)에서 기존 이미지를 다운로드해 위 경로에 저장
```

백업 없이 덮어쓰면 재생성 비용 발생 (이미지 생성 API 과금). ⚠️ R2 immutable 캐시: 기존 키 덮어쓰기 시 Cloudflare 캐시 퍼지 필요.

### 4. 이미지 생성 + R2 업로드

```bash
# 79장 생성 (앞면 78장 + 뒷면 1장) → public/images/skins/{skinId}/
pnpm tsx scripts/generate-skin-images.ts --skin={skinId}

# Cloudflare R2에 업로드 (.env.r2.local 필요, ETag=md5 무결성 검증)
pnpm upload:skins:r2          # 전량 (또는 :skip 으로 기존 키 건너뜀)
```

### 5. 검증

- `pnpm tsc --noEmit` — 0 error
- R2 URL 200 확인: `curl -sI https://cdn.xzawed.xyz/card-skins/{skinId}/back.png`
- SkinSelector에 새 스킨이 표시되는지
- CardFace/CardBack에서 skinId 전달 시 이미지 로드되는지

### 완료 체크리스트

- [ ] **이미지 생성 전 backup-v2/ 백업 완료 (R2에서 다운로드)**
- [ ] `src/data/skins/index.ts` 스킨 배열 추가
- [ ] 이미지 79장 생성 완료 (`public/images/skins/{skinId}/`)
- [ ] `pnpm upload:skins:r2` R2 업로드 완료 (ETag=md5 통과)
- [ ] R2 URL 200 확인
- [ ] `pnpm tsc --noEmit` 통과
- [ ] SkinSelector UI 표시 확인
