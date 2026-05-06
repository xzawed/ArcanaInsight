> **Status**: 구현 완료 (방식 변경)
> **Note**: 작성 시점(2026-03-29) 기준 구현 계획. 실제 구현과 다른 주요 항목:
> - SpriteAnimator: 스프라이트 시트 방식 → **단일 누끼 이미지 + Framer Motion** 방식 채택
> - MOOD_TO_FILE 매핑: `wink→"happy"` → 실제 `wink→"wink"`, `smile→"smile"` (각자 고유 파일)
> - 대상 캐릭터: 4명 → **12명** (성별 필터 `GenderFilter` 컴포넌트 추가)
>
> **⚠️ 이 문서는 개발 히스토리 기록입니다.** 현재 구현 상태는 `CLAUDE.md`를 참조하세요.

# 캐릭터 선택 + JRPG 누끼 스타일 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로 첫 페이지에 4캐릭터 선택 기능을 추가하고, Grok AI로 투명 배경 누끼 이미지를 생성하여, 세션 페이지에서 JRPG 스타일 대형(40%) 캐릭터로 표시한다.

**Architecture:** useSessionStore에 characterId를 추가하여 선택 캐릭터를 세션 전체에서 추적. SpriteAnimator를 캐릭터ID 기반 동적 경로로 전환. 타로 첫 페이지를 2단계(캐릭터 선택 → 주제 선택)로 개편. API 라우트에 characterId를 전달하여 캐릭터별 프롬프트 분리.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Framer Motion 12, Zustand 5, Grok API (grok-imagine-image-pro)

---

