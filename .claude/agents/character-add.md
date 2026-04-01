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
    default: "/images/characters/{id}/nukki/default.png",
    smile: "/images/characters/{id}/nukki/smile.png",
    serious: "/images/characters/{id}/nukki/serious.png",
    surprised: "/images/characters/{id}/nukki/surprised.png",
    wink: "/images/characters/{id}/nukki/wink.png",
    mystical: "/images/characters/{id}/nukki/mystical.png",
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

### 4. 이미지 디렉토리 생성
```bash
mkdir -p public/images/characters/{id}/nukki
```

필요한 파일 (6개 고유 이미지):
- `nukki/default.png`
- `nukki/smile.png`
- `nukki/serious.png`
- `nukki/surprised.png`
- `nukki/wink.png`
- `nukki/mystical.png`

> `idle.png`은 `default.png`과 동일한 이미지이므로, 필요 시 복사하거나 동일 파일을 사용한다.

**이미지 생성**: `scripts/generate-character-images-v2.mjs` 스크립트 사용 가능.

## 검증

```bash
pnpm tsc --noEmit
pnpm lint
```

검증 항목:
- [ ] `characters` 배열에 추가됨
- [ ] `expressions` 경로가 실제 파일과 일치
- [ ] `waitingLines`에 대사 추가됨
- [ ] `buildCardPreviewLine`의 `cardPreviewTemplates`에 항목 추가됨
- [ ] 누끼 이미지 6개(default/smile/serious/surprised/wink/mystical) 존재
- [ ] SpriteAnimator의 MOOD_TO_FILE 매핑과 파일명 일치
