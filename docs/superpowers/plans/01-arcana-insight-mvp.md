> **Status**: 구현 완료 (일부 변경)
> **Note**: 작성 시점(2026-03-29) 기준 구현 계획. 실제 구현과 다른 주요 항목:
> - Next.js 버전: "14+" → 실제 **16.2**
> - 이미지 확장자: `.webp` → 초기 4캐릭터 **`.jpg`**, 신규 8캐릭터 **`nukki/*.png`**
> - 캐릭터 수: 4명 → **12명**; 캐릭터 잠금 상태 폐기 (전원 `unlocked: true`)
> - `CharacterConfig`의 `serviceType` 필드 없음 → `gender`, `speciality`로 대체
> - 미생성 파일: `CardSwiper.tsx`, `ChatWindow.tsx`, `session-manager.ts`, `services/tarot/prompts/`
> - Topic 타입: 5개 → **10개** (love-single/love-couple/fortune-3y/5y/full 추가)
>
> **⚠️ 이 문서는 개발 히스토리 기록입니다.** 현재 구현 상태는 `CLAUDE.md`를 참조하세요.

# ArcanaInsight MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tarot reading web app where users interact with an anime-style fortune teller character, select cards with animations, and receive AI-powered interpretations via Grok API.

**Architecture:** Next.js App Router fullstack app. Client components handle card animations (Framer Motion) and character display. API routes proxy Grok API calls with SSE streaming. Supabase provides auth (social login) and PostgreSQL storage for sessions/readings. All divination services implement a shared `DivinationService` interface for future extensibility.

**Tech Stack:** Next.js 14+ (App Router), TypeScript strict, Tailwind CSS, Framer Motion, Grok API (xAI), Supabase (Auth + DB), pnpm, Railway

---

## File Map

### Types (shared across all modules)
- `src/types/card.ts` — Card, CardSuit, MajorArcana, MinorArcana types
- `src/types/character.ts` — CharacterConfig, Mood, Expression types
- `src/types/session.ts` — Session, Topic, SpreadType, SessionStatus types
- `src/types/service.ts` — DivinationService interface, AIProvider interface, ReadingResult type

### Data (static, no DB dependency)
- `src/data/cards/major-arcana.ts` — 22 major arcana card definitions
- `src/data/cards/minor-arcana.ts` — 56 minor arcana card definitions
- `src/data/characters/index.ts` — All character configs (Arcana, Miko, Seonhwa, Hoshi)
- `src/data/spreads/index.ts` — Spread definitions and topic-to-spread mapping

### Services (core business logic)
- `src/services/core/ai-provider.ts` — AIProvider interface
- `src/services/core/grok-provider.ts` — Grok API implementation of AIProvider
- `src/services/core/prompt-builder.ts` — Prompt template assembly
- `src/services/core/session-manager.ts` — Session lifecycle management
- `src/services/tarot/tarot-service.ts` — DivinationService implementation for tarot
- `src/services/tarot/deck-manager.ts` — Deck shuffling, card selection logic
- `src/services/tarot/spread-resolver.ts` — Topic → spread type resolution
- `src/services/tarot/prompts/system.ts` — System prompt for tarot character
- `src/services/tarot/prompts/reading.ts` — Reading request prompt templates

### Supabase
- `src/lib/supabase/client.ts` — Browser Supabase client
- `src/lib/supabase/server.ts` — Server Supabase client
- `src/lib/supabase/middleware.ts` — Auth session refresh middleware
- `supabase/migrations/001_initial_schema.sql` — Database schema

### Components
- `src/components/character/CharacterDisplay.tsx` — Character image + expression switching
- `src/components/character/CharacterSelector.tsx` — Service selection with character previews
- `src/components/character/TypingDialogue.tsx` — Typewriter text effect synced to character
- `src/components/card/CardItem.tsx` — Single card with flip animation
- `src/components/card/CardDeck.tsx` — Deck shuffle + fan spread animation
- `src/components/card/CardSpread.tsx` — Spread layout (1/3/5 positions)
- `src/components/card/CardSwiper.tsx` — Mobile swipe card selector
- `src/components/chat/ChatBubble.tsx` — Single chat message bubble
- `src/components/chat/ChatWindow.tsx` — Scrollable chat container
- `src/components/layout/Header.tsx` — App header with nav
- `src/components/layout/Footer.tsx` — App footer
- `src/components/layout/MobileNav.tsx` — Mobile bottom navigation

### Hooks
- `src/hooks/useSession.ts` — Session state management (Zustand store)
- `src/hooks/useCardAnimation.ts` — Card animation sequencing logic
- `src/hooks/useCharacter.ts` — Character expression state management

### Pages
- `src/app/layout.tsx` — Root layout (dark theme, fonts, providers)
- `src/app/page.tsx` — Landing page
- `src/app/tarot/page.tsx` — Topic selection
- `src/app/tarot/session/page.tsx` — Main consultation session
- `src/app/tarot/result/[id]/page.tsx` — Reading result + share
- `src/app/auth/login/page.tsx` — Social login page
- `src/app/mypage/page.tsx` — User history + profile

### API Routes
- `src/app/api/tarot/session/route.ts` — POST: create session
- `src/app/api/tarot/reading/route.ts` — POST: generate reading (SSE stream)
- `src/app/api/tarot/result/[id]/route.ts` — GET: fetch result by share token

### Config
- `middleware.ts` — Next.js root middleware for Supabase auth refresh
- `.env.local.example` — Environment variable template
- `tailwind.config.ts` — Custom theme (dark, purple/indigo/gold palette)
- `next.config.ts` — Next.js config (images, etc.)

---

### Task 1: Project Initialization & Config

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local.example`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize Next.js project with pnpm**

```bash
cd /f/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Accept defaults. This creates the base Next.js project with TypeScript, Tailwind, ESLint, App Router, and src directory.

- [ ] **Step 2: Install core dependencies**

```bash
pnpm add framer-motion zustand @supabase/supabase-js @supabase/ssr
pnpm add -D @types/node
```

- [ ] **Step 3: Create environment variable template**

Create `.env.local.example`:

```env
# Grok API (xAI)
GROK_API_KEY=your_grok_api_key
GROK_MODEL=grok-3

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 4: Configure Tailwind with custom dark theme palette**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        arcana: {
          bg: "#0a0a1a",
          surface: "#12122a",
          card: "#1a1a3e",
          border: "#2a2a5e",
          purple: "#8b5cf6",
          indigo: "#6366f1",
          gold: "#f59e0b",
          silver: "#c0c0c0",
          text: "#e2e8f0",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "sans-serif"],
        display: ["var(--font-gothic-a1)", "sans-serif"],
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "blink": "blink 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(139, 92, 246, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.6)" },
        },
        blink: {
          "0%, 45%, 55%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(0.1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Set up root layout with dark theme and Korean fonts**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Noto_Sans_KR, Gothic_A1 } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const gothicA1 = Gothic_A1({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-gothic-a1",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArcanaInsight — 타로 & 운세 상담",
  description:
    "애니메이션 캐릭터와 함께하는 타로 리딩, 사주, 신점 종합 운세 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`dark ${notoSansKr.variable} ${gothicA1.variable}`}
    >
      <body className="bg-arcana-bg text-arcana-text font-sans min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Set up global CSS**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-arcana-bg text-arcana-text;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-arcana-bg;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-arcana-border rounded-full;
  }
}
```

- [ ] **Step 7: Create placeholder landing page**

Replace `src/app/page.tsx`:

```typescript
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-display font-bold text-arcana-purple mb-4">
        ArcanaInsight
      </h1>
      <p className="text-arcana-muted text-lg">
        타로 & 운세 상담 플랫폼
      </p>
    </main>
  );
}
```

- [ ] **Step 8: Verify the app builds and runs**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Next.js 프로젝트 초기화 — Tailwind 다크 테마, 한국어 폰트, 커스텀 컬러 팔레트"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/card.ts`, `src/types/character.ts`, `src/types/session.ts`, `src/types/service.ts`

- [ ] **Step 1: Create card types**

Create `src/types/card.ts`:

```typescript
export type CardSuit = "wands" | "cups" | "swords" | "pentacles";

export type MajorArcanaId =
  | "the-fool"
  | "the-magician"
  | "the-high-priestess"
  | "the-empress"
  | "the-emperor"
  | "the-hierophant"
  | "the-lovers"
  | "the-chariot"
  | "strength"
  | "the-hermit"
  | "wheel-of-fortune"
  | "justice"
  | "the-hanged-man"
  | "death"
  | "temperance"
  | "the-devil"
  | "the-tower"
  | "the-star"
  | "the-moon"
  | "the-sun"
  | "judgement"
  | "the-world";

export interface TarotCard {
  id: string;
  name: string;
  nameKo: string;
  number: number;
  type: "major" | "minor";
  suit?: CardSuit;
  imageUrl: string;
  upright: {
    keywords: string[];
    meaning: string;
  };
  reversed: {
    keywords: string[];
    meaning: string;
  };
}

export interface SelectedCard {
  card: TarotCard;
  position: number;
  isReversed: boolean;
  selectedAt: Date;
}
```

- [ ] **Step 2: Create character types**

Create `src/types/character.ts`:

```typescript
export type Mood = "default" | "smile" | "serious" | "surprised" | "wink" | "mystical";

export type ServiceType = "tarot" | "saju" | "shinjeom" | "fortune";

export interface CharacterConfig {
  id: string;
  name: string;
  nameJp: string;
  serviceType: ServiceType;
  greeting: string;
  expressions: Record<Mood, string>;
  idleAnimation: string;
  personality: string;
  speechStyle: string;
  voiceTone: string;
  unlocked: boolean;
}
```

- [ ] **Step 3: Create session types**

Create `src/types/session.ts`:

```typescript
import { SelectedCard } from "./card";

export type Topic = "love" | "finance" | "career" | "health" | "general";

export type SpreadType = "one-card" | "three-card" | "five-card";

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface SpreadPosition {
  index: number;
  label: string;
  labelKo: string;
  x: number;
  y: number;
}

export interface SpreadDefinition {
  type: SpreadType;
  name: string;
  nameKo: string;
  description: string;
  positions: SpreadPosition[];
}

export interface Session {
  id: string;
  userId: string | null;
  serviceType: string;
  topic: Topic;
  status: SessionStatus;
  spreadType: SpreadType;
  selectedCards: SelectedCard[];
  createdAt: Date;
  completedAt: Date | null;
}

export interface ChatMessage {
  id: string;
  role: "character" | "user" | "system";
  content: string;
  mood?: string;
  timestamp: Date;
}
```

- [ ] **Step 4: Create service types**

Create `src/types/service.ts`:

```typescript
import { CharacterConfig } from "./character";
import { Session, Topic, ChatMessage } from "./session";
import { SelectedCard } from "./card";

export interface ReadingResult {
  cardInterpretations: {
    cardId: string;
    position: number;
    interpretation: string;
  }[];
  overallReading: string;
  advice: string;
}

export interface SessionContext {
  session: Session;
  selectedCards: SelectedCard[];
  chatHistory: ChatMessage[];
  topic: Topic;
}

export interface AIProvider {
  generateReading(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string>;

  streamReading(
    systemPrompt: string,
    userPrompt: string,
  ): AsyncGenerator<string, void, unknown>;
}

export interface DivinationService {
  id: string;
  name: string;
  getCharacter(): CharacterConfig;
  startSession(topic: Topic): Omit<Session, "id" | "createdAt">;
  getSystemPrompt(): string;
  getReadingPrompt(context: SessionContext): string;
  parseResult(aiResponse: string): ReadingResult;
}
```

- [ ] **Step 5: Verify types compile**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/
git commit -m "feat: TypeScript 타입 정의 — Card, Character, Session, Service 인터페이스"
```

---

### Task 3: Static Data — Cards, Characters, Spreads

**Files:**
- Create: `src/data/cards/major-arcana.ts`, `src/data/cards/minor-arcana.ts`, `src/data/characters/index.ts`, `src/data/spreads/index.ts`

- [ ] **Step 1: Create major arcana data (22 cards)**

Create `src/data/cards/major-arcana.ts`:

```typescript
import { TarotCard } from "@/types/card";