## 파일 구조

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/components/character/CharacterCard.tsx` | 캐릭터 선택 카드 컴포넌트 |
| `scripts/generate-nukki-images.mjs` | 4캐릭터 × 6표정 누끼 이미지 생성 스크립트 |
| `public/images/characters/*/nukki/*.png` | 투명 배경 누끼 이미지 24장 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/hooks/useSession.ts` | characterId 상태 + setCharacterId() 추가 |
| `src/data/characters/index.ts` | unlocked: true + getAvailableCharacters() 추가 |
| `src/components/character/SpriteAnimator.tsx` | characterId 기반 동적 이미지 경로 |
| `src/components/character/CharacterDisplay.tsx` | 40% 대형 스타일 + characterId 스토어 참조 |
| `src/app/tarot/page.tsx` | 2단계 흐름 (캐릭터 선택 → 주제 선택) |
| `src/app/tarot/session/page.tsx` | characterId 기반 캐릭터 로드 + 40% 배치 |
| `src/services/tarot/tarot-service.ts` | getSystemPrompt에 characterId 파라미터 추가 |
| `src/app/api/tarot/reading/route.ts` | characterId 파라미터 수신 + 캐릭터별 프롬프트 |

---

## Task 1: useSessionStore에 characterId 추가

**Files:**
- Modify: `src/hooks/useSession.ts`

- [ ] **Step 1: SessionState 인터페이스에 characterId 추가**

`src/hooks/useSession.ts`의 `SessionState` 인터페이스에 `characterId`와 `setCharacterId`를 추가한다:

```ts
interface SessionState {
  phase: SessionPhase;
  sessionId: string | null;
  characterId: string | null;  // 추가
  topic: Topic | null;
  // ... 기존 필드 유지

  setCharacterId: (id: string) => void;  // 추가
  // ... 기존 메서드 유지
}
```

`initialState`에 `characterId: null` 추가, `create` 내부에 `setCharacterId: (id) => set({ characterId: id })` 추가. `reset`에서 `characterId: null`로 초기화.

- [ ] **Step 2: 빌드 확인**

Run: `export PATH="/c/Program Files/nodejs:/c/Users/dirtc/AppData/Roaming/npm:/c/Users/dirtc/AppData/Local/pnpm:$PATH" && pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/useSession.ts
git commit -m "feat: useSessionStore에 characterId 상태 추가"
```

---

## Task 2: 캐릭터 데이터 수정 — 전원 해제 + getAvailableCharacters

**Files:**
- Modify: `src/data/characters/index.ts`

- [ ] **Step 1: 4명 모두 unlocked: true + getAvailableCharacters 함수 추가**

`src/data/characters/index.ts`에서:

1. 미코, 선화, 호시의 `unlocked: false`를 `unlocked: true`로 변경 (3곳)
2. 파일 끝에 함수 추가:

```ts
export function getAvailableCharacters(): CharacterConfig[] {
  return characters.filter((c) => c.unlocked);
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/data/characters/index.ts
git commit -m "feat: 4캐릭터 전원 잠금 해제 + getAvailableCharacters 함수 추가"
```

---

## Task 3: SpriteAnimator — characterId 기반 동적 경로

**Files:**
- Modify: `src/components/character/SpriteAnimator.tsx`

- [ ] **Step 1: SpriteAnimator에 characterId prop 추가 및 동적 경로로 변경**

```tsx
"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mood } from "@/types/character";

interface MoodConfig {
  loop: boolean;
  displayDuration: number;
}

const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  default: { loop: true, displayDuration: 0 },
  smile: { loop: false, displayDuration: 2000 },
  serious: { loop: false, displayDuration: 2000 },
  surprised: { loop: false, displayDuration: 1500 },
  wink: { loop: false, displayDuration: 1500 },
  mystical: { loop: true, displayDuration: 0 },
};

const MOOD_TO_FILE: Record<Mood, string> = {
  default: "idle",
  smile: "happy",
  serious: "serious",
  surprised: "surprised",
  wink: "happy",
  mystical: "mystical",
};

const LOOP_MOTION: Record<string, Record<string, number[] | string[]>> = {
  default: {
    y: [0, -6, 0],
    scale: [1, 1.01, 1],
  },
  mystical: {
    y: [0, -10, 0],
    scale: [1, 1.02, 1],
    filter: [
      "drop-shadow(0 0 8px rgba(139,92,246,0.3))",
      "drop-shadow(0 0 20px rgba(139,92,246,0.6))",
      "drop-shadow(0 0 8px rgba(139,92,246,0.3))",
    ],
  },
};

const ENTER_MOTION: Record<string, Record<string, number[]>> = {
  smile: { scale: [0.95, 1.03, 1], y: [5, -3, 0] },
  serious: { scale: [1, 0.98, 1], y: [0, 2, 0] },
  surprised: { scale: [0.9, 1.05, 1], y: [10, -5, 0] },
  wink: { scale: [0.95, 1.02, 1], y: [3, -2, 0] },
};

interface SpriteAnimatorProps {
  characterId: string;
  mood: Mood;
  onAnimationEnd?: () => void;
  className?: string;
}

export function SpriteAnimator({ characterId, mood, onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const config = MOOD_CONFIGS[mood];
  const fileName = MOOD_TO_FILE[mood];
  const imageSrc = `/images/characters/${characterId}/nukki/${fileName}.png`;

  useEffect(() => {
    if (config.loop || !onAnimationEnd) return;
    const timer = setTimeout(() => { onAnimationEnd(); }, config.displayDuration);
    return () => clearTimeout(timer);
  }, [mood, config, onAnimationEnd]);

  const isLooping = config.loop;
  const loopAnim = LOOP_MOTION[mood] ?? LOOP_MOTION.default;
  const enterAnim = ENTER_MOTION[mood];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${characterId}-${mood}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={className}
      >
        {!isLooping && enterAnim ? (
          <motion.div animate={enterAnim} transition={{ duration: 0.5, ease: "easeOut" }}>
            <Image src={imageSrc} alt="character" width={512} height={768}
              className="w-full h-auto object-contain" priority />
          </motion.div>
        ) : (
          <motion.div
            animate={loopAnim}
            transition={{ duration: mood === "mystical" ? 4 : 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src={imageSrc} alt="character" width={512} height={768}
              className="w-full h-auto object-contain" priority />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: CharacterDisplay에서 `characterId` prop 누락 에러 발생 (Task 4에서 수정)

- [ ] **Step 3: 커밋**

```bash
git add src/components/character/SpriteAnimator.tsx
git commit -m "feat: SpriteAnimator — characterId 기반 동적 이미지 경로"
```

---

## Task 4: CharacterDisplay — 40% 대형 + characterId

**Files:**
- Modify: `src/components/character/CharacterDisplay.tsx`

- [ ] **Step 1: CharacterDisplay를 characterId 기반으로 수정**

```tsx
"use client";

import { useCallback } from "react";
import { CharacterConfig, Mood } from "@/types/character";
import { SpriteAnimator } from "./SpriteAnimator";
import { useCharacterStore } from "@/hooks/useCharacter";

interface CharacterDisplayProps {
  character: CharacterConfig;
  mood: Mood;
  size?: "normal" | "large";
  className?: string;
}

export function CharacterDisplay({ character, mood, size = "normal", className = "" }: CharacterDisplayProps) {
  const { setMood } = useCharacterStore();

  const handleAnimationEnd = useCallback(() => {
    if (mood !== "default" && mood !== "mystical") {
      setMood("default");
    }
  }, [mood, setMood]);

  const sizeClasses = size === "large"
    ? "max-w-[400px] max-h-[600px]"
    : "max-w-[280px] max-h-[420px]";

  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-radial from-arcana-purple/20 to-transparent rounded-full blur-3xl" />
      <div className={`relative z-10 ${sizeClasses} overflow-hidden`}>
        <SpriteAnimator
          characterId={character.id}
          mood={mood}
          onAnimationEnd={handleAnimationEnd}
          className="w-full h-full scale-100 origin-bottom"
        />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-center">
        <span className="text-arcana-purple font-serif font-bold text-sm drop-shadow-lg">
          {character.name}
        </span>
        <span className="text-arcana-muted text-xs ml-1">{character.nameJp}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/character/CharacterDisplay.tsx
git commit -m "feat: CharacterDisplay — size=large(40%) 지원 + characterId 전달"
```

---

## Task 5: CharacterCard 컴포넌트 — 캐릭터 선택 카드

**Files:**
- Create: `src/components/character/CharacterCard.tsx`

- [ ] **Step 1: CharacterCard 컴포넌트 작성**

```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CharacterConfig } from "@/types/character";

interface CharacterCardProps {
  character: CharacterConfig;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function CharacterCard({ character, isSelected, onClick, index }: CharacterCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
      whileHover={{ y: -8, scale: 1.03 }}
      onClick={onClick}
      className={`relative bg-arcana-card/80 backdrop-blur-sm border-2 rounded-2xl p-4 text-center transition-all overflow-hidden group ${
        isSelected
          ? "border-arcana-purple shadow-lg shadow-arcana-purple/30"
          : "border-arcana-border hover:border-arcana-purple/50"
      }`}
    >
      {/* 캐릭터 누끼 이미지 */}
      <div className="relative w-full aspect-[2/3] mb-3 overflow-hidden rounded-xl">
        <Image
          src={`/images/characters/${character.id}/nukki/idle.png`}
          alt={character.name}
          fill
          className="object-contain object-bottom"
        />
        {/* 하단 그라디언트 */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-arcana-card/90 to-transparent" />
      </div>

      {/* 캐릭터 정보 */}
      <h3 className="font-serif font-bold text-base group-hover:text-arcana-purple transition-colors">
        {character.name}
      </h3>
      <p className="text-arcana-muted text-xs mt-0.5">{character.nameJp}</p>
      <p className="text-arcana-muted text-xs mt-2 line-clamp-2 leading-relaxed">
        {character.personality}
      </p>

      {/* 선택 표시 글로우 */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: "inset 0 0 30px rgba(139,92,246,0.2)" }}
        />
      )}
    </motion.button>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/components/character/CharacterCard.tsx
