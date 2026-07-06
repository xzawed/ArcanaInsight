---
name: character-add
description: 새 캐릭터 추가 시 필요한 데이터/이미지/대사를 일괄 생성한다. "캐릭터 추가", "새 상담사 만들어줘" 등의 요청에 사용한다.
---

# character-add 에이전트

ArcanaInsight에 새 캐릭터를 추가할 때 사용한다.
기존 12캐릭터 패턴을 정확히 따른다.

## 참조 파일

작업 전 반드시 읽는다:

- `src/data/characters/index.ts` — 캐릭터 정의 배열 (12명)
- `src/data/characters/waiting-lines.ts` — 대기 대사 (타로용 + 사주용)
- `src/types/character.ts` — CharacterConfig, Mood, Gender 타입
- `src/components/character/SpriteAnimator.tsx` — MOOD_TO_FILE 매핑 (이미지 파일명)
- `public/images/characters/arcana/` — 기존 이미지 구조 참고

## 수집할 정보

사용자에게 확인한다:
1. `id` — 캐릭터 ID (영문 소문자, 예: `yuri`)
2. `name` — 한글 이름 (예: `유리`)
3. `nameJp` — 일본어 이름 (예: `ユリ`)
4. `gender` — `"female"` 또는 `"male"`
5. `personality` — 성격 한 줄 (외모 포함)
6. `speechStyle` — 말투 규칙 (예: `"~요/~네요체. 다정한 톤."`)
7. `voiceTone` — 보이스 톤 ID (예: `"warm-gentle"`)
8. `greeting` — 첫 인사 대사
9. `description` — 상세 소개 (3~4문장)
10. `speciality` — 리딩 스타일 한 줄

## 생성/수정 파일

### 1. 캐릭터 데이터 추가
**파일**: `src/data/characters/index.ts`

`characters` 배열 끝에 새 객체 추가:
```typescript
{
  id: "{id}", name: "{name}", nameJp: "{nameJp}", gender: "{gender}",
  greeting: "{greeting}",
  expressions: {
    default: "/images/characters/{id}/nukki-enhanced/default.png",
    smile: "/images/characters/{id}/nukki-enhanced/smile.png",
    serious: "/images/characters/{id}/nukki-enhanced/serious.png",
    surprised: "/images/characters/{id}/nukki-enhanced/surprised.png",
    wink: "/images/characters/{id}/nukki-enhanced/wink.png",
    mystical: "/images/characters/{id}/nukki-enhanced/mystical.png",
  },
  idleAnimation: "float",
  personality: "{personality}",
  description: "{description}",
  speciality: "{speciality}",
  speechStyle: "{speechStyle}",
  voiceTone: "{voiceTone}", unlocked: true,
}
```

### 2. 대기 대사 추가
**파일**: `src/data/characters/waiting-lines.ts`

`waitingLines` 객체에 새 키 추가 (타로용 5개 대사):
```typescript
{id}: [
  { content: "대사1", mood: "serious" },
  { content: "대사2", mood: "mystical" },
  { content: "대사3", mood: "smile" },
  { content: "대사4", mood: "surprised" },
  { content: "대사5", mood: "smile" },
],
```

사주 서비스 캐릭터이면 `sajuWaitingLines`에도 추가.

### 3. 카드 미리보기 대사 추가
**파일**: `src/data/characters/waiting-lines.ts`

`buildCardPreviewLine` 함수 내 `cardPreviewTemplates` 객체에 새 캐릭터 ID 키 추가 (switch/case 구조가 아닌 Record 객체).

### 4. 이미지 생성 전 백업 (필수)

**이미지 생성·교체·수정 전 반드시 백업을 먼저 수행한다.**

```bash
# 기존 이미지가 있는 경우 backup-v2/에 백업
mkdir -p public/images/characters/{id}/backup-v2
cp -r public/images/characters/{id}/nukki-enhanced/* public/images/characters/{id}/backup-v2/ 2>/dev/null || true
```

백업 없이 이미지를 덮어쓰면 복구 불가 → 재생성 비용 발생.

### 5. 이미지 디렉토리 생성
```bash
mkdir -p public/images/characters/{id}/nukki-enhanced
```

필요한 파일 (7개 — 6개 고유 표정 + idle):
- `nukki-enhanced/default.png`
- `nukki-enhanced/smile.png`
- `nukki-enhanced/serious.png`
- `nukki-enhanced/surprised.png`
- `nukki-enhanced/wink.png`
- `nukki-enhanced/mystical.png`

> `idle.png`은 `SpriteAnimator`가 `default` 무드에 사용하는 파일명이다. `default.png`을 복사해 `idle.png`으로 저장한다.

**이미지 생성**: `scripts/generate-character-images-v2.mjs` 스크립트 사용.

```bash
# 특정 캐릭터 전체 표정 생성
node scripts/generate-character-images-v2.mjs {id}

# 특정 캐릭터 + 특정 표정만 생성
node scripts/generate-character-images-v2.mjs {id} smile
```

