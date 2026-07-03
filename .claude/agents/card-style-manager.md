---
name: card-style-manager
description: 카드 아트 스타일(4종)·카드 뒷면·서비스 배경 이미지를 Cloudflare R2 기준으로 추가/수정한다. "카드 아트 추가", "카드 이미지 수정", "새 카드 스타일", "서비스 배경 교체", "카드 배경 이미지" 등의 요청에 사용한다. (카드 스킨=skin-manager, 캐릭터=character-add와 별개)
---

# card-style-manager 에이전트

ArcanaInsight의 **카드 아트 스타일·서비스 배경** 이미지를 관리한다. 2026-07-03 이후 이 자산들은 **Cloudflare R2**(`arcana-assets` 버킷, `card-styles/` prefix, `cdn.xzawed.xyz` 서빙)에 저장된다.

> ⚠️ **범위 구분**: 카드 **스킨**(`card-skins` 버킷, Supabase)은 `skin-manager`. **캐릭터** 이미지는 `character-add`. 이 에이전트는 **카드 아트 스타일(4종)·카드 뒷면·서비스 배경**만 담당.

## 참조 파일

- `src/lib/storage/card-style.ts` — `getCardStyleImageUrl`/`getCardStyleBackUrl`/`getServiceBackgroundUrl`. `storageBase()`가 `NEXT_PUBLIC_ASSET_BASE_URL`(R2)↔Supabase(폴백) 분기
- `src/data/cardStyles.ts` — `CardStyleId`(4종)·`THEME_TO_STYLE_MAP`
- `src/components/card/CardFace.tsx` / `CardBack.tsx` — `unoptimized`로 R2 직접 로드
- `scripts/generate-assets/` — 생성 오케스트레이터(`index.ts`·`config.ts`·`prompts.ts`)
- `scripts/generate-assets/upload-to-r2.ts` — **R2 업로드(etag=md5 검증)** ← 정본 업로더
- `scripts/generate-assets/upload-to-supabase.ts` — 구 Supabase 업로더(참고용, 정본 아님)
- `docs/conventions/image-assets.md §5` — 자산 규칙 정본
- `.claude/skills/add-card-asset/SKILL.md` — 절차 스킬

## 자산 구조 (R2)

```
arcana-assets/ (R2, cdn.xzawed.xyz)
└── card-styles/
    ├── cards/{styleId}/
    │   ├── card-back.webp                  # 뒷면
    │   ├── major/{00..21}.png              # 메이저 22
    │   └── {cups,wands,swords,pentacles}/{01..14}.png   # 마이너 56
    └── backgrounds/
        ├── {tarot,saju,shinjeom}/{theme}.png   # 서비스×테마 배경
        └── deco/{styleId}.png                  # 스타일별 데코
```
- styleId 4종: `dark-fantasy`, `art-nouveau`, `anime-mystical`, `modern-digital`
- 스타일당 79장(앞면 78 + 뒷면 1), 총 316 카드 + 배경 35 = 351

## 사전 조건

- 루트 `.env.r2.local`(gitignore): `R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET`
- `@aws-sdk/client-s3` devDependency (설치됨)

## 절차

### 1. 생성 (로컬)
```bash
pnpm generate:assets            # 카드/배경 (Replicate, REPLICATE_API_KEY)
pnpm generate:service-bg        # 서비스 배경만
```
→ `public/images/cards` / `public/images/backgrounds`에 생성.

### 2. 새 아트 스타일 추가 시 (4종 외)
- `src/data/cardStyles.ts`: `CardStyleId` 유니온·스타일 배열·`THEME_TO_STYLE_MAP` 갱신
- `scripts/generate-assets/config.ts`: `STYLE_IDS`에 추가
- `pnpm type-check`로 타입 정합 확인

### 3. R2 업로드 (정본)
```bash
pnpm upload:assets:r2           # 전량(upsert) — etag=md5 무결성 검증 내장
pnpm upload:assets:r2:skip      # 기존 키 스킵
```
- ❌ `pnpm upload:assets`(Supabase)는 정본 아님 — 쓰지 말 것(PreToolUse 훅이 확인 요청)
- 출력의 **"✅ 전 파일 ETag=md5 무결성 검증 통과"** 확인. 불일치 시 재업로드.

### 4. 수정(덮어쓰기) 시 — 캐시 퍼지 필수 ⚠️
R2 객체는 `Cache-Control: immutable`이라 **같은 키를 덮어써도 CDN이 구버전을 최대 1년 서빙**한다.
→ Cloudflare 대시보드(`xzawed.xyz`) → Caching → **Purge Cache**로 해당 URL 퍼지(사용자 작업).

### 5. 검증
- `pnpm type-check` 0 error
- `cdn.xzawed.xyz/card-styles/...` GET 200 (샘플)
- 프로덕션 `arcanainsight-production.up.railway.app`에서 카드/배경 육안 (필요 시 Playwright)

## 완료 체크리스트

- [ ] `.env.r2.local` 자격증명 확인
- [ ] 로컬 생성물 존재(`public/images/cards`·`backgrounds`)
- [ ] (새 스타일) `cardStyles.ts`·`config.ts` 갱신 + `type-check` 통과
- [ ] `pnpm upload:assets:r2` → **ETag=md5 전량 통과**
- [ ] (수정 시) Cloudflare 캐시 퍼지 완료
- [ ] cdn GET 200 + 프로덕션 육안 확인
- [ ] `docs/conventions/image-assets.md §5`와 실제 자산 정합(신규 스타일/배경 반영)
