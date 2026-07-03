---
name: add-card-asset
description: 카드 아트 스타일·카드 뒷면·서비스 배경 이미지를 추가/수정하는 절차를 안내한다. "카드 이미지 추가", "카드 아트 수정", "카드 배경 교체", "새 카드 스타일", "서비스 배경 이미지" 등의 요청에 사용한다.
when_to_use: 카드 앞면/뒷면 아트, 타로·사주·신점 서비스 배경 이미지를 추가하거나 수정할 때. (카드 스킨=Supabase는 skin-manager, 캐릭터는 character-add로 별도)
allowed-tools: Read Grep Bash(pnpm type-check) Bash(pnpm generate:assets*) Bash(pnpm upload:assets:r2*)
---

# 카드 아트·배경 이미지 추가/수정 절차 (Cloudflare R2)

> **정본**: [`docs/conventions/image-assets.md §5`](../../../docs/conventions/image-assets.md) · [R2 이전 계획](../../../docs/superpowers/plans/2026-06-26-supabase-storage-r2-migration.md)

## 시스템 구조 (2026-07-03 R2 이전 후)

카드 아트 스타일·서비스 배경은 **Cloudflare R2**(`arcana-assets` 버킷, `card-styles/` prefix)에 저장되어 **`cdn.xzawed.xyz`** 로 서빙된다. Supabase Storage `card-styles`는 **비어 있음**(이전 완료).

| 자산 | R2 서빙 URL | 로컬 생성 경로 |
|------|------------|--------------|
| 카드 앞면 | `cdn.xzawed.xyz/card-styles/cards/{styleId}/{suit}/{n}.png` | `public/images/cards/{styleId}/{suit}/{n}.png` |
| 카드 뒷면 | `.../card-styles/cards/{styleId}/card-back.webp` | `public/images/cards/{styleId}/card-back.webp` |
| 서비스 배경 | `.../card-styles/backgrounds/{service}/{theme}.png` | `public/images/backgrounds/{service}/{theme}.png` |

- URL 빌더: [`src/lib/storage/card-style.ts`](../../../src/lib/storage/card-style.ts) `getCardStyleImageUrl` / `getCardStyleBackUrl` / `getServiceBackgroundUrl`. `storageBase()`가 `NEXT_PUBLIC_ASSET_BASE_URL`(R2) ↔ Supabase(폴백) 분기.
- 카드 `<Image>`는 `unoptimized`로 R2 직접 로드.

## ⚠️ 사전 조건

- 루트 `.env.r2.local`(gitignore)에 `R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET` 필요.
- **`pnpm upload:assets`(Supabase)는 이제 정본 아님** → 반드시 **`pnpm upload:assets:r2`** 사용. (PreToolUse 훅이 오사용 시 확인 요청)

## A. 이미지 추가

1. **생성** — 로컬 `public/images/cards` / `backgrounds`에 파일 생성.
   ```bash
   pnpm generate:assets           # Replicate API (REPLICATE_API_KEY 필요)
   # 또는 서비스 배경만: pnpm generate:service-bg
   ```
2. **새 아트 스타일**을 추가하는 경우(4종 외):
   - [`src/data/cardStyles.ts`](../../../src/data/cardStyles.ts): `CardStyleId`·스타일 목록·`THEME_TO_STYLE_MAP` 갱신.
   - `scripts/generate-assets/config.ts`: `STYLE_IDS` 갱신.
3. **R2 업로드 (etag=md5 무결성 검증 내장)**:
   ```bash
   pnpm upload:assets:r2           # 전량(upsert)
   pnpm upload:assets:r2:skip      # 기존 키 스킵
   ```
   → 출력의 "✅ 전 파일 ETag=md5 무결성 검증 통과" 확인.
4. **검증**: `cdn.xzawed.xyz/card-styles/...` GET 200 + 프로덕션(`arcanainsight-production.up.railway.app`) 육안.

## B. 이미지 수정 (기존 키 덮어쓰기) — 캐시 주의 ⚠️

1. 로컬 파일 교체 후 `pnpm upload:assets:r2`로 **같은 키에 덮어쓰기**.
2. **🚨 Cloudflare CDN 캐시 퍼지 필수** — R2 객체는 `Cache-Control: immutable`이라, 덮어써도 **CDN이 구버전을 최대 1년 서빙**한다.
   - Cloudflare 대시보드 → `xzawed.xyz` → **Caching → Configuration → Purge Cache** → 해당 URL(들) 개별 퍼지, 또는 전체 퍼지.
3. 퍼지 후 `cdn.xzawed.xyz/card-styles/...` 재요청으로 신버전 확인.
   - **대안(권장 아님)**: 키에 버전 접미사(`...-v2.png`)를 쓰고 데이터/코드의 참조를 갱신하면 캐시 문제 회피 가능하나, URL 빌더 규칙(`card-style.ts`)이 고정 경로라 실효성 낮음 → 퍼지가 표준.

## 검증 체크리스트

- [ ] 로컬 `public/images/cards`·`backgrounds`에 생성물 존재
- [ ] (새 스타일 시) `cardStyles.ts`·`config.ts` `STYLE_IDS` 갱신 + `pnpm type-check` 통과
- [ ] `pnpm upload:assets:r2` 실행 → **ETag=md5 전량 통과**
- [ ] (수정 시) **Cloudflare 캐시 퍼지 완료**
- [ ] `cdn.xzawed.xyz/card-styles/...` GET 200 + 프로덕션 육안 확인

## 복잡한 작업은 card-style-manager 에이전트 위임

새 아트 스타일 전체(79장×배경) 추가·대량 교체는:

```
card-style-manager 에이전트를 호출해서 처리해줘
```