> **[필수] 이미지 사이즈 규격: 2816×1536** (고DPI 표시용 의도적 2x본 — **다운스케일 금지**)
> `nukki-enhanced` 이미지는 캐릭터 상세(모바일 100vw)·세션 등 큰 표시를 위해 2816×1536 2x본으로 유지한다.
> 생성 후 반드시 아래 명령으로 사이즈를 검증한다:
> ```bash
> python3 -c "
> from PIL import Image; import glob
> files = sorted(glob.glob('public/images/characters/{id}/nukki-enhanced/*.png'))
> bad = [(f, Image.open(f).size) for f in files if Image.open(f).size != (2816, 1536)]
> print('비표준 파일:', bad if bad else '없음 (모두 2816x1536)')
> "
> ```
> 비표준 사이즈가 있으면 해당 표정을 재생성한다. 사이즈가 맞지 않으면 이후 작업을 중단하고 수정한다.

### 6. R2 업로드 (필수 — 프로덕션 서빙)

프로덕션은 캐릭터 이미지를 **Cloudflare R2(`cdn.xzawed.xyz/characters`)**에서 서빙하고, `.dockerignore`가 `public/images/characters`를 배포 이미지에서 제외한다(배포 슬림화). 따라서 **로컬 생성만으로는 프로덕션에서 404**가 되므로 반드시 R2에 업로드한다.

```bash
pnpm upload:characters:r2        # 신규/변경분 R2 업로드 (md5 검증)
pnpm upload:characters:r2:skip   # 이미 존재하는 키 건너뛰고 업로드
```

`src/lib/storage/character-image.ts`의 `getCharacterImageUrl(id, mood)`가 `NEXT_PUBLIC_ASSET_BASE_URL` 설정 시 R2를, 미설정 시 로컬 `public`을 사용한다.

## 이미지 표시 규칙

캐릭터 이미지를 화면에 표시할 때 **항상** 아래 두 가지를 동시에 지킨다:

### 1. 사이즈 규격 — 2816×1536 (필수, 고DPI 2x본 · 다운스케일 금지)
생성 후 반드시 검증 (위 4단계 참조).

### 2. 테두리 투명도 — CSS mask 표준값 (필수)
모든 캐릭터 이미지 표시 컨테이너에 아래 mask 스타일을 적용한다. 수치 임의 변경 금지.

```tsx
// 표준 mask 스타일 — 수치를 절대 바꾸지 말 것
style={{
  WebkitMaskImage: [
    "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
    "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
    "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
    "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
  ].join(", "),
  WebkitMaskComposite: "destination-in, destination-in, destination-in",
  maskImage: [
    "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
    "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
    "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
    "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
  ].join(", "),
  maskComposite: "intersect, intersect, intersect",
}}
```

> `CharacterDisplay` 컴포넌트를 사용하면 자동으로 적용된다.
> 직접 `<Image>`나 커스텀 레이아웃을 쓸 경우에만 위 스타일을 래퍼 div에 명시한다.

## 검증

```bash
pnpm tsc --noEmit
pnpm lint
```

### SonarCloud exclusions 동기화 (신규 파일 추가 시)

새 `.ts` 파일이 추가된 경우 `sonar-project.properties`에 경로를 등록한다.  
캐릭터 데이터 파일(`src/data/characters/*.ts`)은 `sonar.coverage.exclusions`에 추가:

```properties
# sonar-project.properties
sonar.coverage.exclusions=\
  ...,\
  src/data/characters/{id}.ts
```

등록 누락 시 SonarCloud "new code coverage" 게이트 실패 (PR #219 패턴).

검증 항목:
- [ ] `characters` 배열에 추가됨
- [ ] `expressions` 경로가 실제 파일과 일치
- [ ] `waitingLines`에 대사 추가됨
- [ ] `buildCardPreviewLine`의 `cardPreviewTemplates`에 항목 추가됨
- [ ] nukki-enhanced 이미지 7개(default/idle/smile/serious/surprised/wink/mystical) 존재
- [ ] **모든 nukki-enhanced 이미지가 2816×1536 사이즈** (python3 사이즈 검증 명령으로 확인 · 고DPI 2x본, 다운스케일 금지)
- [ ] **`pnpm upload:characters:r2`로 R2 업로드 완료** (프로덕션은 `cdn.xzawed.xyz/characters` 서빙 — 미업로드 시 프로덕션 404)
- [ ] **캐릭터 이미지 표시 시 표준 mask 스타일 적용** (CharacterDisplay 사용 또는 직접 스타일 명시)
- [ ] SpriteAnimator의 MOOD_TO_FILE 매핑과 파일명 일치 (default→idle.png)
- [ ] **이미지 생성 전 백업 완료**
- [ ] **신규 .ts 파일 추가 시 sonar-project.properties exclusions 동기화 완료**