export const majorArcana: TarotCard[] = [
  {
    id: "major-00",
    name: "The Fool",
    nameKo: "광대",
    number: 0,
    type: "major",
    imageUrl: "/images/cards/major/00-fool.webp",
    upright: {
      keywords: ["새로운 시작", "모험", "자유", "순수"],
      meaning: "새로운 여정의 시작을 의미합니다. 두려움 없이 앞으로 나아갈 때입니다.",
    },
    reversed: {
      keywords: ["무모함", "부주의", "위험", "경솔"],
      meaning: "충분한 준비 없이 성급하게 행동하고 있을 수 있습니다. 한 번 더 생각해보세요.",
    },
  },
  {
    id: "major-01",
    name: "The Magician",
    nameKo: "마법사",
    number: 1,
    type: "major",
    imageUrl: "/images/cards/major/01-magician.webp",
    upright: {
      keywords: ["의지력", "창조", "재능", "집중"],
      meaning: "당신에게는 원하는 것을 이룰 수 있는 모든 도구가 있습니다. 의지를 집중하세요.",
    },
    reversed: {
      keywords: ["조작", "속임수", "재능 낭비", "불안정"],
      meaning: "자신의 능력을 잘못된 방향으로 사용하고 있을 수 있습니다.",
    },
  },
  {
    id: "major-02",
    name: "The High Priestess",
    nameKo: "여사제",
    number: 2,
    type: "major",
    imageUrl: "/images/cards/major/02-high-priestess.webp",
    upright: {
      keywords: ["직감", "신비", "내면의 지혜", "잠재의식"],
      meaning: "내면의 목소리에 귀를 기울일 때입니다. 직감이 답을 알고 있습니다.",
    },
    reversed: {
      keywords: ["직감 무시", "비밀", "혼란", "표면적 판단"],
      meaning: "내면의 목소리를 무시하고 있습니다. 마음 깊은 곳의 진실을 마주하세요.",
    },
  },
  {
    id: "major-03",
    name: "The Empress",
    nameKo: "여황제",
    number: 3,
    type: "major",
    imageUrl: "/images/cards/major/03-empress.webp",
    upright: {
      keywords: ["풍요", "모성", "자연", "관능"],
      meaning: "풍요와 성장의 시기입니다. 창조적 에너지가 흘러넘칩니다.",
    },
    reversed: {
      keywords: ["의존", "공허", "창조적 막힘", "과잉보호"],
      meaning: "스스로를 돌보는 것에 소홀해지고 있습니다. 자기 자신에게도 사랑을 주세요.",
    },
  },
  {
    id: "major-04",
    name: "The Emperor",
    nameKo: "황제",
    number: 4,
    type: "major",
    imageUrl: "/images/cards/major/04-emperor.webp",
    upright: {
      keywords: ["권위", "구조", "리더십", "안정"],
      meaning: "체계와 질서를 세울 때입니다. 확고한 기반 위에서 리더십을 발휘하세요.",
    },
    reversed: {
      keywords: ["독재", "경직", "통제욕", "미성숙"],
      meaning: "지나친 통제가 오히려 상황을 악화시키고 있습니다. 유연함이 필요합니다.",
    },
  },
  {
    id: "major-05",
    name: "The Hierophant",
    nameKo: "교황",
    number: 5,
    type: "major",
    imageUrl: "/images/cards/major/05-hierophant.webp",
    upright: {
      keywords: ["전통", "가르침", "신앙", "규범"],
      meaning: "전통과 가르침에서 답을 찾을 수 있습니다. 멘토의 조언에 귀를 기울이세요.",
    },
    reversed: {
      keywords: ["반항", "비전통", "자유사고", "도전"],
      meaning: "기존의 틀에서 벗어나 자신만의 길을 찾을 때입니다.",
    },
  },
  {
    id: "major-06",
    name: "The Lovers",
    nameKo: "연인",
    number: 6,
    type: "major",
    imageUrl: "/images/cards/major/06-lovers.webp",
    upright: {
      keywords: ["사랑", "조화", "선택", "가치관"],
      meaning: "중요한 선택의 순간입니다. 마음이 이끄는 방향을 따르세요.",
    },
    reversed: {
      keywords: ["불화", "불균형", "잘못된 선택", "가치관 충돌"],
      meaning: "관계에서 불균형이 생기고 있습니다. 진정 원하는 것이 무엇인지 돌아보세요.",
    },
  },
  {
    id: "major-07",
    name: "The Chariot",
    nameKo: "전차",
    number: 7,
    type: "major",
    imageUrl: "/images/cards/major/07-chariot.webp",
    upright: {
      keywords: ["승리", "의지", "결단력", "전진"],
      meaning: "강한 의지로 목표를 향해 전진하세요. 승리가 눈앞에 있습니다.",
    },
    reversed: {
      keywords: ["방향 상실", "공격성", "통제 불능", "좌절"],
      meaning: "방향을 잃고 헤매고 있을 수 있습니다. 잠시 멈추고 목표를 재정비하세요.",
    },
  },
  {
    id: "major-08",
    name: "Strength",
    nameKo: "힘",
    number: 8,
    type: "major",
    imageUrl: "/images/cards/major/08-strength.webp",
    upright: {
      keywords: ["용기", "인내", "내면의 힘", "자비"],
      meaning: "진정한 힘은 내면에서 옵니다. 인내와 자비로 상황을 극복하세요.",
    },
    reversed: {
      keywords: ["자기 의심", "나약함", "불안", "포기"],
      meaning: "자신의 힘을 과소평가하고 있습니다. 당신은 생각보다 강합니다.",
    },
  },
  {
    id: "major-09",
    name: "The Hermit",
    nameKo: "은둔자",
    number: 9,
    type: "major",
    imageUrl: "/images/cards/major/09-hermit.webp",
    upright: {
      keywords: ["성찰", "고독", "지혜", "내면 탐구"],
      meaning: "혼자만의 시간이 필요합니다. 내면을 들여다보며 진정한 답을 찾으세요.",
    },
    reversed: {
      keywords: ["고립", "외로움", "은둔", "현실 도피"],
      meaning: "지나친 고립은 도움이 되지 않습니다. 다시 세상과 연결될 때입니다.",
    },
  },
  {
    id: "major-10",
    name: "Wheel of Fortune",
    nameKo: "운명의 수레바퀴",
    number: 10,
    type: "major",
    imageUrl: "/images/cards/major/10-wheel-of-fortune.webp",
    upright: {
      keywords: ["운명", "전환점", "행운", "순환"],
      meaning: "운명의 수레바퀴가 돌아갑니다. 큰 변화와 새로운 기회가 찾아옵니다.",
    },
    reversed: {
      keywords: ["악운", "저항", "변화 거부", "정체"],
      meaning: "변화에 저항하고 있습니다. 흐름을 받아들이면 상황이 나아질 것입니다.",
    },
  },
  {
    id: "major-11",
    name: "Justice",
    nameKo: "정의",
    number: 11,
    type: "major",
    imageUrl: "/images/cards/major/11-justice.webp",
    upright: {
      keywords: ["공정", "진실", "균형", "인과응보"],
      meaning: "공정한 결과가 찾아옵니다. 진실되게 행동하면 좋은 결과가 있을 것입니다.",
    },
    reversed: {
      keywords: ["불공정", "거짓", "회피", "편견"],
      meaning: "무언가를 회피하고 있지는 않나요? 진실을 마주할 용기가 필요합니다.",
    },
  },
  {
    id: "major-12",
    name: "The Hanged Man",
    nameKo: "매달린 사람",
    number: 12,
    type: "major",
    imageUrl: "/images/cards/major/12-hanged-man.webp",
    upright: {
      keywords: ["희생", "새로운 관점", "기다림", "깨달음"],
      meaning: "다른 각도에서 상황을 바라보세요. 때로는 기다림이 최선의 행동입니다.",
    },
    reversed: {
      keywords: ["지연", "저항", "불필요한 희생", "우유부단"],
      meaning: "무의미한 기다림에 시간을 낭비하고 있습니다. 행동할 때입니다.",
    },
  },
  {
    id: "major-13",
    name: "Death",
    nameKo: "죽음",
    number: 13,
    type: "major",
    imageUrl: "/images/cards/major/13-death.webp",
    upright: {
      keywords: ["변화", "끝과 시작", "변혁", "해방"],
      meaning: "하나의 장이 끝나고 새로운 장이 시작됩니다. 변화를 두려워하지 마세요.",
    },
    reversed: {
      keywords: ["변화 거부", "집착", "정체", "두려움"],
      meaning: "과거에 집착하고 있습니다. 놓아야 할 것을 놓아주세요.",
    },
  },
  {
    id: "major-14",
    name: "Temperance",
    nameKo: "절제",
    number: 14,
    type: "major",
    imageUrl: "/images/cards/major/14-temperance.webp",
    upright: {
      keywords: ["균형", "조화", "절제", "인내"],
      meaning: "균형과 절제가 필요한 시기입니다. 극단을 피하고 중용의 길을 걸으세요.",
    },
    reversed: {
      keywords: ["불균형", "과도함", "조급함", "충돌"],
      meaning: "삶의 균형이 무너지고 있습니다. 한 발 물러서서 조율이 필요합니다.",
    },
  },
  {
    id: "major-15",
    name: "The Devil",
    nameKo: "악마",
    number: 15,
    type: "major",
    imageUrl: "/images/cards/major/15-devil.webp",
    upright: {
      keywords: ["유혹", "속박", "집착", "물질주의"],
      meaning: "무언가에 속박되어 있지는 않나요? 진정한 자유를 위해 사슬을 끊으세요.",
    },
    reversed: {
      keywords: ["해방", "자각", "속박에서 벗어남", "회복"],
      meaning: "속박에서 벗어나고 있습니다. 자유를 향한 첫 걸음을 축하합니다.",
    },
  },
  {
    id: "major-16",
    name: "The Tower",
    nameKo: "탑",
    number: 16,
    type: "major",
    imageUrl: "/images/cards/major/16-tower.webp",
    upright: {
      keywords: ["붕괴", "충격", "급변", "각성"],
      meaning: "예상치 못한 변화가 찾아옵니다. 하지만 이것은 새로운 시작을 위한 것입니다.",
    },
    reversed: {
      keywords: ["변화 회피", "재난 모면", "지연된 붕괴", "내적 변화"],
      meaning: "피할 수 없는 변화를 미루고 있습니다. 조금씩 준비하는 것이 좋겠습니다.",
    },
  },
  {
    id: "major-17",
    name: "The Star",
    nameKo: "별",
    number: 17,
    type: "major",
    imageUrl: "/images/cards/major/17-star.webp",
    upright: {
      keywords: ["희망", "영감", "평화", "치유"],
      meaning: "어둠 뒤에 빛이 찾아옵니다. 희망을 잃지 마세요. 치유의 시간입니다.",
    },
    reversed: {
      keywords: ["절망", "희망 상실", "불신", "단절"],
      meaning: "희망을 잃어가고 있나요? 작은 빛도 어둠을 밝힐 수 있습니다.",
    },
  },
  {
    id: "major-18",
    name: "The Moon",
    nameKo: "달",
    number: 18,
    type: "major",
    imageUrl: "/images/cards/major/18-moon.webp",
    upright: {
      keywords: ["환상", "불안", "직감", "무의식"],
      meaning: "불확실한 상황 속에서 직감을 믿으세요. 모든 것이 보이는 대로가 아닙니다.",
    },
    reversed: {
      keywords: ["혼란 해소", "진실 드러남", "불안 극복", "명확함"],
      meaning: "안개가 걷히고 있습니다. 곧 진실이 밝혀질 것입니다.",
    },
  },
  {
    id: "major-19",
    name: "The Sun",
    nameKo: "태양",
    number: 19,
    type: "major",
    imageUrl: "/images/cards/major/19-sun.webp",
    upright: {
      keywords: ["기쁨", "성공", "활력", "긍정"],
      meaning: "밝은 에너지가 가득합니다. 성공과 기쁨이 찾아오는 시기입니다.",
    },
    reversed: {
      keywords: ["지연된 성공", "과도한 낙관", "번아웃", "실망"],
      meaning: "너무 낙관적이지는 않았나 점검해보세요. 현실적인 계획이 필요합니다.",
    },
  },
  {
    id: "major-20",
    name: "Judgement",
    nameKo: "심판",
    number: 20,
    type: "major",
    imageUrl: "/images/cards/major/20-judgement.webp",
    upright: {
      keywords: ["각성", "부활", "판단", "소명"],
      meaning: "내면의 부름에 응답할 때입니다. 과거를 돌아보고 새로운 자아로 거듭나세요.",
    },
    reversed: {
      keywords: ["자기 의심", "후회", "회피", "자기 비판"],
      meaning: "자기 자신에게 너무 가혹하지는 않나요? 자신을 용서하고 앞으로 나아가세요.",
    },
  },
  {
    id: "major-21",
    name: "The World",
    nameKo: "세계",
    number: 21,
    type: "major",
    imageUrl: "/images/cards/major/21-world.webp",
    upright: {
      keywords: ["완성", "성취", "통합", "여행"],
      meaning: "하나의 큰 순환이 완성됩니다. 당신의 노력이 결실을 맺는 시기입니다.",
    },
    reversed: {
      keywords: ["미완성", "지연", "목표 미달", "마무리 부족"],
      meaning: "아직 마무리되지 않은 것이 있습니다. 조금만 더 힘을 내세요.",
    },
  },
];
```

- [ ] **Step 2: Create minor arcana data (56 cards) — helper + all suits**

Create `src/data/cards/minor-arcana.ts`:

```typescript
import { TarotCard, CardSuit } from "@/types/card";