git commit -m "feat: CharacterCard — 캐릭터 선택 카드 컴포넌트"
```

---

## Task 6: 타로 첫 페이지 — 2단계 흐름

**Files:**
- Modify: `src/app/tarot/page.tsx`

- [ ] **Step 1: page.tsx를 캐릭터 선택 + 주제 선택 2단계로 전면 교체**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Topic } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getAvailableCharacters, getCharacterById } from "@/data/characters";
import { getSpreadForTopic } from "@/data/spreads";
import { CharacterConfig } from "@/types/character";
import { ChatMessage } from "@/types/session";

const topics: { id: Topic; label: string; icon: string; desc: string }[] = [
  { id: "love", label: "연애/관계", icon: "💕", desc: "사랑과 인간관계에 대한 상담" },
  { id: "career", label: "직장/진로", icon: "💼", desc: "커리어와 진로에 대한 조언" },
  { id: "finance", label: "재정/금전", icon: "💰", desc: "돈과 재정 상황에 대한 통찰" },
  { id: "health", label: "건강", icon: "🌿", desc: "건강과 웰빙에 대한 가이드" },
  { id: "general", label: "일반 상담", icon: "✨", desc: "자유로운 주제의 종합 상담" },
];

type PageStep = "character-select" | "topic-select";

export default function TarotPage() {
  const router = useRouter();
  const { setTopic, setSpreadType, setPhase, setCharacterId } = useSessionStore();
  const availableCharacters = getAvailableCharacters();

  const [step, setStep] = useState<PageStep>("character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(null);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>([]);

  const handleCharacterSelect = (character: CharacterConfig) => {
    setSelectedCharacter(character);
    setCharacterId(character.id);
    setDialogueMessages([{
      id: crypto.randomUUID(),
      role: "character",
      content: character.greeting,
      mood: "smile",
      timestamp: new Date(),
    }]);
    setTimeout(() => setStep("topic-select"), 500);
  };

  const handleTopicSelect = (topic: Topic) => {
    const spread = getSpreadForTopic(topic);
    setTopic(topic);
    setSpreadType(spread.type, spread.positions.length);
    setPhase("card-shuffle");
    router.push("/tarot/session");
  };

  const handleBack = () => {
    setStep("character-select");
    setSelectedCharacter(null);
    setDialogueMessages([]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 배경 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/tarot-topic-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      <ParticleOverlay density="low" className="z-10" />

      <AnimatePresence mode="wait">
        {step === "character-select" ? (
          <motion.div
            key="character-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-4xl mx-auto px-4 py-8 relative z-20"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold mb-2 drop-shadow-md">상담사를 선택해주세요</h2>
              <p className="text-arcana-muted drop-shadow-sm">각 상담사마다 다른 스타일의 리딩을 제공합니다</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableCharacters.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isSelected={selectedCharacter?.id === character.id}
                  onClick={() => handleCharacterSelect(character)}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="topic-select"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-20 h-[calc(100vh-3.5rem)] flex flex-col"
          >
            {/* 상단: 캐릭터(좌) + 주제 선택(우) */}
            <div className="flex-1 flex items-end relative min-h-0">
              {/* 캐릭터 대형 */}
              {selectedCharacter && (
                <div className="w-[40%] max-w-[360px] flex-shrink-0">
                  <CharacterDisplay
                    character={selectedCharacter}
                    mood="smile"
                    size="large"
                    className="h-full"
                  />
                </div>
              )}

              {/* 주제 선택 */}
              <div className="flex-1 flex flex-col justify-center px-6 pb-8">
                <button
                  onClick={handleBack}
                  className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
                >
                  ← 다른 상담사 선택
                </button>
                <h3 className="font-serif font-bold text-lg mb-4 drop-shadow-md">어떤 이야기를 들려주실 건가요?</h3>
                <div className="grid grid-cols-1 gap-3">
                  {topics.map((topic, index) => (
                    <motion.button
                      key={topic.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      onClick={() => handleTopicSelect(topic.id)}
                      className="group bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-xl p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10 flex items-center gap-3"
                    >
                      <span className="text-xl">{topic.icon}</span>
                      <div>
                        <h4 className="font-serif font-bold text-sm group-hover:text-arcana-purple transition-colors">{topic.label}</h4>
                        <p className="text-arcana-muted text-xs mt-0.5">{topic.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* 하단 대화창 */}
            <div className="flex-shrink-0">
              <DialogueBox
                messages={dialogueMessages}
                characterName={selectedCharacter?.name}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/app/tarot/page.tsx
git commit -m "feat: 타로 첫 페이지 — 캐릭터 선택 + 주제 선택 2단계 흐름"
```

