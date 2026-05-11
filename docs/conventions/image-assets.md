# 이미지 에셋 규칙

> **결정자**: Claude (경로 규칙·포맷 기준 정의) | **준수 의무**: Codex (이미지 배치·생성·교체 작업)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)

`public/images/` 하위 모든 이미지 에셋의 형식·생성·배치 규칙입니다.

---

## 1. 이미지 형식 요약

| 유형 | 형식 | 위치 | 규격 |
|------|------|------|------|
| 캐릭터 원본 (12명) | PNG 누끼 (투명 배경) | `characters/[id]/nukki/[mood].png` | 원본별 상이 |
| 캐릭터 고해상도 색상 원본 (12명) | RGB 이미지 | `characters/[id]/nukki/backup-v2/[mood].png` | 1408×768 |
| 캐릭터 운영본 (12명) | PNG 누끼 (투명 배경) | `characters/[id]/nukki-enhanced/[mood].png` | 2816×1536 |
| 카드 | SVG | `cards/major/`, `cards/cups/` 등 | — |
| 배경 | JPG | `backgrounds/` | — |
| 아이콘 | PNG RGBA (투명 배경) | `images/icons/` | 콘텐츠 크롭 |
| 카드 스킨 | PNG/JPG | `images/skins/` (`pnpm download:skins` 실행 후 생성) | — |

---

## 2. 캐릭터 이미지 상세

**12캐릭터** (arcana, miko, seonhwa, hoshi, luna, rei, cairn, zero, haru, ren, lix, ethan):
- 원본 PNG 누끼: `nukki/` 폴더
- 운영 표시용 2배 보정본: `nukki-enhanced/` 폴더
- 예: `/images/characters/arcana/nukki-enhanced/default.png`
- 7가지 mood: `default`, `idle`, `smile`, `serious`, `surprised`, `wink`, `mystical`
- 루트 `nukki/` 이미지는 과거 원본 규격이 섞여 있으므로, 운영본 재생성 시 색상·디테일은 `nukki/backup-v2/`의 1408×768 파일을 기준 소스로 사용하고 투명 누끼 알파는 기존 운영본 또는 루트 `nukki/` 알파를 결합한다.
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

## 5. 카드 아트 스타일 이미지 (Supabase Storage)

AI 생성 타로 카드 이미지는 Supabase Storage `card-styles` 버킷에 저장된다.  
SVG 스킨 이미지(`images/skins/`)와 **별개**의 독립 시스템이다.

| 구분 | 경로 패턴 | 비고 |
|------|---------|------|
| 카드 앞면 | `{styleId}/{suit}/{number}.png` | 4종 스타일 × 카드 수 (`.png`) |
| 카드 뒷면 | `{styleId}/card-back.webp` | 스타일별 전용 뒷면 (`.webp`) |

- 이미지 URL은 `src/lib/storage/card-style.ts`의 `getCardStyleImageUrl()` / `getCardStyleBackUrl()`로 조회
- 생성: `pnpm generate:assets` (Replicate API, REPLICATE_API_KEY 필요)
- 업로드: `pnpm upload:assets` / `pnpm upload:assets:skip`

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