interface MinorCardDef {
  number: number;
  name: string;
  nameKo: string;
  uprightKeywords: string[];
  uprightMeaning: string;
  reversedKeywords: string[];
  reversedMeaning: string;
}

const suitNames: Record<CardSuit, { en: string; ko: string }> = {
  wands: { en: "Wands", ko: "완드" },
  cups: { en: "Cups", ko: "컵" },
  swords: { en: "Swords", ko: "검" },
  pentacles: { en: "Pentacles", ko: "펜타클" },
};

const courtCards: { number: number; name: string; nameKo: string }[] = [
  { number: 11, name: "Page", nameKo: "시종" },
  { number: 12, name: "Knight", nameKo: "기사" },
  { number: 13, name: "Queen", nameKo: "여왕" },
  { number: 14, name: "King", nameKo: "왕" },
];

function buildSuit(suit: CardSuit, cards: MinorCardDef[]): TarotCard[] {
  return cards.map((c) => ({
    id: `${suit}-${String(c.number).padStart(2, "0")}`,
    name: `${c.name} of ${suitNames[suit].en}`,
    nameKo: `${suitNames[suit].ko}의 ${c.nameKo}`,
    number: c.number,
    type: "minor" as const,
    suit,
    imageUrl: `/images/cards/${suit}/${String(c.number).padStart(2, "0")}.webp`,
    upright: { keywords: c.uprightKeywords, meaning: c.uprightMeaning },
    reversed: { keywords: c.reversedKeywords, meaning: c.reversedMeaning },
  }));
}

const wandsDefs: MinorCardDef[] = [
  { number: 1, name: "Ace", nameKo: "에이스", uprightKeywords: ["영감", "새로운 기회", "성장"], uprightMeaning: "새로운 열정과 영감이 찾아옵니다.", reversedKeywords: ["지연", "의욕 상실"], reversedMeaning: "새로운 시작에 대한 두려움이 있습니다." },
  { number: 2, name: "Two", nameKo: "2", uprightKeywords: ["계획", "결정", "미래 설계"], uprightMeaning: "큰 그림을 그리고 계획을 세울 때입니다.", reversedKeywords: ["우유부단", "두려움"], reversedMeaning: "결정을 미루고 있습니다." },
  { number: 3, name: "Three", nameKo: "3", uprightKeywords: ["확장", "탐험", "진보"], uprightMeaning: "시야를 넓히고 새로운 가능성을 탐색하세요.", reversedKeywords: ["방해", "지연", "실망"], reversedMeaning: "기대한 결과가 나오지 않아 실망하고 있습니다." },
  { number: 4, name: "Four", nameKo: "4", uprightKeywords: ["축하", "안정", "조화"], uprightMeaning: "안정과 조화의 시기입니다. 이루어낸 것을 축하하세요.", reversedKeywords: ["불안정", "갈등"], reversedMeaning: "겉으로는 평화로워 보이지만 내면에 불안이 있습니다." },
  { number: 5, name: "Five", nameKo: "5", uprightKeywords: ["갈등", "경쟁", "도전"], uprightMeaning: "경쟁과 도전의 시기입니다. 포기하지 마세요.", reversedKeywords: ["회피", "타협"], reversedMeaning: "갈등을 피하려 하고 있습니다." },
  { number: 6, name: "Six", nameKo: "6", uprightKeywords: ["승리", "인정", "자신감"], uprightMeaning: "노력의 결실을 인정받는 시기입니다.", reversedKeywords: ["자만", "실패"], reversedMeaning: "자만으로 인해 실수할 수 있습니다." },
  { number: 7, name: "Seven", nameKo: "7", uprightKeywords: ["방어", "인내", "결단"], uprightMeaning: "어려움 속에서도 자신의 입장을 지키세요.", reversedKeywords: ["압도", "포기"], reversedMeaning: "너무 많은 도전에 지쳐가고 있습니다." },
  { number: 8, name: "Eight", nameKo: "8", uprightKeywords: ["빠른 변화", "행동", "속도"], uprightMeaning: "일이 빠르게 진행됩니다. 기회를 놓치지 마세요.", reversedKeywords: ["지연", "혼란"], reversedMeaning: "일이 기대만큼 빠르게 진행되지 않습니다." },
  { number: 9, name: "Nine", nameKo: "9", uprightKeywords: ["인내", "회복력", "끈기"], uprightMeaning: "마지막까지 버텨야 합니다. 끝이 가까워지고 있습니다.", reversedKeywords: ["피로", "의심"], reversedMeaning: "지치고 의심이 들지만 포기하지 마세요." },
  { number: 10, name: "Ten", nameKo: "10", uprightKeywords: ["부담", "책임", "과로"], uprightMeaning: "너무 많은 짐을 지고 있습니다. 도움을 요청하세요.", reversedKeywords: ["해방", "위임"], reversedMeaning: "짐을 내려놓고 있습니다. 한결 가벼워질 것입니다." },
  { number: 11, name: "Page", nameKo: "시종", uprightKeywords: ["열정", "탐구", "새소식"], uprightMeaning: "새로운 열정과 영감을 가진 소식이 옵니다.", reversedKeywords: ["성급함", "미숙"], reversedMeaning: "아직 준비가 덜 되었습니다." },
  { number: 12, name: "Knight", nameKo: "기사", uprightKeywords: ["행동", "모험", "에너지"], uprightMeaning: "열정적으로 행동할 때입니다.", reversedKeywords: ["성급함", "무모"], reversedMeaning: "너무 급하게 행동하고 있습니다." },
  { number: 13, name: "Queen", nameKo: "여왕", uprightKeywords: ["자신감", "독립", "매력"], uprightMeaning: "자신감과 카리스마로 주변을 이끌어가세요.", reversedKeywords: ["질투", "불안"], reversedMeaning: "자신감이 흔들리고 있습니다." },
  { number: 14, name: "King", nameKo: "왕", uprightKeywords: ["리더십", "비전", "영감"], uprightMeaning: "큰 비전을 가지고 리더십을 발휘하세요.", reversedKeywords: ["독단", "강압"], reversedMeaning: "너무 독단적인 태도는 위험합니다." },
];

const cupsDefs: MinorCardDef[] = [
  { number: 1, name: "Ace", nameKo: "에이스", uprightKeywords: ["사랑", "감정", "직감"], uprightMeaning: "새로운 감정적 시작이 찾아옵니다.", reversedKeywords: ["감정 억압", "공허"], reversedMeaning: "감정을 억누르고 있습니다." },
  { number: 2, name: "Two", nameKo: "2", uprightKeywords: ["파트너십", "끌림", "조화"], uprightMeaning: "깊은 유대감과 파트너십이 형성됩니다.", reversedKeywords: ["불균형", "단절"], reversedMeaning: "관계에서 불균형이 느껴집니다." },
  { number: 3, name: "Three", nameKo: "3", uprightKeywords: ["축하", "우정", "커뮤니티"], uprightMeaning: "기쁨과 축하의 시간입니다.", reversedKeywords: ["과잉", "고립"], reversedMeaning: "즐거움에 취해 중요한 것을 놓치고 있습니다." },
  { number: 4, name: "Four", nameKo: "4", uprightKeywords: ["무관심", "불만족", "명상"], uprightMeaning: "현재에 만족하지 못하고 있습니다. 새로운 관점이 필요합니다.", reversedKeywords: ["깨달음", "동기부여"], reversedMeaning: "새로운 가능성을 발견하고 있습니다." },
  { number: 5, name: "Five", nameKo: "5", uprightKeywords: ["상실", "슬픔", "후회"], uprightMeaning: "상실의 아픔이 있지만, 남아있는 것에 집중하세요.", reversedKeywords: ["수용", "회복"], reversedMeaning: "슬픔을 극복하고 회복하고 있습니다." },
  { number: 6, name: "Six", nameKo: "6", uprightKeywords: ["향수", "추억", "순수"], uprightMeaning: "과거의 행복한 기억이 위안을 줍니다.", reversedKeywords: ["과거집착", "비현실적"], reversedMeaning: "과거에 너무 집착하고 있습니다." },
  { number: 7, name: "Seven", nameKo: "7", uprightKeywords: ["환상", "선택", "유혹"], uprightMeaning: "많은 선택지 앞에서 현실과 환상을 구분하세요.", reversedKeywords: ["명확함", "결단"], reversedMeaning: "환상에서 벗어나 현실을 직시하고 있습니다." },
  { number: 8, name: "Eight", nameKo: "8", uprightKeywords: ["떠남", "포기", "탐색"], uprightMeaning: "익숙한 것을 떠나 새로운 것을 찾을 때입니다.", reversedKeywords: ["방황", "두려움"], reversedMeaning: "떠나야 하지만 두려움에 머물고 있습니다." },
  { number: 9, name: "Nine", nameKo: "9", uprightKeywords: ["소원성취", "만족", "행복"], uprightMeaning: "소원이 이루어지는 시기입니다. 감사하는 마음을 가지세요.", reversedKeywords: ["불만", "탐욕"], reversedMeaning: "가진 것에 만족하지 못하고 있습니다." },
  { number: 10, name: "Ten", nameKo: "10", uprightKeywords: ["행복", "가족", "완성"], uprightMeaning: "감정적 충만함과 행복이 가득합니다.", reversedKeywords: ["불화", "깨진 꿈"], reversedMeaning: "이상과 현실 사이의 괴리가 있습니다." },
  { number: 11, name: "Page", nameKo: "시종", uprightKeywords: ["감수성", "직감", "새로운 감정"], uprightMeaning: "새로운 감정적 경험이 찾아옵니다.", reversedKeywords: ["미성숙", "감정적"], reversedMeaning: "감정에 휘둘리고 있습니다." },
  { number: 12, name: "Knight", nameKo: "기사", uprightKeywords: ["로맨스", "매력", "제안"], uprightMeaning: "로맨틱한 제안이나 감정적 기회가 옵니다.", reversedKeywords: ["변덕", "비현실적"], reversedMeaning: "감정에 너무 빠져 현실을 놓치고 있습니다." },
  { number: 13, name: "Queen", nameKo: "여왕", uprightKeywords: ["공감", "돌봄", "직감"], uprightMeaning: "따뜻한 마음으로 주변을 감싸세요.", reversedKeywords: ["감정 과잉", "의존"], reversedMeaning: "타인의 감정에 너무 동화되고 있습니다." },
  { number: 14, name: "King", nameKo: "왕", uprightKeywords: ["감정적 균형", "지혜", "관대"], uprightMeaning: "감정의 지혜로 균형을 이루고 있습니다.", reversedKeywords: ["감정 억압", "냉담"], reversedMeaning: "감정을 너무 억제하고 있습니다." },
];