---

## Task 7: 세션 페이지 — characterId 기반 + 40% 대형 배치

**Files:**
- Modify: `src/app/tarot/session/page.tsx`

- [ ] **Step 1: 캐릭터 로드를 characterId 기반으로 변경**

`src/app/tarot/session/page.tsx`에서 다음 변경:

1. import 변경: `getCharacterByService` → `getCharacterById`

```ts
import { getCharacterById } from "@/data/characters";
```

2. 스토어에서 characterId 가져오기:

```ts
const {
  phase, topic, characterId, requiredCards, selectedCards, chatMessages, isLoading,
  setPhase, setSessionId, setAvailableCards,
  selectCard, addChatMessage, setReadingResult, setLoading,
} = useSessionStore();
```

3. 캐릭터 로드 변경:

```ts
const character = characterId ? getCharacterById(characterId) : null;
```

4. useEffect 시작 부분에 캐릭터 체크 추가:

```ts
useEffect(() => {
  if (!topic || !character) { router.push("/tarot"); return; }
  // ... 기존 코드
}, [topic]);
```

5. CharacterDisplay에 `size="large"` 추가, 컨테이너 너비를 40%로:

```tsx
<div className="absolute bottom-0 left-0 z-30 w-[40%] md:w-[35%] max-w-[400px]">
  <CharacterDisplay character={character} mood={currentMood} size="large" />
</div>
```

