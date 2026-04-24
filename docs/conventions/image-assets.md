# 이미지 에셋 규칙

`public/images/` 하위 모든 이미지 에셋의 형식·생성·배치 규칙입니다.

---

## 1. 이미지 형식 요약

| 유형 | 형식 | 위치 | 규격 |
|------|------|------|------|
| 캐릭터 (10명) | PNG 누끼 (투명 배경) | `characters/[id]/nukki/[mood].png` | 1408×768 |
| 캐릭터 레거시 파일 (2명) | JPG (파일만 잔존) | `characters/[id]/[mood].jpg` | 1408×768 |
| 카드 | SVG | `cards/major/`, `cards/cups/` 등 | — |
| 배경 | JPG | `backgrounds/` | — |
| 아이콘 | PNG RGBA (투명 배경) | `images/icons/` | 콘텐츠 크롭 |
| 카드 스킨 | PNG/JPG | `images/skins/` | — |

---

## 2. 캐릭터 이미지 상세

**10캐릭터** (arcana, hoshi, luna, rei, cairn, zero, haru, ren, lix, ethan):
- PNG 누끼, `nukki/` 폴더 경로
- 예: `/images/characters/arcana/nukki/default.png`
- 6가지 mood: `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`

**2캐릭터 레거시 파일** (miko, seonhwa):
- 코드 경로: `nukki/*.png` (10캐릭터와 동일하게 수정 완료)
- 예: `/images/characters/miko/nukki/default.png`
- 루트 `.jpg` 파일이 남아있으나 코드에서 참조하지 않음 (삭제 가능)

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

## 5. 이미지 생성 스크립트

| 스크립트 | 용도 |
|---------|------|
| `scripts/generate-character-images-v2.mjs` | 신규 캐릭터 이미지 생성 (Grok 이미지 API) |
| `scripts/generate-nukki-images.mjs` | 누끼(배경제거) 이미지 생성 |
| `scripts/regenerate-all-nukki.mjs` | 전체 캐릭터 누끼 재생성 |
| `scripts/generate-skin-images.ts` | 카드 스킨 이미지 생성 |
| `scripts/upload-skin-images.ts` | 생성된 스킨 → Supabase Storage 업로드 |
| `scripts/download-skin-images.ts` | Supabase Storage → `public/images/skins/` 다운로드 |
| `scripts/generate-card-images.ts` | 카드 이미지 생성 |
| `scripts/generate-backgrounds.ts` | 배경 이미지 생성 |
| `scripts/generate-icons.ts` | 아이콘 이미지 생성 (BFS 배경 제거 + 크롭) |
| `scripts/generate-placeholders.sh` | 플레이스홀더 이미지 생성 |

> `scripts/generate-character-images.mjs` — 구버전, v2로 대체됨 (삭제 예정)