const swordsDefs: MinorCardDef[] = [
  { number: 1, name: "Ace", nameKo: "에이스", uprightKeywords: ["진실", "명확함", "돌파구"], uprightMeaning: "명확한 통찰과 돌파구가 찾아옵니다.", reversedKeywords: ["혼란", "잘못된 판단"], reversedMeaning: "생각이 정리되지 않고 혼란스럽습니다." },
  { number: 2, name: "Two", nameKo: "2", uprightKeywords: ["선택", "균형", "교착"], uprightMeaning: "두 가지 사이에서 균형을 잡아야 합니다.", reversedKeywords: ["정보과잉", "우유부단"], reversedMeaning: "너무 많은 생각이 결정을 방해합니다." },
  { number: 3, name: "Three", nameKo: "3", uprightKeywords: ["슬픔", "이별", "상처"], uprightMeaning: "마음의 고통이 있습니다. 치유의 시간이 필요합니다.", reversedKeywords: ["회복", "용서"], reversedMeaning: "아픔에서 회복되고 있습니다." },
  { number: 4, name: "Four", nameKo: "4", uprightKeywords: ["휴식", "회복", "고요"], uprightMeaning: "잠시 쉬어가세요. 회복의 시간이 필요합니다.", reversedKeywords: ["불안", "소진"], reversedMeaning: "충분한 휴식을 취하지 못하고 있습니다." },
  { number: 5, name: "Five", nameKo: "5", uprightKeywords: ["갈등", "패배", "비열함"], uprightMeaning: "갈등 속에서 진정으로 원하는 것이 무엇인지 생각하세요.", reversedKeywords: ["화해", "과거 청산"], reversedMeaning: "갈등을 해결하고 앞으로 나아가고 있습니다." },
  { number: 6, name: "Six", nameKo: "6", uprightKeywords: ["이동", "전환", "회복"], uprightMeaning: "어려운 시기를 지나 더 나은 곳으로 향하고 있습니다.", reversedKeywords: ["정체", "미해결"], reversedMeaning: "아직 떠날 준비가 되지 않았습니다." },
  { number: 7, name: "Seven", nameKo: "7", uprightKeywords: ["전략", "기만", "계획"], uprightMeaning: "신중한 전략이 필요합니다.", reversedKeywords: ["양심", "자백"], reversedMeaning: "정직하게 행동하는 것이 최선입니다." },
  { number: 8, name: "Eight", nameKo: "8", uprightKeywords: ["속박", "제한", "무력감"], uprightMeaning: "스스로 만든 속박에서 벗어나야 합니다.", reversedKeywords: ["해방", "자유"], reversedMeaning: "제한에서 벗어나고 있습니다." },
  { number: 9, name: "Nine", nameKo: "9", uprightKeywords: ["불안", "걱정", "악몽"], uprightMeaning: "걱정이 당신을 잠식하고 있습니다. 두려움을 직면하세요.", reversedKeywords: ["희망", "회복"], reversedMeaning: "불안에서 벗어나 희망을 되찾고 있습니다." },
  { number: 10, name: "Ten", nameKo: "10", uprightKeywords: ["끝", "파멸", "바닥"], uprightMeaning: "가장 어려운 순간이지만, 이것이 바닥입니다. 이제 올라갈 일만 남았습니다.", reversedKeywords: ["회복", "재기"], reversedMeaning: "최악의 순간은 지났습니다." },
  { number: 11, name: "Page", nameKo: "시종", uprightKeywords: ["호기심", "새로운 아이디어", "진실 추구"], uprightMeaning: "진실을 향한 호기심이 새로운 발견으로 이끕니다.", reversedKeywords: ["냉소", "험담"], reversedMeaning: "말로 상처를 주고 있습니다." },
  { number: 12, name: "Knight", nameKo: "기사", uprightKeywords: ["야망", "행동력", "직진"], uprightMeaning: "목표를 향해 빠르게 돌진하세요.", reversedKeywords: ["성급함", "무모"], reversedMeaning: "너무 급하게 행동하면 실수합니다." },
  { number: 13, name: "Queen", nameKo: "여왕", uprightKeywords: ["지성", "독립", "냉철함"], uprightMeaning: "감정보다 이성으로 판단하세요.", reversedKeywords: ["냉담", "고립"], reversedMeaning: "너무 냉철한 태도가 관계를 멀어지게 합니다." },
  { number: 14, name: "King", nameKo: "왕", uprightKeywords: ["권위", "진실", "논리"], uprightMeaning: "명확한 논리와 진실로 리더십을 발휘하세요.", reversedKeywords: ["독재", "조작"], reversedMeaning: "권력을 남용하지 않도록 주의하세요." },
];

const pentaclesDefs: MinorCardDef[] = [
  { number: 1, name: "Ace", nameKo: "에이스", uprightKeywords: ["기회", "번영", "새로운 시작"], uprightMeaning: "물질적 풍요와 새로운 기회가 찾아옵니다.", reversedKeywords: ["기회 상실", "불안정"], reversedMeaning: "기회를 놓치고 있거나 재정이 불안정합니다." },
  { number: 2, name: "Two", nameKo: "2", uprightKeywords: ["균형", "적응", "멀티태스킹"], uprightMeaning: "여러 가지를 동시에 잘 관리하고 있습니다.", reversedKeywords: ["과부하", "불균형"], reversedMeaning: "너무 많은 것을 동시에 하려고 합니다." },
  { number: 3, name: "Three", nameKo: "3", uprightKeywords: ["협력", "기술", "성장"], uprightMeaning: "팀워크로 좋은 성과를 낼 수 있습니다.", reversedKeywords: ["미숙", "게으름"], reversedMeaning: "노력이 부족합니다." },
  { number: 4, name: "Four", nameKo: "4", uprightKeywords: ["안정", "소유", "보수적"], uprightMeaning: "가진 것을 지키려 합니다. 안정은 좋지만 인색하지는 마세요.", reversedKeywords: ["탐욕", "인색"], reversedMeaning: "너무 움켜쥐고 있습니다." },
  { number: 5, name: "Five", nameKo: "5", uprightKeywords: ["빈곤", "불안", "고립"], uprightMeaning: "어려운 시기지만 도움을 구할 수 있습니다.", reversedKeywords: ["회복", "희망"], reversedMeaning: "어려운 시기를 벗어나고 있습니다." },
  { number: 6, name: "Six", nameKo: "6", uprightKeywords: ["관대함", "나눔", "균형"], uprightMeaning: "나눔의 기쁨을 경험합니다.", reversedKeywords: ["빚", "불공정"], reversedMeaning: "주고받음의 균형이 맞지 않습니다." },
  { number: 7, name: "Seven", nameKo: "7", uprightKeywords: ["인내", "투자", "장기적 관점"], uprightMeaning: "씨앗을 뿌린 후 인내심을 가지고 기다리세요.", reversedKeywords: ["조급함", "성과 없음"], reversedMeaning: "결과가 나오지 않아 조급합니다." },
  { number: 8, name: "Eight", nameKo: "8", uprightKeywords: ["장인정신", "노력", "기술 향상"], uprightMeaning: "꾸준한 노력이 실력으로 이어지고 있습니다.", reversedKeywords: ["완벽주의", "번아웃"], reversedMeaning: "완벽을 추구하다 지치고 있습니다." },
  { number: 9, name: "Nine", nameKo: "9", uprightKeywords: ["풍요", "자립", "성취"], uprightMeaning: "물질적, 정신적 풍요를 누리고 있습니다.", reversedKeywords: ["과시", "불안정"], reversedMeaning: "겉으로 보이는 것과 실제가 다릅니다." },
  { number: 10, name: "Ten", nameKo: "10", uprightKeywords: ["유산", "가족", "안정"], uprightMeaning: "안정적인 기반과 가족의 행복이 있습니다.", reversedKeywords: ["가족 갈등", "재정 문제"], reversedMeaning: "가족이나 재정 문제로 불안합니다." },
  { number: 11, name: "Page", nameKo: "시종", uprightKeywords: ["학습", "새 기회", "실용적"], uprightMeaning: "새로운 기술이나 기회를 배울 때입니다.", reversedKeywords: ["게으름", "비현실적"], reversedMeaning: "노력 없이 결과만 바라고 있습니다." },
  { number: 12, name: "Knight", nameKo: "기사", uprightKeywords: ["근면", "책임감", "꾸준함"], uprightMeaning: "꾸준하고 성실한 태도로 목표에 다가가세요.", reversedKeywords: ["정체", "게으름"], reversedMeaning: "동기부여가 부족합니다." },
  { number: 13, name: "Queen", nameKo: "여왕", uprightKeywords: ["실용적", "돌봄", "풍요"], uprightMeaning: "실용적 지혜로 풍요를 만들어가세요.", reversedKeywords: ["의존", "불안"], reversedMeaning: "자립심이 부족합니다." },
  { number: 14, name: "King", nameKo: "왕", uprightKeywords: ["성공", "리더십", "안정"], uprightMeaning: "물질적 성공과 안정을 이루었습니다.", reversedKeywords: ["탐욕", "물질만능"], reversedMeaning: "물질에 너무 집착하고 있습니다." },
];

export const minorArcana: TarotCard[] = [
  ...buildSuit("wands", wandsDefs),
  ...buildSuit("cups", cupsDefs),
  ...buildSuit("swords", swordsDefs),
  ...buildSuit("pentacles", pentaclesDefs),
];
```

- [ ] **Step 3: Create character data**

Create `src/data/characters/index.ts`:

```typescript
import { CharacterConfig } from "@/types/character";

export const characters: CharacterConfig[] = [
  {
    id: "arcana",
    name: "아르카나",
    nameJp: "アルカナ",
    serviceType: "tarot",
    greeting: "안녕하세요, 저는 아르카나예요. 오늘은 어떤 이야기를 카드에 물어볼까요? ✨",
    expressions: {
      default: "/images/characters/arcana/default.webp",
      smile: "/images/characters/arcana/smile.webp",
      serious: "/images/characters/arcana/serious.webp",
      surprised: "/images/characters/arcana/surprised.webp",
      wink: "/images/characters/arcana/wink.webp",
      mystical: "/images/characters/arcana/mystical.webp",
    },
    idleAnimation: "float",
    personality: "신비롭고 따뜻한 마녀. 고양이 귀가 달린 은발의 소녀로, 수정구슬을 들고 있다. 부드럽지만 통찰력 있는 조언을 한다.",
    speechStyle: "~네요/~해요체. 부드럽고 신비로운 톤. 가끔 고양이처럼 '냥~'을 붙이기도 한다. 이모티콘을 적절히 사용한다.",
    voiceTone: "soft-mystical",
    unlocked: true,
  },
  {
    id: "miko",
    name: "미코",
    nameJp: "巫女",
    serviceType: "shinjeom",
    greeting: "...영혼의 목소리가 들려옵니다. 무엇이 궁금하신가요?",
    expressions: {
      default: "/images/characters/miko/default.webp",
      smile: "/images/characters/miko/smile.webp",
      serious: "/images/characters/miko/serious.webp",
      surprised: "/images/characters/miko/surprised.webp",
      wink: "/images/characters/miko/wink.webp",
      mystical: "/images/characters/miko/mystical.webp",
    },
    idleAnimation: "float",
    personality: "엄숙하면서도 자비로운 무녀. 흰색 하카마에 검은 장발, 붉은 리본을 한 영매사. 신령의 메시지를 전달한다.",
    speechStyle: "~입니다/~합니다체. 차분하고 엄숙한 톤. 간결하고 힘 있는 말투.",
    voiceTone: "calm-solemn",
    unlocked: false,
  },
  {
    id: "seonhwa",
    name: "선화",
    nameJp: "仙花",
    serviceType: "saju",
    greeting: "어서 오세요~ 하늘의 별이 당신의 사주를 비추고 있네요.",
    expressions: {
      default: "/images/characters/seonhwa/default.webp",
      smile: "/images/characters/seonhwa/smile.webp",
      serious: "/images/characters/seonhwa/serious.webp",
      surprised: "/images/characters/seonhwa/surprised.webp",
      wink: "/images/characters/seonhwa/wink.webp",
      mystical: "/images/characters/seonhwa/mystical.webp",
    },
    idleAnimation: "float",
    personality: "우아하고 지혜로운 선녀. 한복과 판타지가 결합된 복장에 꽃장식과 부채를 들고 있다. 동양적 신비로움이 가득하다.",
    speechStyle: "~세요/~랍니다체. 우아하고 따뜻한 톤. 한자어와 사자성어를 가끔 사용.",
    voiceTone: "elegant-warm",
    unlocked: false,
  },
  {
    id: "hoshi",
    name: "호시",
    nameJp: "星",
    serviceType: "fortune",
    greeting: "안녕~! 오늘의 별운을 확인해볼까? 🌟",
    expressions: {
      default: "/images/characters/hoshi/default.webp",
      smile: "/images/characters/hoshi/smile.webp",
      serious: "/images/characters/hoshi/serious.webp",
      surprised: "/images/characters/hoshi/surprised.webp",
      wink: "/images/characters/hoshi/wink.webp",
      mystical: "/images/characters/hoshi/mystical.webp",
    },
    idleAnimation: "float",
    personality: "발랄하고 에너지 넘치는 별의 정령. 파스텔톤 의상에 별 모티프 장식, 짧은 머리의 활발한 소녀. 긍정적이고 밝은 에너지를 전달한다.",
    speechStyle: "~야/~지체. 반말에 가까운 친근한 톤. 이모지를 많이 사용. 밝고 경쾌.",
    voiceTone: "bright-cheerful",
    unlocked: false,
  },
];