6. 카드 영역 마진 조정:

```tsx
<div className="flex-1 flex items-center justify-center ml-[38%] md:ml-[33%] pb-4">
```

7. API 호출 시 characterId 전달:

```ts
body: JSON.stringify({ sessionId, topic, characterId, cards: ... })
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/app/tarot/session/page.tsx
git commit -m "feat: 세션 페이지 — characterId 기반 로드 + 40% 대형 캐릭터 배치"
```

---

## Task 8: TarotService + API 라우트 — 캐릭터별 프롬프트

**Files:**
- Modify: `src/services/tarot/tarot-service.ts`
- Modify: `src/app/api/tarot/reading/route.ts`

- [ ] **Step 1: TarotService.getSystemPrompt에 characterId 파라미터 추가**

`src/services/tarot/tarot-service.ts` 수정:

```ts
import { getCharacterByService, getCharacterById } from "@/data/characters";

// getSystemPrompt를 characterId 옵션 지원으로 변경
getSystemPrompt(characterId?: string): string {
  const character = characterId
    ? getCharacterById(characterId) ?? this.getCharacter()
    : this.getCharacter();
  return buildSystemPrompt(character);
}
```

- [ ] **Step 2: API 라우트에서 characterId 수신**

`src/app/api/tarot/reading/route.ts` 수정:

request body에서 `characterId` 추가:

```ts
const { sessionId, topic, characterId, cards } = (await request.json()) as {
  sessionId: string; topic: Topic; characterId?: string;
  cards: { cardId: string; position: number; isReversed: boolean }[];
};
```

systemPrompt 생성 시 characterId 전달:

```ts
const systemPrompt = tarotService.getSystemPrompt(characterId);
```

- [ ] **Step 3: 빌드 확인**

Run: `pnpm tsc --noEmit`

- [ ] **Step 4: 커밋**

```bash
git add src/services/tarot/tarot-service.ts src/app/api/tarot/reading/route.ts
git commit -m "feat: TarotService + API — 캐릭터별 시스템 프롬프트 분리"
```

---

## Task 9: 누끼 이미지 생성 스크립트

**Files:**
- Create: `scripts/generate-nukki-images.mjs`

- [ ] **Step 1: 4캐릭터 × 6표정 누끼 이미지 생성 스크립트 작성**

```js
/**
 * Grok API로 4캐릭터 × 6표정 투명 배경 누끼 이미지 생성
 * 사용법: node scripts/generate-nukki-images.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const envContent = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
const apiKey = envContent.match(/GROK_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error("GROK_API_KEY not found"); process.exit(1); }

const CHARACTERS = [
  {
    id: "arcana",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
A mystical silver-haired anime girl with cat ears, purple eyes, long flowing silver hair.
She wears an elegant dark purple and black dress with gold magical rune accents.
She holds a glowing crystal ball. Standing pose, facing forward.`,
  },
  {
    id: "miko",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
A solemn yet compassionate shrine maiden (miko) with long black hair tied with a red ribbon.
She wears a traditional white hakama and red shrine maiden outfit with spiritual talismans.
She holds sacred ofuda paper charms. Standing pose, facing forward.`,
  },
  {
    id: "seonhwa",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
An elegant and wise celestial maiden with long dark brown hair adorned with flower ornaments.
She wears a Korean hanbok mixed with fantasy elements in soft pink and white colors.
She holds an ornate fan. Standing pose, facing forward.`,
  },
  {
    id: "hoshi",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
A bright and energetic star spirit girl with short pastel-colored hair (light blue and pink).
She wears a pastel-toned outfit with star motifs and constellation patterns.
Cheerful and lively expression. Standing pose, facing forward.`,
  },
];

const MOODS = [
  { file: "idle", desc: "calm, serene, neutral expression with gentle smile, hands at rest" },
  { file: "talking", desc: "friendly, mouth slightly open speaking, one hand gesturing" },
  { file: "happy", desc: "bright warm smile, eyes sparkling with joy, hands clasped happily" },
  { file: "serious", desc: "focused concentrated expression, slightly furrowed brows, hand on chin" },
  { file: "mystical", desc: "eyes closed peacefully, glowing purple aura, arms outstretched, magical energy" },
  { file: "surprised", desc: "wide eyes with surprise, mouth open in amazement, hand raised to mouth" },
];

async function generateImage(characterId, base, mood) {
  const prompt = `${base}\nExpression and pose: ${mood.desc}`;
  console.log(`  🎨 [${characterId}/${mood.file}] 생성 중...`);

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "grok-imagine-image-pro", prompt, n: 1 }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`  ❌ [${characterId}/${mood.file}] 실패 (${response.status}): ${err.slice(0, 100)}`);
    return false;
  }

  const data = await response.json();
  const img = data.data?.[0];
  const outDir = path.join(ROOT, `public/images/characters/${characterId}/nukki`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${mood.file}.png`);

  if (img?.b64_json) {
    fs.writeFileSync(outPath, Buffer.from(img.b64_json, "base64"));
  } else if (img?.url) {
    const ir = await fetch(img.url);
    fs.writeFileSync(outPath, Buffer.from(await ir.arrayBuffer()));
  } else {
    console.error(`  ❌ [${characterId}/${mood.file}] 알 수 없는 응답`);
    return false;
  }

  console.log(`  ✅ [${characterId}/${mood.file}] 저장 완료`);
  return true;
}

