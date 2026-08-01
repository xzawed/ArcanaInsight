# 이미지 에셋 규칙

`public/images/` 하위 모든 이미지 에셋의 형식·생성·배치 규칙입니다.

---

## 1. 이미지 형식 요약

| 유형 | 형식 | 위치 | 규격 |
|------|------|------|------|
| 캐릭터 운영본 (12명, 표시 경로 유일) | PNG RGB | `characters/[id]/nukki-enhanced/[mood].png` | 2816×1536 (고DPI 의도적 2배 · 다운스케일 금지) |
| 카드 | SVG | `cards/major/`, `cards/cups/` 등 | — |
| 배경 | JPG | `backgrounds/` | — |
| 아이콘 | PNG RGBA (투명 배경) | `images/icons/` | 콘텐츠 크롭 |
| 카드 스킨 | PNG/JPG | `images/skins/` (`pnpm download:skins` 실행 후 생성) | — |

---

## 2. 캐릭터 이미지 상세

**12캐릭터** (arcana, miko, seonhwa, hoshi, luna, rei, cairn, zero, haru, ren, lix, ethan):
- 운영 표시용 이미지: `nukki-enhanced/` 폴더 (2816×1536). **이 2배(원본 1408×768의 2x) 규격은 고DPI 대형 디스플레이·캐릭터 상세(모바일 100vw) 대응을 위한 의도적 선택이며 다운스케일 금지.**
- 표정(`Mood`) **6종**: `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`
- 파일 stem은 표정과 1:1이 아니다 — 표정 `default`의 파일명은 **`idle`**이다(`MOOD_TO_FILE`).
  레거시 `default.png`(= `idle.png`와 바이트 동일)는 **R-4로 제거됐다**(2026-08-01, 로컬 72파일 + R2 동일 키). `CharacterImageFileStem` 타입에도 없으므로 이제 그 URL은 컴파일 단계에서 막힌다.
- 각 마스터는 **사전 생성 WebP 변형 5단**(320·640·960·1280·1920)을 반드시 동반한다.
  `characterImageLoader`에 폴백이 없어 변형이 빠지면 그 이미지는 즉시 404다. 검사: `pnpm check:image-budget`
