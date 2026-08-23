# 🔮 ArcanaInsight

<p align="right"><a href="README.md">🇰🇷 한국어</a></p>

> [!IMPORTANT]
> **🛑 Service Closure Notice**
>
> ArcanaInsight shuts down on **August 31, 2026 at 24:00 (KST)**.
> On **September 1, 2026** all account data, reading records, and Saju inputs (date and time of birth, and similar) will be **permanently deleted beyond recovery**.
>
> - If there are readings you want to keep, save them before closure using the share button on each result page.
> - Deleted data cannot be restored, reissued, or transferred, and every share link issued will stop working.
> - In-app notice: [/notice](https://arcanainsight-production.up.railway.app/notice)
> - Closure, deletion, and repository shutdown runbook: [`docs/operations/service-shutdown.md`](docs/operations/service-shutdown.md)
>
> After closure this repository will be made **Private and archived** (not deleted).

> **A fortune-telling platform where you converse with anime-style characters for tarot readings, Four Pillars analysis, and spiritual consultations**
> **Available in 3 locales** (한국어 · English · 日本語) — switched automatically via the `ai_locale` cookie

<p align="center">
  <img src="public/images/backgrounds/hero-bg.jpg" alt="ArcanaInsight Hero" width="100%" style="border-radius:12px" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/status-Closing%202026--08--31-critical?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/%E2%9A%9B%EF%B8%8F%20Frontend-Next.js%2016%20%2B%20React%2019-61DAFB?style=for-the-badge&labelColor=20232a" alt="Frontend" />
  <img src="https://img.shields.io/badge/%F0%9F%97%84%EF%B8%8F%20Backend-Node.js%20%2B%20Supabase-3ECF8E?style=for-the-badge&labelColor=1a1a2e" alt="Backend" />
  <img src="https://img.shields.io/badge/%F0%9F%A4%96%20AI-xAI%20Grok%20%2B%20Claude-FF6B35?style=for-the-badge&labelColor=1a1a2e" alt="AI" />
</p>
<p align="center">
  <a href="https://sonarcloud.io/summary/new_code?id=xzawed_ArcanaInsight"><img src="https://sonarcloud.io/api/project_badges/measure?project=xzawed_ArcanaInsight&metric=alert_status" alt="Quality Gate" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=xzawed_ArcanaInsight"><img src="https://sonarcloud.io/api/project_badges/measure?project=xzawed_ArcanaInsight&metric=coverage" alt="Coverage" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=xzawed_ArcanaInsight"><img src="https://sonarcloud.io/api/project_badges/measure?project=xzawed_ArcanaInsight&metric=bugs" alt="Bugs" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=xzawed_ArcanaInsight"><img src="https://sonarcloud.io/api/project_badges/measure?project=xzawed_ArcanaInsight&metric=security_rating" alt="Security Rating" /></a>
  <a href="https://codecov.io/gh/xzawed/ArcanaInsight"><img src="https://codecov.io/gh/xzawed/ArcanaInsight/branch/main/graph/badge.svg" alt="Codecov" /></a>
</p>

<p align="center">
  <a href="https://arcanainsight-production.up.railway.app"><strong>🌐 Live Demo</strong></a> <sub>(closing 2026-08-31)</sub> &nbsp;·&nbsp;
  <a href="CLAUDE.md"><strong>🤖 Dev Guide</strong></a> &nbsp;·&nbsp;
  <a href="e2e/README.md"><strong>🧪 E2E Guide</strong></a>
</p>

---

## ✨ Introduction

ArcanaInsight is a web application where users have natural conversations with **12 uniquely-voiced anime-style characters** to receive fortune-telling services. Grok AI (xAI) delivers tarot interpretations, Four Pillars analysis, and spiritual consultations via **real-time SSE streaming**, with each character presenting results in their own distinct voice.

### Why ArcanaInsight?

| | Feature |
|---|---|
| 🎭 **12 distinct characters** | From mysterious witches to solemn shrine maidens to mischievous tricksters — the same reading feels entirely different depending on who delivers it |
| 🎯 **Direct answer** | Instead of listing every possibility, the reading commits to the most likely direction for your question first (answer-first) |
| 💬 **Plain-language contract** | Fortune-telling jargon is explained in plain words on the spot, so anyone understands it at a glance |
| ⚡ **Real-time SSE streaming** | AI responses appear character by character in a typing animation, creating the feel of a live consultation |
| 🔄 **Dual AI fallback** | If the Grok API goes down, Claude API takes over automatically — users experience zero interruption |

---

## 🎯 Key Features

### 🎴 Tarot Reading (5 steps)

1. **Character selection** — Choose from 12 consultants (gender filter supported)
2. **Topic selection** — Pick one of 6 topics
3. **Spread selection** — Build a spread suited to the topic, and optionally type your own question
4. **Personal info entry** — Name · date of birth · gender · birth time · MBTI (optional)
5. **Card draw + AI reading** — Grok AI interprets in real time + shareable link

**🃏 6 Topics**: Love (Single) · Love (Couple) · Career / Path · Finance / Money · Health · General

**🔢 10 Spread types**

| Spread | Cards | Spread | Cards |
|--------|-------|--------|-------|
| One Card | 1 | Relationship Spread | 7 |
| Past / Present / Future | 3 | Horseshoe Spread | 7 |
| Simplified Celtic Cross | 5 | Decision Making Spread | 5 |
| Celtic Cross | 10 | Week Ahead Spread | 7 |
| — | — | Zodiac Wheel Spread | 12 |
| — | — | Tree of Life Spread | 10 |

---

### 🔮 Four Pillars (Saju) Reading (4 steps)

1. **Character selection** — Choose from 12 consultants (gender filter supported)
2. **Personal info entry** — Name · date of birth · gender · birth time · MBTI (optional)
3. **Time range × analysis domain** — Select both simultaneously; year-range options include a monthly breakdown toggle
4. **AI reading result** — Grok AI analyzes in real time + shareable link

**⏱️ 7 Time ranges**

| Range | Monthly detail | Range | Monthly detail |
|-------|----------------|-------|----------------|
| This week | — | Next year | ✓ |
| This month | — | 3 years | ✓ |
| This year | ✓ | 5 years | ✓ |
| — | — | Full Destiny | — |

**🎯 8 Analysis domains**: Overall · Love (Single) · Love (Couple) · Career & Wealth · Health · Personality & Aptitude · Compatibility · Auspicious Date

---

### 🌙 Spiritual Consultation (Shinjeom) (4 steps)

1. **Character selection** — Choose from 12 consultants (gender filter supported)
2. **Topic selection** — Overall Fortune · Love & Compatibility · Wealth & Business · Career & Job Change · Health & Protection · Auspicious Date
3. **Personal info entry** — Name · date of birth · gender · birth time · MBTI (optional)
4. **Conversational session** — Unlimited Q&A, then tap "Get Shinjeom result" to close the session (button activates after the first exchange)

---

### 👥 Character System

12 characters each offer consultations with a unique personality and speaking style. A gender filter helps users find their preferred consultant quickly. Each character has 6 expressions: default · smile · serious · surprised · wink · mystical.

**✨ Female Characters (6)**

| Character | Style | Speaking style |
|-----------|-------|----------------|
| 🌙 Arcana | Mysterious witch | Soft and enigmatic |
| ⛩️ Miko | Solemn shrine maiden | Calm and formal |
| 🌸 Seonhwa | Graceful celestial being | Elegant and warm |
| ⭐ Hoshi | Cheerful star spirit | Bright and casual |
| 🌕 Luna | Warm lunar guardian | Gentle and comforting |
| ❄️ Rei | Cool-headed analyst | Short and razor-sharp |

**🌟 Male Characters (6)**

| Character | Style | Speaking style |
|-----------|-------|----------------|
| 🎩 Cairn | Aristocratic gentleman | Formal and courteous |
| 🖤 Zero | Mysterious romantic | Poetic and low-key |
| ☀️ Haru | Warm sunlight | Friendly and encouraging |
| 🪷 Ren | Tranquil sage | Archaic and literary |
| 💚 Lix | Mischievous trickster | Playful and teasing |
| 📚 Ethan | Scholarly analyst | Detailed and thorough |

---

### 🎁 Additional Features

- 🎨 **6 card skin themes** — Gold Luxury · Dark Gothic · Celestial Mystic · Pastel Dream · Neon Cyberpunk · Emerald Enchant
- 🖌️ **4 card art styles** — Dark Fantasy · Art Nouveau · Anime Mystical · Modern Digital (auto-selected per theme, manually overridable)
- 📅 **Daily Card** — Per-character daily fortune with tab switching + card-flip animation
- 🌈 **7 dynamic themes** — Auto-detects time of day and season, or set manually
- 🔐 **Social login** — Google account (Supabase Auth / NextAuth.js)
- 📚 **My Page** — Unified history for tarot, saju & shinjeom readings + preferred consultant setting
- 🔗 **Result sharing** — Share via URL link or copy to clipboard

---

## 🚀 Quick Start

**Prerequisites** — Node.js 20+, pnpm 10.33.0 (run `corepack enable` to set it up)

```bash
# 1. Clone
git clone https://github.com/xzawed/ArcanaInsight.git
cd ArcanaInsight

# 2. Prepare pnpm, then install dependencies
corepack enable
pnpm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local:
#   GROK_API_KEY=                    # xAI API key (required)
#   ANTHROPIC_API_KEY=               # Claude fallback key (optional; fallback is off without it)
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   SUPABASE_SERVICE_ROLE_KEY=
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 4. Start dev server
pnpm dev
# → Open http://localhost:3000
```

> 🔑 Get your Grok API key at [xAI Console](https://console.x.ai).
> 📖 The full environment variable reference is [docs/operations/env-variables.md](docs/operations/env-variables.md). Production deployments also need the image CDN origin (`NEXT_PUBLIC_ASSET_BASE_URL`).

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| 🗣️ Language | TypeScript (strict) |
| ⚛️ Framework | Next.js 16.2.11 (App Router) · React 19.2.4 |
| 🎨 Styling | Tailwind CSS v4 (`@theme` CSS-based config) |
| 🎬 Animation | Framer Motion v12.38 |
| 🤖 AI | Grok API (xAI) — SSE streaming · Claude API (Anthropic) auto-fallback |
| 🔐 Auth | Supabase Auth (`@supabase/ssr`) — Google sign-in · NextAuth.js v5 when `DB_PROVIDER=postgres` |
| 🗄️ Database | Supabase (PostgreSQL) · Drizzle ORM (on-premises switchover support) |
| 📦 State | Zustand v5 |
| 📦 Package manager | pnpm 10.33.0 |
| 🚀 Hosting | Railway (auto-deploy via GitHub Actions) |
| 🧪 E2E Tests | Playwright — 27 files, ~197 tests per device (Desktop · Android · iOS) · [Guide](./e2e/README.md) |

### 🤖 AI-Native Development

This project is built with an **AI-native approach** where AI acts as a genuine development partner.

| Role | AI | Responsibility |
|------|----|----------------|
| 🧠 Code · QA · Deployment | **Claude CLI** (Anthropic) | Planning · implementation · review · CI · CLAUDE.md maintenance |
| ⚡ Production AI | **Grok API** (xAI) | Tarot · saju · shinjeom readings (auto-fallback to Claude API on failure) |
| 🖼️ Image generation | **Replicate** (offline pipeline) | Pre-generated card art, service backgrounds, character images |
| 🔄 Ops automation | **n8n Cloud** | Spec tracking · quality monitoring · weekly reports |
| 🚀 CI/CD | **GitHub Actions + Railway** | PR CI → weekly QA → auto-recheck loop |

> 📘 Full code change process: [docs/workflow/code-change-process.md](docs/workflow/code-change-process.md)

---

## 🏗️ Architecture Highlights

### 🔌 DB Provider Abstraction
A single `DB_PROVIDER` environment variable switches **instantly between Supabase and on-premises PostgreSQL**. The `getDb()` factory selects the adapter, while all API route logic remains unchanged. Rollback requires only a Railway environment variable change.

### 🎯 AI Fallback Pattern
`FallbackProvider` calls **Grok first, then automatically falls back to Claude API** on failure. Rate limit (429), server error (500), and auth failure (401) each trigger different cooldown durations for optimal recovery. The error surface is only shown to the user if both providers fail.

### 📡 SSE Streaming
The `/api/tarot/reading`, `/api/saju/reading`, and `/api/shinjeom/message` endpoints stream AI responses via **Server-Sent Events**. On the client, `fetchSSEStream()` renders each token as a typing animation. (The Daily Card endpoint, `/api/daily-card`, is not streamed — it returns a single JSON response.)

> 📖 Full architecture details: [docs/architecture/system-overview.md](docs/architecture/system-overview.md)

---

## 🖼️ Image Asset Specifications

### Character Images

All 12 characters use `nukki-enhanced/` high-resolution cutout images in the production UI. **The 2816×1536 size is 2x the 1408×768 color source — an intentional spec for high-DPI large displays (the character detail page renders at 100vw on mobile); do not downscale.** The source/backup folders (`nukki/`, `nukki/backup-v2/`) were removed from the repository (#447) to save space, so only `nukki-enhanced/` remains.

| Item | Spec |
|------|------|
| Production (only display path) | **2816×1536** RGB — `/images/characters/{id}/nukki-enhanced/{mood}.png` |
| Color source original (kept off-repo) | **1408×768** RGB |
| Expressions | **6 moods** — default · smile · serious · surprised · wink · mystical<br>※ The `default` mood is stored as `idle.png` |

### Edge Transparency (CSS mask)

Applied automatically when using the `CharacterDisplay` component.

| Direction | Opaque transition starts at |
|-----------|----------------------------|
| Top | 14% |
| Bottom | 18% |
| Left / Right | 10% |

---

## 🧪 Development Commands

```bash
pnpm dev           # 🚀 Dev server
pnpm build         # 📦 Production build
pnpm start         # ▶️  Production server
pnpm lint          # 🔍 ESLint
pnpm type-check    # ✅ TypeScript type check
pnpm test          # 🧪 Unit tests (Vitest + coverage)
pnpm test:e2e      # 🎭 E2E tests (Desktop/Android/iOS)
pnpm test:e2e:ui   # 🖥️  Playwright UI mode (visual debug)
```

> ⚠️ **Windows**: E2E tests must run inside Docker (Linux container). See [e2e/README.md](e2e/README.md) for details.

---

## 👥 Development & Operations

| Role | Owner | Description |
|------|-------|-------------|
| 🎨 Product planning / design | SuperGrok (xAI) | Feature planning, UX/UI discussion, spec finalization |
| ⚡ Production AI | SuperGrok (xAI) | Grok API tarot · saju · shinjeom readings |
| ⚙️ Code implementation / QA | Claude CLI (Anthropic) | Runs the code change process, Playwright E2E, weekly QA |
| 🚀 CI/CD + deployment | Claude CLI (Anthropic) | GitHub Actions → Railway auto-deploy |
| 📊 Operations analytics | SuperGrok (xAI) | User behavior analysis, reading quality monitoring |

The 7-step development process lives in [docs/workflow/code-change-process.md](docs/workflow/code-change-process.md); the full operations system is in [CLAUDE.md](./CLAUDE.md).

---

## 📄 Documentation & Links

| Document | Contents |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Full dev guide (architecture · conventions · operations) |
| [docs/README.md](docs/README.md) | Documentation index — architecture, conventions, operations, workflow |
| [docs/workflow/code-change-process.md](docs/workflow/code-change-process.md) | The 7-step code change process (branches · commit prefixes · PR flow) |
| [docs/operations/env-variables.md](docs/operations/env-variables.md) | Full environment variable reference and switchover steps |
| [e2e/README.md](e2e/README.md) | E2E test execution · conventions · failure handling |

| Service | URL |
|---------|-----|
| 🌐 Live Demo | [arcanainsight-production.up.railway.app](https://arcanainsight-production.up.railway.app) — **closes 2026-08-31 24:00 KST** |
| 🔄 n8n Automation | [xzawed.app.n8n.cloud](https://xzawed.app.n8n.cloud) |

---

## 📄 License

This project is open source, released under the **[MIT License](LICENSE)**.

You are free to use, modify, and distribute this software. Please include the copyright notice and the full license text in any copies or substantial portions of the software.

© 2026 **xzawed**
