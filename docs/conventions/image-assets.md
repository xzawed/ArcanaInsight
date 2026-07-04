# 이미지 에셋 규칙

> **결정자**: Claude (경로 규칙·포맷 기준 정의) | **준수 의무**: Codex (이미지 배치·생성·교체 작업)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)

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
- 예: `/images/characters/arcana/nukki-enhanced/default.png`
- 7가지 mood: `default`, `idle`, `smile`, `serious`, `surprised`, `wink`, `mystical`
- ⚠️ 소스·백업 폴더(`nukki/`, `nukki/backup-v2/`)는 용량 절감을 위해 리포지토리에서 제거(#447)되어 현재는 `nukki-enhanced/`만 존재한다. 운영본 재생성 시에만 외부 백업(1408×768 색상 소스)을 참조한다.
- 원본은 보존하고, UI에서는 `nukki-enhanced`를 우선 사용한다.
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

AI 생성 타로 카드 이미지·서비스 배경은 **Cloudflare R2**(`arcana-assets` 버킷, `card-styles/` prefix)에 저장되어 커스텀 도메인 `cdn.xzawed.xyz`로 서빙된다. SVG 스킨 이미지(`images/skins/`)와 **별개**의 독립 시스템이다.

> **이전 이력**: 2026-07-03 이전에는 Supabase Storage `card-styles` 버킷 사용. 무료티어(1GB) 초과(~2GB, 100% 카드아트) 해소를 위해 R2로 **무손실 이전**(351객체, 바이트·md5 일치 검증, Supabase 원본 삭제 → 224MB로 복귀). 정본: [`../superpowers/plans/2026-06-26-supabase-storage-r2-migration.md`](../superpowers/plans/2026-06-26-supabase-storage-r2-migration.md).

| 구분 | 서빙 URL 패턴 (`cdn.xzawed.xyz` 기준) | 비고 |
|------|---------|------|
| 카드 앞면 | `card-styles/cards/{styleId}/{suit}/{number}.png` | 4종 스타일 × 카드 수 (`.png`) |
| 카드 뒷면 | `card-styles/cards/{styleId}/card-back.webp` | 스타일별 전용 뒷면 (`.webp`) |
| 서비스 배경 | `card-styles/backgrounds/{service}/{theme}.png` | 타로/사주/신점 × 테마 |

- URL은 `src/lib/storage/card-style.ts`의 `getCardStyleImageUrl()` / `getCardStyleBackUrl()` / `getServiceBackgroundUrl()`로 조회. `storageBase()`가 `NEXT_PUBLIC_ASSET_BASE_URL`(설정 시 R2) ↔ Supabase(폴백)를 분기 → env 정본: [`../operations/env-variables.md`](../operations/env-variables.md).
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
| `scripts/generate-skin-images.ts` | 카드 스킨 이미지 생성 |
| `scripts/upload-skin-images.ts` | 생성된 스킨 → Supabase Storage 업로드 |
| `scripts/download-skin-images.ts` | Supabase Storage → `public/images/skins/` 다운로드 |
| `scripts/generate-card-images.ts` | 카드 이미지 생성 |
| `scripts/generate-backgrounds.ts` | 배경 이미지 생성 |
| `scripts/generate-icons.ts` | 아이콘 이미지 생성 (BFS 배경 제거 + 크롭) |
| `scripts/generate-placeholders.sh` | 플레이스홀더 이미지 생성 |