async function main() {
  console.log("=== 누끼 이미지 생성 시작 (4캐릭터 × 6표정 = 24장) ===\n");
  let success = 0, fail = 0;

  for (const char of CHARACTERS) {
    console.log(`\n📌 ${char.id} 캐릭터:`);
    for (const mood of MOODS) {
      try {
        const ok = await generateImage(char.id, char.base, mood);
        if (ok) success++; else fail++;
      } catch (e) {
        console.error(`  ❌ [${char.id}/${mood.file}] 예외:`, e.message);
        fail++;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  console.log(`\n=== 완료: ${success}개 성공, ${fail}개 실패 ===`);
}

main().catch(console.error);
```

- [ ] **Step 2: 커밋**

```bash
git add scripts/generate-nukki-images.mjs
git commit -m "feat: 4캐릭터 × 6표정 누끼 이미지 생성 스크립트"
```

---

## Task 10: 누끼 이미지 생성 실행

**Files:**
- Create: `public/images/characters/*/nukki/*.png` (24장)

- [ ] **Step 1: 스크립트 실행**

Run: `export PATH="/c/Program Files/nodejs:/c/Users/dirtc/AppData/Roaming/npm:/c/Users/dirtc/AppData/Local/pnpm:$PATH" && node scripts/generate-nukki-images.mjs`

실행 시간: 약 2~3분 (24장 × 2.5초 간격)

- [ ] **Step 2: 실패한 이미지 재시도**

실패한 이미지가 있으면 스크립트를 수정하여 실패분만 재시도. 503 에러는 3초 간격으로 재시도.

- [ ] **Step 3: 생성된 이미지 확인**

각 캐릭터 디렉토리에 6개 PNG가 존재하는지 확인:
```bash
ls public/images/characters/arcana/nukki/
ls public/images/characters/miko/nukki/
ls public/images/characters/seonhwa/nukki/
ls public/images/characters/hoshi/nukki/
```

- [ ] **Step 4: 커밋**

```bash
git add public/images/characters/*/nukki/
git commit -m "feat: Grok AI 생성 4캐릭터 × 6표정 누끼 이미지 24장"
```

---

## Task 11: 최종 통합 빌드 및 검증

**Files:** (전체)

- [ ] **Step 1: TypeScript 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 2: Lint 체크**

Run: `pnpm lint`
Expected: 기존 mypage any 에러만 (이번 작업 무관)

- [ ] **Step 3: 프로덕션 빌드**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 4: 시각적 확인 (pnpm dev)**

확인 항목:
1. `/tarot` 첫 화면에 4캐릭터 카드 표시
2. 캐릭터 카드에 누끼 이미지 표시
3. 캐릭터 선택 → 주제 선택 단계 전환
4. 주제 선택 화면에서 캐릭터 좌측 대형 표시
5. 세션 진입 → 캐릭터 40% 크기로 좌측 표시
6. 대화창에 선택한 캐릭터 이름 표시
7. AI 리딩이 선택한 캐릭터의 말투로 응답

- [ ] **Step 5: 수정사항 커밋 (필요 시)**

```bash
git add -A
git commit -m "fix: 통합 빌드 검증 후 수정사항"
```
