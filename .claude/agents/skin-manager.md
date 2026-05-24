---
name: skin-manager
description: 카드 스킨 추가/관리/이미지 생성을 수행한다. "스킨 추가", "카드 디자인 변경", "새 카드 스킨" 등의 요청에 사용한다.
---

# skin-manager 에이전트

ArcanaInsight의 카드 스킨 시스템을 관리한다.

## 참조 파일

- `src/data/skins/index.ts` — 스킨 정의 (6종)
- `src/hooks/useSkinStore.ts` — 스킨 선택 상태 (Zustand + persist)
- `src/components/skin/SkinSelector.tsx` — 스킨 선택 UI
- `src/components/card/CardFace.tsx` — skinId prop으로 이미지/SVG 분기
- `src/components/card/CardBack.tsx` — skinId prop으로 이미지/SVG 분기
- `src/lib/supabase/storage.ts` — Supabase Storage URL 생성
- `scripts/generate-skin-images.ts` — Grok Aurora 스킨 이미지 생성 스크립트
- `scripts/upload-skin-images.ts` — Supabase Storage 업로드 스크립트

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

Supabase Storage `card-skins` 버킷:
```
card-skins/
└── {skinId}/
    ├── back.webp           # 카드 뒷면
    ├── major-00.webp       # 바보
    ├── major-01.webp       # 마법사
    ├── ...                 # 메이저 22장
    ├── wands-01.webp       # 완드 에이스
    ├── ...                 # 마이너 56장
    └── (총 79장)
```

## 새 스킨 추가 절차

### 1. 수집할 정보
- `id` — 스킨 ID (영문 kebab-case)
- `name` — 영문 이름
- `nameKo` — 한국어 이름
- `description` — 설명 (1줄)
- `previewColor` — 미리보기 색상 (hex)
- `stylePrompt` — Grok 이미지 생성 API(`grok-imagine-image-pro` 모델) 스타일 프롬프트

### 2. 수정 파일

**`src/data/skins/index.ts`**: skins 배열에 추가

### 3. 이미지 생성 전 백업 (필수)

**이미지 생성·교체 전 반드시 기존 이미지를 backup-v2/에 백업한다.**

```bash
mkdir -p scripts/backup-v2/{skinId}
cp -r public/skins/{skinId}/* scripts/backup-v2/{skinId}/ 2>/dev/null || true
# Supabase Storage 이미지는 다운로드 후 백업
```

백업 없이 덮어쓰면 재생성 비용 발생 (Grok 이미지 API 과금).

### 4. 이미지 생성

```bash
# Grok 이미지 API(grok-2-image)로 79장 생성 (앞면 78장 + 뒷면 1장)
GROK_API_KEY=키 pnpm tsx scripts/generate-skin-images.ts --skin={skinId}

# Supabase Storage에 업로드
SUPABASE_SERVICE_ROLE_KEY=키 pnpm tsx scripts/upload-skin-images.ts --skin={skinId}
```

### 5. 검증

- `pnpm tsc --noEmit` — 0 error
- SkinSelector에 새 스킨이 표시되는지
- CardFace/CardBack에서 skinId 전달 시 이미지 로드되는지

### 완료 체크리스트

- [ ] **이미지 생성 전 backup-v2/ 백업 완료**
- [ ] `src/data/skins/index.ts` 스킨 배열 추가
- [ ] 이미지 79장 생성 완료
- [ ] Supabase Storage 업로드 완료
- [ ] `pnpm tsc --noEmit` 통과
- [ ] SkinSelector UI 표시 확인