export function getCharacterByService(serviceType: string): CharacterConfig | undefined {
  return characters.find((c) => c.serviceType === serviceType);
}

export function getCharacterById(id: string): CharacterConfig | undefined {
  return characters.find((c) => c.id === id);
}
```

- [ ] **Step 4: Create spread definitions**

Create `src/data/spreads/index.ts`:

```typescript
import { SpreadDefinition, SpreadType, Topic } from "@/types/session";

export const spreads: Record<SpreadType, SpreadDefinition> = {
  "one-card": {
    type: "one-card",
    name: "One Card",
    nameKo: "원카드",
    description: "간단한 질문에 대한 직관적인 답을 얻습니다.",
    positions: [
      { index: 0, label: "Answer", labelKo: "답", x: 50, y: 50 },
    ],
  },
  "three-card": {
    type: "three-card",
    name: "Past / Present / Future",
    nameKo: "과거 / 현재 / 미래",
    description: "시간의 흐름에 따른 상황의 변화를 읽습니다.",
    positions: [
      { index: 0, label: "Past", labelKo: "과거", x: 20, y: 50 },
      { index: 1, label: "Present", labelKo: "현재", x: 50, y: 50 },
      { index: 2, label: "Future", labelKo: "미래", x: 80, y: 50 },
    ],
  },
  "five-card": {
    type: "five-card",
    name: "Simplified Celtic Cross",
    nameKo: "간소화된 켈틱 크로스",
    description: "상황을 다각도로 분석합니다.",
    positions: [
      { index: 0, label: "Present", labelKo: "현재 상황", x: 50, y: 60 },
      { index: 1, label: "Challenge", labelKo: "도전/장애물", x: 20, y: 40 },
      { index: 2, label: "Foundation", labelKo: "기반/원인", x: 50, y: 90 },
      { index: 3, label: "Near Future", labelKo: "가까운 미래", x: 80, y: 40 },
      { index: 4, label: "Outcome", labelKo: "최종 결과", x: 50, y: 10 },
    ],
  },
};

export const topicToSpread: Record<Topic, SpreadType> = {
  love: "three-card",
  general: "three-card",
  health: "one-card",
  finance: "five-card",
  career: "five-card",
};

export function getSpreadForTopic(topic: Topic): SpreadDefinition {
  return spreads[topicToSpread[topic]];
}
```

- [ ] **Step 5: Verify types compile with data**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/ src/types/
git commit -m "feat: 정적 데이터 — 78장 타로 카드, 4 캐릭터, 스프레드 정의"
```

---

### Task 4: Supabase Client & Database Schema

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `middleware.ts`, `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create Supabase middleware helper**

Create `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
```

- [ ] **Step 4: Create Next.js root middleware**

Create `middleware.ts` (project root, next to `src/`):

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Create database migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nickname text,
  avatar_url text,
  provider text,
  created_at timestamptz default now() not null,
  last_login_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Sessions table
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  service_type text not null check (service_type in ('tarot', 'saju', 'shinjeom', 'fortune')),
  topic text not null check (topic in ('love', 'finance', 'career', 'health', 'general')),
  spread_type text not null check (spread_type in ('one-card', 'three-card', 'five-card')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Anyone can create sessions"
  on public.sessions for insert
  with check (true);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id or user_id is null);

-- Session cards table
create table public.session_cards (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  card_id text not null,
  position integer not null,
  is_reversed boolean default false not null,
  selected_at timestamptz default now() not null
);

alter table public.session_cards enable row level security;

create policy "Cards follow session access"
  on public.session_cards for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
      and (s.user_id = auth.uid() or s.user_id is null)
    )
  );

create policy "Anyone can insert cards"
  on public.session_cards for insert
  with check (true);

-- Readings table
create table public.readings (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null unique,
  card_interpretation jsonb not null default '[]'::jsonb,
  overall_reading text not null default '',
  advice text not null default '',
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now() not null
);

alter table public.readings enable row level security;

create policy "Readings viewable by session owner"
  on public.readings for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
      and (s.user_id = auth.uid() or s.user_id is null)
    )
  );

create policy "Readings viewable by share token"
  on public.readings for select
  using (true);

create policy "Anyone can insert readings"
  on public.readings for insert
  with check (true);

-- Services registry table
create table public.services (
  id text primary key,
  name text not null,
  is_active boolean default true not null,
  character_config jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.services enable row level security;

create policy "Services are publicly readable"
  on public.services for select
  using (true);

-- Insert default services
insert into public.services (id, name, is_active) values
  ('tarot', '타로', true),
  ('saju', '사주', false),
  ('shinjeom', '신점', false),
  ('fortune', '오늘의 운세', false);

-- Indexes
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_status on public.sessions(status);
create index idx_readings_share_token on public.readings(share_token);
create index idx_session_cards_session_id on public.session_cards(session_id);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname, avatar_url, provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'provider'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 6: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/ middleware.ts supabase/
git commit -m "feat: Supabase 클라이언트 설정 + 데이터베이스 마이그레이션 스키마"
```

---

### Task 5: AI Provider — Grok API Integration

**Files:**
- Create: `src/services/core/ai-provider.ts`, `src/services/core/grok-provider.ts`, `src/services/core/prompt-builder.ts`

- [ ] **Step 1: Create AI provider interface (re-export from types)**

Create `src/services/core/ai-provider.ts`:

```typescript
export type { AIProvider } from "@/types/service";
```

- [ ] **Step 2: Create Grok provider implementation**

Create `src/services/core/grok-provider.ts`:

```typescript
import { AIProvider } from "@/types/service";

export class GrokProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.x.ai/v1";

  constructor() {
    this.apiKey = process.env.GROK_API_KEY!;
    this.model = process.env.GROK_MODEL || "grok-3";
  }

  async generateReading(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async *streamReading(
    systemPrompt: string,
    userPrompt: string,
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error (${response.status}): ${error}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  }
}
```

- [ ] **Step 3: Create prompt builder**

Create `src/services/core/prompt-builder.ts`:

```typescript
import { CharacterConfig } from "@/types/character";
import { SelectedCard } from "@/types/card";
import { Topic, SpreadDefinition } from "@/types/session";

const topicLabels: Record<Topic, string> = {
  love: "연애/관계",
  finance: "재정/금전",
  career: "직장/진로",
  health: "건강",
  general: "일반 상담",
};

export function buildSystemPrompt(character: CharacterConfig): string {
  return `당신은 "${character.name}" (${character.nameJp})입니다.

성격: ${character.personality}

말투 규칙:
- ${character.speechStyle}
- 한국어로만 응답합니다.
- 타로 카드 해석 전문가로서, 카드의 상징과 의미를 깊이 있게 설명합니다.
- 사용자에게 따뜻하고 공감하는 태도로 상담합니다.
- 지나치게 부정적이거나 공포를 조장하는 해석은 피합니다.
- 모든 카드에는 긍정적 메시지와 실용적 조언을 포함합니다.

응답 형식:
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력합니다.
{
  "cardInterpretations": [
    {
      "cardId": "카드 ID",
      "position": 0,
      "interpretation": "이 위치에서 이 카드가 의미하는 바를 캐릭터의 말투로 설명"
    }
  ],
  "overallReading": "모든 카드를 종합한 전체 해석을 캐릭터의 말투로 설명",
  "advice": "실용적인 조언을 캐릭터의 말투로 제공"
}`;
}

export function buildReadingPrompt(
  topic: Topic,
  selectedCards: SelectedCard[],
  spread: SpreadDefinition,
): string {
  const cardDescriptions = selectedCards
    .map((sc) => {
      const pos = spread.positions[sc.position];
      const direction = sc.isReversed ? "역방향" : "정방향";
      const meanings = sc.isReversed ? sc.card.reversed : sc.card.upright;
      return `- 위치: ${pos.labelKo} (${pos.label})
  카드: ${sc.card.nameKo} (${sc.card.name}) [${direction}]
  카드ID: ${sc.card.id}
  포지션: ${sc.position}
  키워드: ${meanings.keywords.join(", ")}
  기본 의미: ${meanings.meaning}`;
    })
    .join("\n\n");

  return `상담 주제: ${topicLabels[topic]}
스프레드: ${spread.nameKo} (${spread.name})

선택된 카드:
${cardDescriptions}

위 카드들의 조합을 해석해주세요. 각 카드의 위치와 주제를 고려하여 개별 해석과 종합 해석, 실용적 조언을 제공해주세요.`;
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/core/
git commit -m "feat: AI Provider 추상화 + Grok API 구현체 + 프롬프트 빌더"
```

---

### Task 6: Tarot Service Module

**Files:**
- Create: `src/services/tarot/tarot-service.ts`, `src/services/tarot/deck-manager.ts`, `src/services/tarot/spread-resolver.ts`

- [ ] **Step 1: Create deck manager**

Create `src/services/tarot/deck-manager.ts`:

```typescript
import { TarotCard, SelectedCard } from "@/types/card";
import { majorArcana } from "@/data/cards/major-arcana";
import { minorArcana } from "@/data/cards/minor-arcana";

export class DeckManager {
  private deck: TarotCard[];

  constructor() {
    this.deck = [...majorArcana, ...minorArcana];
  }

  getAllCards(): TarotCard[] {
    return this.deck;
  }

  getCardById(id: string): TarotCard | undefined {
    return this.deck.find((c) => c.id === id);
  }

  shuffleAndDraw(count: number): SelectedCard[] {
    const shuffled = [...this.deck].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((card, index) => ({
      card,
      position: index,
      isReversed: Math.random() > 0.5,
      selectedAt: new Date(),
    }));
  }

  drawSpecificCards(cardIds: string[], reversed: boolean[]): SelectedCard[] {
    return cardIds.map((id, index) => {
      const card = this.getCardById(id);
      if (!card) throw new Error(`Card not found: ${id}`);
      return {
        card,
        position: index,
        isReversed: reversed[index] ?? false,
        selectedAt: new Date(),
      };
    });
  }
}
```

- [ ] **Step 2: Create spread resolver**

Create `src/services/tarot/spread-resolver.ts`:

```typescript
import { Topic, SpreadDefinition } from "@/types/session";
import { getSpreadForTopic, spreads } from "@/data/spreads";

export class SpreadResolver {
  resolveForTopic(topic: Topic): SpreadDefinition {
    return getSpreadForTopic(topic);
  }

  getSpreadByType(type: string): SpreadDefinition | undefined {
    return spreads[type as keyof typeof spreads];
  }

  getRequiredCardCount(topic: Topic): number {
    const spread = this.resolveForTopic(topic);
    return spread.positions.length;
  }
}
```

- [ ] **Step 3: Create tarot service (DivinationService implementation)**

Create `src/services/tarot/tarot-service.ts`:

```typescript
import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic } from "@/types/session";
import { getCharacterByService } from "@/data/characters";
import { buildSystemPrompt, buildReadingPrompt } from "@/services/core/prompt-builder";
import { SpreadResolver } from "./spread-resolver";

export class TarotService implements DivinationService {
  id = "tarot";
  name = "타로";
  private spreadResolver = new SpreadResolver();

  getCharacter(): CharacterConfig {
    const character = getCharacterByService("tarot");
    if (!character) throw new Error("Tarot character not found");
    return character;
  }

  startSession(topic: Topic): Omit<Session, "id" | "createdAt"> {
    const spread = this.spreadResolver.resolveForTopic(topic);
    return {
      userId: null,
      serviceType: this.id,
      topic,
      status: "in_progress",
      spreadType: spread.type,
      selectedCards: [],
      completedAt: null,
    };
  }

  getSystemPrompt(): string {
    return buildSystemPrompt(this.getCharacter());
  }

  getReadingPrompt(context: SessionContext): string {
    const spread = this.spreadResolver.resolveForTopic(context.topic);
    return buildReadingPrompt(context.topic, context.selectedCards, spread);
  }

  parseResult(aiResponse: string): ReadingResult {
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        cardInterpretations: parsed.cardInterpretations || [],
        overallReading: parsed.overallReading || "",
        advice: parsed.advice || "",
      };
    } catch {
      return {
        cardInterpretations: [],
        overallReading: aiResponse,
        advice: "",
      };
    }
  }
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/tarot/
git commit -m "feat: 타로 서비스 모듈 — DeckManager, SpreadResolver, TarotService"
```