- **서빙(2026-07-06~)**: 컴포넌트는 `src/lib/storage/character-image.ts`의 `getCharacterImageUrl(id, fileName)`으로 URL을 조회한다. `NEXT_PUBLIC_ASSET_BASE_URL`(cdn.xzawed.xyz) 설정 시 R2(`characters/[id]/nukki-enhanced/[mood].png`), 미설정 시 로컬 `/images/characters/...` 폴백. **배포 이미지는 `.dockerignore`로 `public/images/characters`(283MB)를 제외**하고 프로덕션은 R2로 서빙 → 배포 이미지 슬림화. 로컬/CI는 repo public 폴백. (⚠️ 프로덕션 `NEXT_PUBLIC_ASSET_BASE_URL` 필수)
- ⚠️ 소스·백업 폴더(`nukki/`, `nukki/backup-v2/`)는 용량 절감을 위해 리포지토리에서 제거(#447)되어 현재는 `nukki-enhanced/`만 존재한다. 운영본 재생성 시에만 외부 백업(1408×768 색상 소스)을 참조한다.
- 원본은 보존하고, UI에서는 `nukki-enhanced`를 우선 사용한다.
- **사전 생성 반응형 변형 (2026-08-01~, #521)**: 마스터와 나란히 `[mood]-{320,640,960,1280,1920}.webp`를 둔다(마스터당 5개 = 총 420개, 약 29MB). `characterImageLoader`가 `next/image` 커스텀 로더로 요청 폭을 가장 가까운 변형에 매핑하며, **로더가 반환한 URL은 Next가 그대로 쓰므로 서버 디코드가 일어나지 않는다.**
  - 활성 조건: `NEXT_PUBLIC_CHARACTER_VARIANTS=1`. **기본은 꺼짐** — 변형이 해당 환경에 없는데 켜면 이미지가 전량 404가 된다. 롤백은 이 env를 끄면 끝(마스터 경로는 그대로 살아 있다).
  - 생성: `pnpm generate:character-variants` → 업로드: `pnpm upload:characters:r2 --variants-only --skip-existing` (신규 키라 CDN 퍼지 불필요).
  - **왜 마스터를 줄이지 않았나**: 2816×1536은 고DPI 표시를 위한 의도적 선택이라 유지한다. 문제는 크기가 아니라 **런타임 디코드**였다 — 4.8MB 원본 12장이 이미지 최적화 큐를 포화시켜 32px 아이콘까지 굶었고, 홈 전이가 30초 넘게 커밋되지 않았다(CI trace 실측).
- Next.js 이미지 optimizer 출력은 WebP를 사용한다. 대형 투명 PNG를 AVIF로 즉석 변환하면 일부 모바일 Chromium 환경에서 첫 요청이 지연될 수 있다.

---

## 3. 아이콘 이미지 처리

`public/images/icons/` — PNG RGBA (투명 배경)

처리 방식:
1. BFS 플러드 필로 어두운 배경 제거
2. 콘텐츠 영역 크롭

새 아이콘 추가 시 동일하게 처리: `scripts/generate-icons.ts`

---

## 4. Next.js `<Image>` sizes prop 필수 ⚠️

`<Image fill>` 속성 사용 시 `sizes` prop 미설정 → 기본값 `100vw` → Mobile Android CI에서 이미지 로드 타임아웃 발생.

```tsx
// ❌ 금지
<Image fill src={src} alt={alt} />

// ✅ 올바른 패턴
<Image
  fill
  src={src}
  alt={alt}
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
/>
```

그리드 내 이미지, 캐릭터 이미지 등 `fill` 모드를 사용하는 모든 `<Image>`에 적용.

---

## 5. 카드 아트 스타일 이미지 (Cloudflare R2)

AI 생성 타로 카드 이미지·서비스 배경·**카드 스킨(6종)**·캐릭터 이미지는 모두 **Cloudflare R2**(`arcana-assets` 버킷)에 저장되어 커스텀 도메인 `cdn.xzawed.xyz`로 서빙된다. Supabase Storage는 더 이상 이미지 자산을 보유하지 않는다.

> **이전 이력**:
> - **card-styles**: 2026-07-03 Supabase Storage `card-styles` 버킷 → R2 **무손실 이전**(351객체, 바이트·md5 일치 검증, Supabase 원본 삭제 → 2GB→224MB). 정본: [`../superpowers/plans/archive/2026-06-26-supabase-storage-r2-migration.md`](../superpowers/plans/archive/2026-06-26-supabase-storage-r2-migration.md).
> - **card-skins**: 2026-07-07 Supabase Storage `card-skins` 버킷(6종·474객체·224MB, egress 소비) → R2 `card-skins/` prefix로 **무손실 이전**(ETag=md5 검증, Supabase 원본 삭제 → Supabase Storage 0). card-styles와 동일 패턴.

| 구분 | 서빙 URL 패턴 (`cdn.xzawed.xyz` 기준) | 비고 |
|------|---------|------|
| 카드 앞면 | `card-styles/cards/{styleId}/{suit}/{number}.png` | 4종 스타일 × 카드 수 (`.png`) |
| 카드 뒷면 | `card-styles/cards/{styleId}/card-back.webp` | 스타일별 전용 뒷면 (`.webp`) |
| 서비스 배경 | `card-styles/backgrounds/{service}/{theme}.png` | 타로/사주/신점 × 테마 |
| 카드 스킨 앞면 | `card-skins/{skinId}/front/{cardId}.png` | 6종 스킨 × 78장 (`.png`) |
| 카드 스킨 뒷면 | `card-skins/{skinId}/back.png` | 스킨별 전용 뒷면 (`.png`) |
| 캐릭터 이미지 | `characters/{id}/nukki-enhanced/{mood}.png` | 12명 × 필수 stem 6종 = **마스터 72장 + WebP 변형 360장** (2026-07-06 배포 슬림화로 R2 이전) |

- 캐릭터 URL은 `src/lib/storage/character-image.ts`의 `getCharacterImageUrl(id, fileName)`로 조회(`NEXT_PUBLIC_ASSET_BASE_URL` 설정 시 R2, 미설정 시 로컬 public 폴백). 업로드: `pnpm upload:characters:r2`(`:skip` 지원) — `public/images/characters` → R2(`characters/` 키), ETag=md5 검증.
- URL은 `src/lib/storage/card-style.ts`의 `getCardStyleImageUrl()` / `getCardStyleBackUrl()` / `getServiceBackgroundUrl()`로 조회. `storageBase()`가 `NEXT_PUBLIC_ASSET_BASE_URL`(설정 시 R2) ↔ Supabase(폴백)를 분기 → env 정본: [`../operations/env-variables.md`](../operations/env-variables.md).
- **카드 스킨** URL은 `src/lib/storage/index.ts`의 `getCardImageUrl(skinId, cardId)` / `getCardBackUrl(skinId)`로 조회. `skinBase()`가 `NEXT_PUBLIC_ASSET_BASE_URL`(R2) → postgres 로컬(`/images/skins`) → Supabase(폴백) 3-way 분기. 업로드(정본): `pnpm upload:skins:r2`(`:skip` 지원) — `public/images/skins` → R2(`card-skins/` 키, `Cache-Control: immutable`), ETag=md5 검증. 로컬 스테이징은 `pnpm download:skins`(Supabase 삭제 전) 또는 R2에서 받는다.
- 카드 `<Image>`는 `unoptimized`로 R2에서 직접 로드(옵티마이저 우회). `next.config.ts` `remotePatterns`가 자산 호스트를 env에서 자동 파생.
- 생성: `pnpm generate:assets` (Replicate API, REPLICATE_API_KEY 필요).
- **업로드(정본)**: `pnpm upload:assets:r2` — `public/images/cards`·`backgrounds` → R2(`card-styles/` 키, `Cache-Control: immutable`), 업로드 후 **ETag=md5 무결성 검증**. `.env.r2.local`에 R2 자격증명 필요. `:r2:skip`은 기존 키 스킵. (⚠️ 기존 `pnpm upload:assets`는 **Supabase 대상=정본 아님** — PreToolUse 훅이 오사용 시 확인 요청)
- ⚠️ **수정(덮어쓰기) 시**: R2 객체가 `immutable` 캐시라 같은 키를 덮어써도 CDN이 구버전을 최대 1년 서빙 → **Cloudflare 캐시 퍼지 필수**.
- 절차/에이전트: [`.claude/skills/add-card-asset/SKILL.md`](../../.claude/skills/add-card-asset/SKILL.md), `card-style-manager` 에이전트.

---

## 6. 이미지 생성 스크립트

| 스크립트 | 용도 |
|---------|------|
| `scripts/generate-character-images-v2.mjs` | 신규 캐릭터 이미지 생성 (Grok 이미지 API) |
| `scripts/generate-nukki-images.mjs` | 누끼(배경제거) 이미지 생성 |
| `scripts/regenerate-all-nukki.mjs` | 전체 캐릭터 누끼 재생성 |
| `scripts/generate-assets/` | 카드 아트 스타일 이미지 생성·업로드 오케스트레이터 |
| `scripts/generate-skin-images.ts` | 카드 스킨 이미지 생성 → `public/images/skins/` |
| `scripts/generate-assets/upload-skins-r2.ts` | 생성된 스킨 → **Cloudflare R2**(`card-skins/`) 업로드 (`pnpm upload:skins:r2`, ETag=md5) — **정본** |
| `scripts/upload-skin-images.ts` | ⚠️ (폐지) Supabase Storage 업로드 — card-skins R2 이전(2026-07-07)으로 대상 버킷 삭제됨 |
| `scripts/download-skin-images.ts` | (레거시) Supabase Storage → `public/images/skins/` 다운로드 — Supabase 버킷 삭제 후 무효 |
| `scripts/generate-card-images.ts` | 카드 이미지 생성 |
| `scripts/generate-backgrounds.ts` | 배경 이미지 생성 |
| `scripts/generate-icons.ts` | 아이콘 이미지 생성 (BFS 배경 제거 + 크롭) |
| `scripts/generate-placeholders.sh` | 플레이스홀더 이미지 생성 |