---

### Task 7: State Management — Zustand Session Store

**Files:**
- Create: `src/hooks/useSession.ts`, `src/hooks/useCharacter.ts`, `src/hooks/useCardAnimation.ts`

- [ ] **Step 1: Create session store**

Create `src/hooks/useSession.ts`:

```typescript
import { create } from "zustand";
import { Session, Topic, SpreadType, ChatMessage } from "@/types/session";
import { SelectedCard, TarotCard } from "@/types/card";
import { ReadingResult } from "@/types/service";

type SessionPhase = "topic-select" | "card-shuffle" | "card-select" | "reading" | "result";

interface SessionState {
  phase: SessionPhase;
  sessionId: string | null;
  topic: Topic | null;
  spreadType: SpreadType | null;
  requiredCards: number;
  availableCards: TarotCard[];
  selectedCards: SelectedCard[];
  chatMessages: ChatMessage[];
  readingResult: ReadingResult | null;
  isLoading: boolean;

  setPhase: (phase: SessionPhase) => void;
  setTopic: (topic: Topic) => void;
  setSpreadType: (type: SpreadType, required: number) => void;
  setSessionId: (id: string) => void;
  setAvailableCards: (cards: TarotCard[]) => void;
  selectCard: (card: SelectedCard) => void;
  addChatMessage: (message: ChatMessage) => void;
  appendToLastMessage: (content: string) => void;
  setReadingResult: (result: ReadingResult) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  phase: "topic-select" as SessionPhase,
  sessionId: null,
  topic: null,
  spreadType: null,
  requiredCards: 0,
  availableCards: [],
  selectedCards: [],
  chatMessages: [],
  readingResult: null,
  isLoading: false,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setTopic: (topic) => set({ topic }),
  setSpreadType: (type, required) =>
    set({ spreadType: type, requiredCards: required }),
  setSessionId: (id) => set({ sessionId: id }),
  setAvailableCards: (cards) => set({ availableCards: cards }),

  selectCard: (card) =>
    set((state) => ({
      selectedCards: [...state.selectedCards, card],
    })),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.chatMessages];
      const last = messages[messages.length - 1];
      if (last && last.role === "character") {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + content,
        };
      }
      return { chatMessages: messages };
    }),

  setReadingResult: (result) => set({ readingResult: result }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set(initialState),
}));
```

- [ ] **Step 2: Create character hook**

Create `src/hooks/useCharacter.ts`:

```typescript
import { create } from "zustand";
import { Mood } from "@/types/character";

interface CharacterState {
  currentMood: Mood;
  isTyping: boolean;
  setMood: (mood: Mood) => void;
  setTyping: (typing: boolean) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  currentMood: "default",
  isTyping: false,
  setMood: (mood) => set({ currentMood: mood }),
  setTyping: (typing) => set({ isTyping: typing }),
}));
```

- [ ] **Step 3: Create card animation hook**

Create `src/hooks/useCardAnimation.ts`:

```typescript
import { create } from "zustand";

type AnimationPhase = "idle" | "shuffling" | "spreading" | "selecting" | "flipping" | "placing";

interface CardAnimationState {
  animationPhase: AnimationPhase;
  flippedCardIndex: number | null;
  setAnimationPhase: (phase: AnimationPhase) => void;
  setFlippedCard: (index: number | null) => void;
  reset: () => void;
}

export const useCardAnimationStore = create<CardAnimationState>((set) => ({
  animationPhase: "idle",
  flippedCardIndex: null,
  setAnimationPhase: (phase) => set({ animationPhase: phase }),
  setFlippedCard: (index) => set({ flippedCardIndex: index }),
  reset: () => set({ animationPhase: "idle", flippedCardIndex: null }),
}));
```

- [ ] **Step 4: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: Zustand 상태 관리 — 세션, 캐릭터, 카드 애니메이션 스토어"
```

---

### Task 8: UI Components — Layout & Common

**Files:**
- Create: `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Create Header**

Create `src/components/layout/Header.tsx`:

```typescript
"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-arcana-bg/80 backdrop-blur-md border-b border-arcana-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-display font-bold bg-gradient-to-r from-arcana-purple to-arcana-indigo bg-clip-text text-transparent">
            ArcanaInsight
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/tarot"
            className="text-arcana-muted hover:text-arcana-text transition-colors"
          >
            타로
          </Link>
          <Link
            href="/mypage"
            className="text-arcana-muted hover:text-arcana-text transition-colors"
          >
            마이페이지
          </Link>
          <Link
            href="/auth/login"
            className="px-4 py-1.5 rounded-full bg-arcana-purple/20 text-arcana-purple hover:bg-arcana-purple/30 transition-colors text-sm"
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create Footer**

Create `src/components/layout/Footer.tsx`:

```typescript
export function Footer() {
  return (
    <footer className="border-t border-arcana-border py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4 text-center text-arcana-muted text-sm">
        <p>&copy; 2026 ArcanaInsight. All rights reserved.</p>
        <p className="mt-1">타로 & 운세 종합 플랫폼</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create MobileNav**

Create `src/components/layout/MobileNav.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "홈", icon: "✦" },
  { href: "/tarot", label: "타로", icon: "🃏" },
  { href: "/mypage", label: "MY", icon: "♡" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-arcana-bg/90 backdrop-blur-md border-t border-arcana-border">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? "text-arcana-purple" : "text-arcana-muted"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Update root layout to include Header, Footer, MobileNav**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Noto_Sans_KR, Gothic_A1 } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const gothicA1 = Gothic_A1({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-gothic-a1",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArcanaInsight — 타로 & 운세 상담",
  description:
    "애니메이션 캐릭터와 함께하는 타로 리딩, 사주, 신점 종합 운세 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`dark ${notoSansKr.variable} ${gothicA1.variable}`}
    >
      <body className="bg-arcana-bg text-arcana-text font-sans min-h-screen antialiased flex flex-col">
        <Header />
        <main className="flex-1 pt-14 pb-14 md:pb-0">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: 공통 레이아웃 컴포넌트 — Header, Footer, MobileNav + 루트 레이아웃 통합"
```

---

### Task 9: UI Components — Character System

**Files:**
- Create: `src/components/character/CharacterDisplay.tsx`, `src/components/character/CharacterSelector.tsx`, `src/components/character/TypingDialogue.tsx`

- [ ] **Step 1: Create CharacterDisplay**

Create `src/components/character/CharacterDisplay.tsx`:

```typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CharacterConfig, Mood } from "@/types/character";

interface CharacterDisplayProps {
  character: CharacterConfig;
  mood: Mood;
  className?: string;
}

export function CharacterDisplay({
  character,
  mood,
  className = "",
}: CharacterDisplayProps) {
  const imageSrc = character.expressions[mood];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Mystical background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-arcana-purple/10 to-transparent rounded-full blur-3xl" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${character.id}-${mood}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {/* Character image placeholder — replace with actual images */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-48 h-64 md:w-64 md:h-80 rounded-2xl bg-arcana-card border border-arcana-border flex items-center justify-center"
          >
            <div className="text-center">
              <p className="text-4xl mb-2">
                {mood === "smile"
                  ? "😊"
                  : mood === "serious"
                    ? "🔮"
                    : mood === "surprised"
                      ? "😲"
                      : mood === "wink"
                        ? "😉"
                        : mood === "mystical"
                          ? "✨"
                          : "🌙"}
              </p>
              <p className="text-arcana-purple font-display font-bold">
                {character.name}
              </p>
              <p className="text-arcana-muted text-xs">{character.nameJp}</p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create CharacterSelector**

Create `src/components/character/CharacterSelector.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { characters } from "@/data/characters";
import { CharacterConfig } from "@/types/character";

interface CharacterSelectorProps {
  onSelect: (character: CharacterConfig) => void;
}

export function CharacterSelector({ onSelect }: CharacterSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {characters.map((character, index) => (
        <motion.button
          key={character.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => character.unlocked && onSelect(character)}
          disabled={!character.unlocked}
          className={`relative group rounded-2xl p-4 border transition-all ${
            character.unlocked
              ? "bg-arcana-card border-arcana-border hover:border-arcana-purple cursor-pointer"
              : "bg-arcana-surface border-arcana-border/50 cursor-not-allowed opacity-60"
          }`}
        >
          {/* Character preview */}
          <div className="w-full aspect-[3/4] rounded-xl bg-arcana-surface mb-3 flex items-center justify-center overflow-hidden">
            {character.unlocked ? (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="text-5xl"
              >
                {character.serviceType === "tarot"
                  ? "🔮"
                  : character.serviceType === "shinjeom"
                    ? "⛩️"
                    : character.serviceType === "saju"
                      ? "🌸"
                      : "⭐"}
              </motion.div>
            ) : (
              <div className="text-arcana-muted text-4xl">?</div>
            )}
          </div>

          <h3 className="font-display font-bold text-sm">
            {character.unlocked ? character.name : "???"}
          </h3>
          <p className="text-arcana-muted text-xs mt-1">
            {character.unlocked ? character.nameJp : "Coming Soon"}
          </p>

          {!character.unlocked && (
            <div className="absolute inset-0 rounded-2xl bg-arcana-bg/40 flex items-center justify-center">
              <span className="text-arcana-muted text-xs bg-arcana-surface px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create TypingDialogue**

Create `src/components/character/TypingDialogue.tsx`:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TypingDialogueProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  isStreaming?: boolean;
}

export function TypingDialogue({
  text,
  speed = 30,
  onComplete,
  className = "",
  isStreaming = false,
}: TypingDialogueProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (isStreaming) {
      setDisplayedText(text);
      return;
    }

    if (text === prevTextRef.current) return;
    prevTextRef.current = text;

    setDisplayedText("");
    setIsComplete(false);

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete, isStreaming]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative ${className}`}
    >
      <p className="leading-relaxed whitespace-pre-wrap">
        {displayedText}
        {!isComplete && !isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-arcana-purple"
          >
            |
          </motion.span>
        )}
      </p>
    </motion.div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/character/
git commit -m "feat: 캐릭터 컴포넌트 — CharacterDisplay, CharacterSelector, TypingDialogue"
```

---

### Task 10: UI Components — Card System

**Files:**
- Create: `src/components/card/CardItem.tsx`, `src/components/card/CardDeck.tsx`, `src/components/card/CardSpread.tsx`, `src/components/card/CardSwiper.tsx`

- [ ] **Step 1: Create CardItem with flip animation**

Create `src/components/card/CardItem.tsx`:

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";

interface CardItemProps {
  card: TarotCard;
  isFlipped: boolean;
  isSelected: boolean;
  isReversed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-16 h-24",
  md: "w-24 h-36",
  lg: "w-32 h-48",
};

export function CardItem({
  card,
  isFlipped,
  isSelected,
  isReversed = false,
  onClick,
  size = "md",
  className = "",
}: CardItemProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={!isFlipped ? { y: -8, scale: 1.02 } : undefined}
      className={`relative cursor-pointer perspective-1000 ${sizeClasses[size]} ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative"
      >
        {/* Card Back */}
        <div
          className={`absolute inset-0 rounded-lg border-2 backface-hidden ${
            isSelected
              ? "border-arcana-gold shadow-lg shadow-arcana-gold/20"
              : "border-arcana-border hover:border-arcana-purple"
          } bg-gradient-to-br from-arcana-purple/30 to-arcana-indigo/30 flex items-center justify-center`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="text-arcana-purple/50 text-2xl">✦</div>
        </div>

        {/* Card Front */}
        <div
          className={`absolute inset-0 rounded-lg border-2 border-arcana-gold bg-arcana-card flex flex-col items-center justify-center p-2 ${
            isReversed ? "rotate-180" : ""
          }`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="text-arcana-gold text-xs font-display font-bold text-center">
            {card.nameKo}
          </p>
          <p className="text-arcana-muted text-[10px] text-center mt-1">
            {card.name}
          </p>
          {isReversed && (
            <span className="absolute top-1 right-1 text-[8px] text-red-400">
              역
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create CardDeck with shuffle and fan spread**

Create `src/components/card/CardDeck.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";

interface CardDeckProps {
  cards: TarotCard[];
  isSpread: boolean;
  selectedIndices: number[];
  onCardSelect: (index: number) => void;
  maxDisplay?: number;
}

export function CardDeck({
  cards,
  isSpread,
  selectedIndices,
  onCardSelect,
  maxDisplay = 12,
}: CardDeckProps) {
  const displayCards = useMemo(
    () => cards.slice(0, maxDisplay),
    [cards, maxDisplay],
  );

  return (
    <div className="relative w-full flex items-center justify-center min-h-[200px]">
      {displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const totalCards = displayCards.length;
        const angle = isSpread
          ? (index - totalCards / 2) * (180 / totalCards / 2)
          : 0;
        const xOffset = isSpread
          ? (index - totalCards / 2) * 40
          : (index - totalCards / 2) * 2;
        const yOffset = isSpread
          ? Math.abs(index - totalCards / 2) * 8
          : index * -0.5;

        return (
          <motion.div
            key={card.id}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
            animate={{
              x: xOffset,
              y: yOffset,
              rotate: angle,
              opacity: isSelected ? 0.3 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              delay: isSpread ? index * 0.05 : 0,
            }}
            className="absolute"
            style={{ zIndex: index }}
          >
            <CardItem
              card={card}
              isFlipped={false}
              isSelected={isSelected}
              onClick={() => !isSelected && onCardSelect(index)}
              size="md"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create CardSpread**

Create `src/components/card/CardSpread.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { SelectedCard } from "@/types/card";
import { SpreadDefinition } from "@/types/session";
import { CardItem } from "./CardItem";

interface CardSpreadProps {
  selectedCards: SelectedCard[];
  spread: SpreadDefinition;
  revealedPositions: number[];
}

export function CardSpread({
  selectedCards,
  spread,
  revealedPositions,
}: CardSpreadProps) {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      {spread.positions.map((pos) => {
        const selectedCard = selectedCards.find(
          (sc) => sc.position === pos.index,
        );
        const isRevealed = revealedPositions.includes(pos.index);

        return (
          <motion.div
            key={pos.index}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: pos.index * 0.2, type: "spring" }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {selectedCard ? (
              <div className="flex flex-col items-center gap-1">
                <CardItem
                  card={selectedCard.card}
                  isFlipped={isRevealed}
                  isSelected={true}
                  isReversed={selectedCard.isReversed}
                  size="md"
                />
                <span className="text-arcana-muted text-xs">
                  {pos.labelKo}
                </span>
              </div>
            ) : (
              <div className="w-24 h-36 rounded-lg border-2 border-dashed border-arcana-border/50 flex items-center justify-center">
                <span className="text-arcana-muted text-xs">
                  {pos.labelKo}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create CardSwiper for mobile**

Create `src/components/card/CardSwiper.tsx`:

```typescript
"use client";

import { useState } from "react";
import { motion, PanInfo } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";

interface CardSwiperProps {
  cards: TarotCard[];
  selectedIndices: number[];
  onCardSelect: (index: number) => void;
}

export function CardSwiper({
  cards,
  selectedIndices,
  onCardSelect,
}: CardSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (info.offset.x < -50 && currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="relative w-full overflow-hidden py-8">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={{ x: -currentIndex * 120 + 60 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="flex gap-4 pl-4"
      >
        {cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index);
          const isCurrent = index === currentIndex;

          return (
            <motion.div
              key={card.id}
              animate={{
                scale: isCurrent ? 1.1 : 0.9,
                opacity: isSelected ? 0.3 : 1,
              }}
              className="flex-shrink-0"
            >
              <CardItem
                card={card}
                isFlipped={false}
                isSelected={isSelected}
                onClick={() => !isSelected && onCardSelect(index)}
                size="lg"
              />
            </motion.div>
          );
        })}
      </motion.div>

      <div className="flex justify-center gap-1 mt-4">
        {cards.slice(0, 20).map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              index === currentIndex ? "bg-arcana-purple" : "bg-arcana-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/card/
git commit -m "feat: 카드 컴포넌트 — CardItem(3D뒤집기), CardDeck(부채꼴), CardSpread, CardSwiper(모바일)"
```

---

### Task 11: UI Components — Chat System

**Files:**
- Create: `src/components/chat/ChatBubble.tsx`, `src/components/chat/ChatWindow.tsx`

- [ ] **Step 1: Create ChatBubble**

Create `src/components/chat/ChatBubble.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { ChatMessage } from "@/types/session";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isCharacter = message.role === "character";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-arcana-muted text-xs py-2"
      >
        {message.content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCharacter ? "justify-start" : "justify-end"} mb-3`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isCharacter
            ? "bg-arcana-card border border-arcana-border text-arcana-text rounded-tl-sm"
            : "bg-arcana-purple/20 text-arcana-text rounded-tr-sm"
        }`}
      >
        {isCharacter && (
          <span className="text-arcana-purple text-xs font-display font-bold block mb-1">
            {message.mood === "mystical" ? "✨ " : ""}캐릭터
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create ChatWindow**

Create `src/components/chat/ChatWindow.tsx`:

```typescript
"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/session";
import { ChatBubble } from "./ChatBubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  className?: string;
}

export function ChatWindow({ messages, className = "" }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={`flex flex-col overflow-y-auto px-4 py-3 ${className}`}>
      {messages.length === 0 && (
        <div className="text-center text-arcana-muted text-sm py-8">
          상담이 시작되면 대화가 여기에 표시됩니다.
        </div>
      )}
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/
git commit -m "feat: 채팅 컴포넌트 — ChatBubble, ChatWindow (자동스크롤)"
```

---

### Task 12: API Routes — Session & Reading

**Files:**
- Create: `src/app/api/tarot/session/route.ts`, `src/app/api/tarot/reading/route.ts`, `src/app/api/tarot/result/[id]/route.ts`

- [ ] **Step 1: Create session API route**

Create `src/app/api/tarot/session/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { Topic } from "@/types/session";

const tarotService = new TarotService();

export async function POST(request: NextRequest) {
  try {
    const { topic } = (await request.json()) as { topic: Topic };

    if (!["love", "finance", "career", "health", "general"].includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sessionData = tarotService.startSession(topic);

    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        user_id: user?.id || null,
        service_type: sessionData.serviceType,
        topic: sessionData.topic,
        spread_type: sessionData.spreadType,
        status: sessionData.status,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create reading API route with SSE streaming**

Create `src/app/api/tarot/reading/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { GrokProvider } from "@/services/core/grok-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { Topic } from "@/types/session";
import { SelectedCard } from "@/types/card";

const tarotService = new TarotService();
const grokProvider = new GrokProvider();
const deckManager = new DeckManager();

export async function POST(request: NextRequest) {
  try {
    const { sessionId, topic, cards } = (await request.json()) as {
      sessionId: string;
      topic: Topic;
      cards: { cardId: string; position: number; isReversed: boolean }[];
    };

    const selectedCards: SelectedCard[] = cards.map((c) => {
      const card = deckManager.getCardById(c.cardId);
      if (!card) throw new Error(`Card not found: ${c.cardId}`);
      return {
        card,
        position: c.position,
        isReversed: c.isReversed,
        selectedAt: new Date(),
      };
    });

    const systemPrompt = tarotService.getSystemPrompt();
    const readingPrompt = tarotService.getReadingPrompt({
      session: {
        id: sessionId,
        userId: null,
        serviceType: "tarot",
        topic,
        status: "in_progress",
        spreadType: "three-card",
        selectedCards,
        createdAt: new Date(),
        completedAt: null,
      },
      selectedCards,
      chatHistory: [],
      topic,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        try {
          for await (const chunk of grokProvider.streamReading(
            systemPrompt,
            readingPrompt,
          )) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`),
            );
          }

          // Save reading to database
          const result = tarotService.parseResult(fullResponse);
          const supabase = await createClient();

          await supabase.from("session_cards").insert(
            cards.map((c) => ({
              session_id: sessionId,
              card_id: c.cardId,
              position: c.position,
              is_reversed: c.isReversed,
            })),
          );

          await supabase.from("readings").insert({
            session_id: sessionId,
            card_interpretation: result.cardInterpretations,
            overall_reading: result.overallReading,
            advice: result.advice,
          });

          await supabase
            .from("sessions")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", sessionId);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, result })}\n\n`,
            ),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Reading generation failed" })}\n\n`,
            ),
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to generate reading" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
```

- [ ] **Step 3: Create result API route**

Create `src/app/api/tarot/result/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: reading, error } = await supabase
      .from("readings")
      .select(
        `
        *,
        sessions (
          id,
          service_type,
          topic,
          spread_type,
          created_at
        ),
        session_cards:sessions!inner (
          session_cards (
            card_id,
            position,
            is_reversed
          )
        )
      `,
      )
      .eq("share_token", id)
      .single();

    if (error || !reading) {
      return NextResponse.json(
        { error: "Reading not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ reading });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reading" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/
git commit -m "feat: API 라우트 — 세션 생성, SSE 스트리밍 리딩, 결과 조회"
```

---

### Task 13: Pages — Landing & Tarot Topic Selection

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/tarot/page.tsx`

- [ ] **Step 1: Create landing page**

Replace `src/app/page.tsx`:

```typescript
import Link from "next/link";
import { CharacterSelector } from "@/components/character/CharacterSelector";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-6xl font-display font-black mb-4">
            <span className="bg-gradient-to-r from-arcana-purple via-arcana-indigo to-arcana-gold bg-clip-text text-transparent">
              ArcanaInsight
            </span>
          </h1>
          <p className="text-arcana-muted text-lg md:text-xl mb-8">
            애니메이션 캐릭터와 함께하는 타로 리딩 & 운세 상담
          </p>
          <Link
            href="/tarot"
            className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-display font-bold hover:opacity-90 transition-opacity"
          >
            타로 상담 시작하기
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          {[
            {
              icon: "🔮",
              title: "AI 타로 리딩",
              desc: "78장 정통 타로 덱과 AI 기반 깊이 있는 해석",
            },
            {
              icon: "💬",
              title: "캐릭터 상담",
              desc: "개성 있는 캐릭터와 대화하며 진행하는 몰입감",
            },
            {
              icon: "✨",
              title: "다양한 운세",
              desc: "타로, 사주, 신점 등 종합 운세 플랫폼 (확장 예정)",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-arcana-card border border-arcana-border rounded-2xl p-6 text-center"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-display font-bold mb-2">{feature.title}</h3>
              <p className="text-arcana-muted text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create tarot topic selection page**

Create `src/app/tarot/page.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Topic } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { getCharacterByService } from "@/data/characters";
import { getSpreadForTopic } from "@/data/spreads";

const topics: { id: Topic; label: string; icon: string; desc: string }[] = [
  { id: "love", label: "연애/관계", icon: "💕", desc: "사랑과 인간관계에 대한 상담" },
  { id: "career", label: "직장/진로", icon: "💼", desc: "커리어와 진로에 대한 조언" },
  { id: "finance", label: "재정/금전", icon: "💰", desc: "돈과 재정 상황에 대한 통찰" },
  { id: "health", label: "건강", icon: "🌿", desc: "건강과 웰빙에 대한 가이드" },
  { id: "general", label: "일반 상담", icon: "✨", desc: "자유로운 주제의 종합 상담" },
];

export default function TarotPage() {
  const router = useRouter();
  const { setTopic, setSpreadType, setPhase } = useSessionStore();
  const character = getCharacterByService("tarot")!;

  const handleTopicSelect = (topic: Topic) => {
    const spread = getSpreadForTopic(topic);
    setTopic(topic);
    setSpreadType(spread.type, spread.positions.length);
    setPhase("card-shuffle");
    router.push("/tarot/session");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Character */}
      <div className="flex justify-center mb-8">
        <CharacterDisplay character={character} mood="smile" className="h-64" />
      </div>

      {/* Greeting */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold mb-2">
          어떤 이야기를 들려주실 건가요?
        </h2>
        <p className="text-arcana-muted">상담 주제를 선택해주세요</p>
      </div>

      {/* Topic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((topic, index) => (
          <motion.button
            key={topic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleTopicSelect(topic.id)}
            className="group bg-arcana-card border border-arcana-border rounded-2xl p-5 text-left hover:border-arcana-purple transition-all"
          >
            <span className="text-2xl block mb-2">{topic.icon}</span>
            <h3 className="font-display font-bold group-hover:text-arcana-purple transition-colors">
              {topic.label}
            </h3>
            <p className="text-arcana-muted text-sm mt-1">{topic.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/tarot/page.tsx
git commit -m "feat: 랜딩 페이지 + 타로 주제 선택 페이지"
```

---

### Task 14: Pages — Tarot Session (Main Consultation)

**Files:**
- Create: `src/app/tarot/session/page.tsx`

- [ ] **Step 1: Create session page — the main consultation experience**

Create `src/app/tarot/session/page.tsx`:

```typescript
"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { TypingDialogue } from "@/components/character/TypingDialogue";
import { CardDeck } from "@/components/card/CardDeck";
import { CardSpread } from "@/components/card/CardSpread";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { getCharacterByService } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getSpreadForTopic } from "@/data/spreads";
import { TarotCard, SelectedCard } from "@/types/card";
import { ChatMessage } from "@/types/session";

const deckManager = new DeckManager();

export default function TarotSessionPage() {
  const router = useRouter();
  const character = getCharacterByService("tarot")!;
  const { currentMood, setMood, setTyping } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase,
    topic,
    spreadType,
    requiredCards,
    selectedCards,
    chatMessages,
    readingResult,
    isLoading,
    setPhase,
    setSessionId,
    setAvailableCards,
    availableCards,
    selectCard,
    addChatMessage,
    appendToLastMessage,
    setReadingResult,
    setLoading,
  } = useSessionStore();

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);

  // Initialize deck and create session
  useEffect(() => {
    if (!topic) {
      router.push("/tarot");
      return;
    }

    const allCards = deckManager.getAllCards();
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setShuffledDeck(shuffled);
    setAvailableCards(shuffled);

    // Create session
    fetch("/api/tarot/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSessionId(data.session.id);
        }
      });

    // Character greeting
    setMood("smile");
    addChatMessage({
      id: crypto.randomUUID(),
      role: "character",
      content: character.greeting,
      mood: "smile",
      timestamp: new Date(),
    });

    setTimeout(() => {
      setAnimationPhase("spreading");
      setPhase("card-select");
      addChatMessage({
        id: crypto.randomUUID(),
        role: "character",
        content: `${requiredCards}장의 카드를 골라주세요. 직감을 믿고 끌리는 카드를 선택해보세요 ✨`,
        mood: "mystical",
        timestamp: new Date(),
      });
      setMood("mystical");
    }, 2000);
  }, [topic]);

  const handleCardSelect = useCallback(
    (index: number) => {
      if (selectedCards.length >= requiredCards) return;

      const card = shuffledDeck[index];
      const isReversed = Math.random() > 0.5;
      const position = selectedCards.length;

      const selected: SelectedCard = {
        card,
        position,
        isReversed,
        selectedAt: new Date(),
      };

      selectCard(selected);
      setSelectedIndices((prev) => [...prev, index]);
      setRevealedPositions((prev) => [...prev, position]);

      setMood("surprised");
      setTimeout(() => setMood("default"), 1000);

      // If all cards selected, start reading
      if (selectedCards.length + 1 >= requiredCards) {
        const allSelected = [...selectedCards, selected];
        setTimeout(() => startReading(allSelected), 1500);
      }
    },
    [shuffledDeck, selectedCards, requiredCards],
  );

  const startReading = async (cards: SelectedCard[]) => {
    setPhase("reading");
    setLoading(true);
    setMood("mystical");

    addChatMessage({
      id: crypto.randomUUID(),
      role: "character",
      content: "카드가 모두 모였네요... 이제 카드의 이야기를 들어볼게요 🔮",
      mood: "mystical",
      timestamp: new Date(),
    });

    const sessionId = useSessionStore.getState().sessionId;

    try {
      const response = await fetch("/api/tarot/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          topic,
          cards: cards.map((c) => ({
            cardId: c.card.id,
            position: c.position,
            isReversed: c.isReversed,
          })),
        }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const readingMessageId = crypto.randomUUID();
      addChatMessage({
        id: readingMessageId,
        role: "character",
        content: "",
        mood: "mystical",
        timestamp: new Date(),
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.chunk) {
            appendToLastMessage(data.chunk);
          }

          if (data.done && data.result) {
            setReadingResult(data.result);
            setPhase("result");
            setMood("smile");
          }
        }
      }
    } catch (error) {
      addChatMessage({
        id: crypto.randomUUID(),
        role: "character",
        content: "앗, 카드의 메시지를 읽는 데 문제가 생겼어요. 다시 시도해주세요 🙏",
        mood: "surprised",
        timestamp: new Date(),
      });
      setMood("surprised");
    }

    setLoading(false);
  };

  const spread = topic ? getSpreadForTopic(topic) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-7rem)]">
      {/* Character Area (top 35%) */}
      <div className="flex-shrink-0 h-[35%] flex items-center justify-center relative">
        <CharacterDisplay character={character} mood={currentMood} />
        {chatMessages.length > 0 && (
          <div className="absolute bottom-2 left-4 right-4 bg-arcana-card/90 backdrop-blur-sm border border-arcana-border rounded-xl px-4 py-2">
            <TypingDialogue
              text={chatMessages[chatMessages.length - 1].content}
              speed={20}
              isStreaming={phase === "reading"}
              className="text-sm"
            />
          </div>
        )}
      </div>

      {/* Card Area (middle) */}
      {phase === "card-select" && (
        <div className="flex-shrink-0 h-[30%] flex items-center">
          <CardDeck
            cards={shuffledDeck.slice(0, 12)}
            isSpread={animationPhase === "spreading"}
            selectedIndices={selectedIndices}
            onCardSelect={handleCardSelect}
          />
        </div>
      )}

      {(phase === "reading" || phase === "result") && spread && (
        <div className="flex-shrink-0 h-[30%] flex items-center">
          <CardSpread
            selectedCards={selectedCards}
            spread={spread}
            revealedPositions={revealedPositions}
          />
        </div>
      )}

      {/* Chat Area (bottom) */}
      <div className="flex-1 min-h-0 border-t border-arcana-border mt-2">
        <ChatWindow messages={chatMessages} className="h-full" />
      </div>

      {/* Result Actions */}
      {phase === "result" && (
        <div className="flex-shrink-0 flex gap-3 py-3 border-t border-arcana-border">
          <button
            onClick={() => {
              useSessionStore.getState().reset();
              useCardAnimationStore.getState().reset();
              router.push("/tarot");
            }}
            className="flex-1 py-2.5 rounded-full bg-arcana-card border border-arcana-border text-sm hover:border-arcana-purple transition-colors"
          >
            새로운 상담
          </button>
          <button
            onClick={() => {
              // 구현 완료: share_token 기반 URL 공유
            }}
            className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-sm hover:opacity-90 transition-opacity"
          >
            결과 공유하기
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/tarot/session/
git commit -m "feat: 타로 상담 세션 페이지 — 캐릭터+카드선택+채팅 하이브리드 UI"
```

---

### Task 15: Pages — Result & Auth & MyPage

**Files:**
- Create: `src/app/tarot/result/[id]/page.tsx`, `src/app/auth/login/page.tsx`, `src/app/mypage/page.tsx`

- [ ] **Step 1: Create result page**

Create `src/app/tarot/result/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeckManager } from "@/services/tarot/deck-manager";
import { spreads } from "@/data/spreads";
import { SpreadType } from "@/types/session";

const deckManager = new DeckManager();

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: reading } = await supabase
    .from("readings")
    .select("*, sessions(*)")
    .eq("share_token", id)
    .single();

  if (!reading) notFound();

  const session = reading.sessions;
  const spread = spreads[session.spread_type as SpreadType];
  const interpretations = reading.card_interpretation as {
    cardId: string;
    position: number;
    interpretation: string;
  }[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-display font-bold text-arcana-purple mb-2">
          타로 리딩 결과
        </h1>
        <p className="text-arcana-muted text-sm">
          {spread?.nameKo} 스프레드 ・{" "}
          {new Date(reading.created_at).toLocaleDateString("ko-KR")}
        </p>
      </div>

      {/* Card Interpretations */}
      <div className="space-y-4 mb-8">
        {interpretations.map((interp) => {
          const card = deckManager.getCardById(interp.cardId);
          const pos = spread?.positions[interp.position];
          return (
            <div
              key={interp.cardId}
              className="bg-arcana-card border border-arcana-border rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-arcana-gold text-sm font-display font-bold">
                  {pos?.labelKo}
                </span>
                <span className="text-arcana-text font-bold">
                  {card?.nameKo}
                </span>
                <span className="text-arcana-muted text-xs">
                  {card?.name}
                </span>
              </div>
              <p className="text-arcana-text text-sm leading-relaxed">
                {interp.interpretation}
              </p>
            </div>
          );
        })}
      </div>

      {/* Overall Reading */}
      <div className="bg-arcana-surface border border-arcana-purple/30 rounded-2xl p-6 mb-4">
        <h2 className="font-display font-bold text-arcana-purple mb-3">
          종합 해석
        </h2>
        <p className="text-arcana-text leading-relaxed">
          {reading.overall_reading}
        </p>
      </div>

      {/* Advice */}
      <div className="bg-arcana-surface border border-arcana-gold/30 rounded-2xl p-6 mb-8">
        <h2 className="font-display font-bold text-arcana-gold mb-3">
          조언
        </h2>
        <p className="text-arcana-text leading-relaxed">{reading.advice}</p>
      </div>

      <div className="text-center">
        <a
          href="/tarot"
          className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-display font-bold hover:opacity-90 transition-opacity"
        >
          나도 타로 상담 받기
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create login page**

Create `src/app/auth/login/page.tsx`:

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const handleLogin = async (provider: "google" | "kakao") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-arcana-purple mb-2">
            로그인
          </h1>
          <p className="text-arcana-muted text-sm">
            리딩 히스토리를 저장하고 관리하세요
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleLogin("google")}
            className="w-full py-3 rounded-xl bg-white text-gray-800 font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <span>G</span>
            Google로 로그인
          </button>

          <button
            onClick={() => handleLogin("kakao")}
            className="w-full py-3 rounded-xl bg-[#FEE500] text-[#191919] font-medium flex items-center justify-center gap-2 hover:bg-[#FDD835] transition-colors"
          >
            <span>💬</span>
            카카오로 로그인
          </button>
        </div>

        <p className="text-arcana-muted text-xs text-center mt-6">
          로그인 없이도 타로 상담을 이용할 수 있습니다
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create auth callback route**

Create `src/app/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
```

- [ ] **Step 4: Create mypage**

Create `src/app/mypage/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, readings(*)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile */}
      <div className="bg-arcana-card border border-arcana-border rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-arcana-purple/20 flex items-center justify-center text-2xl">
            🌙
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">
              {profile?.nickname || "사용자"}
            </h2>
            <p className="text-arcana-muted text-sm">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* Reading History */}
      <h3 className="font-display font-bold text-lg mb-4">리딩 히스토리</h3>

      {!sessions || sessions.length === 0 ? (
        <div className="text-center text-arcana-muted py-12">
          <p className="text-3xl mb-3">🔮</p>
          <p>아직 리딩 기록이 없습니다</p>
          <a
            href="/tarot"
            className="inline-block mt-4 text-arcana-purple hover:underline text-sm"
          >
            첫 타로 상담 시작하기
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const reading = session.readings?.[0];
            return (
              <a
                key={session.id}
                href={
                  reading?.share_token
                    ? `/tarot/result/${reading.share_token}`
                    : "#"
                }
                className="block bg-arcana-card border border-arcana-border rounded-xl p-4 hover:border-arcana-purple transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-arcana-purple text-xs font-display font-bold uppercase">
                      {session.service_type}
                    </span>
                    <span className="text-arcana-muted text-xs ml-2">
                      {session.topic}
                    </span>
                  </div>
                  <span className="text-arcana-muted text-xs">
                    {new Date(session.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                {reading && (
                  <p className="text-arcana-text text-sm mt-2 line-clamp-2">
                    {reading.overall_reading}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/tarot/result/ src/app/auth/ src/app/mypage/
git commit -m "feat: 결과 공유 페이지, 소셜 로그인, 마이페이지 (리딩 히스토리)"
```

---

### Task 16: Final Integration & CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md to reflect implemented structure**

Update `CLAUDE.md` to add the actual dependency versions and any adjustments made during implementation.

- [ ] **Step 2: Full build verification**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify type checking**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Run linter**

```bash
pnpm lint
```

Expected: No lint errors (fix any that appear).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: 최종 통합 — CLAUDE.md 업데이트, 린트 수정"
```
