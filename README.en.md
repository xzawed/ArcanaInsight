# 🔮 ArcanaInsight

<p align="right"><a href="README.md">🇰🇷 한국어</a></p>

> **A fortune-telling platform where you converse with anime-style characters for tarot readings, Four Pillars analysis, and spiritual consultations**

<p align="center">
  <img src="public/images/backgrounds/hero-bg.jpg" alt="ArcanaInsight Hero" width="100%" style="border-radius:12px" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/status-v1.0.0%20Live-brightgreen?style=for-the-badge" alt="Status" />
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
  <a href="https://arcanainsight-production.up.railway.app"><strong>🌐 Live Demo</strong></a> &nbsp;·&nbsp;
  <a href="CLAUDE.md"><strong>🤖 Dev Guide</strong></a> &nbsp;·&nbsp;
  <a href="e2e/README.md"><strong>🧪 E2E Guide</strong></a>
</p>

---

## ✨ Introduction

ArcanaInsight is a web application where users have natural conversations with **12 uniquely-voiced anime-style characters** to receive fortune-telling services. Grok AI (xAI) delivers tarot interpretations and Four Pillars astrology analysis via **real-time SSE streaming**, with each character presenting results in their own distinct voice.

### Why ArcanaInsight?

| | Feature |
|---|---|
| 🎭 **12 distinct characters** | From mysterious witches to solemn shrine maidens to mischievous tricksters — the same reading feels entirely different depending on who delivers it |
| ⚡ **Real-time SSE streaming** | AI responses appear character by character in a typing animation, creating the feel of a live consultation |
| 🔄 **Dual AI fallback** | If the Grok API goes down, Claude API takes over automatically — users experience zero interruption |

---

## 🎯 Key Features

### 🎴 Tarot Reading (4 steps)

1. **Character selection** — Choose from 12 consultants (gender filter supported)
2. **Personal info entry** — Date of birth · birth hour · gender · blood type
3. **Topic selection + card draw** — Choose from 7 topics, then build a spread
4. **AI reading result** — Grok AI interprets in real time + shareable link

**🃏 7 Topics**: Love (all) · Love (single) · Love (couple) · Finance · Career · Health · General

**🔢 10 Spread types**

| Spread | Cards | Spread | Cards |
|--------|-------|--------|-------|
| One Card | 1 | Relationship Spread | 7 |
| Past · Present · Future | 3 | Horseshoe Spread | 7 |
| Simplified Celtic Cross | 5 | Decision Spread | 5 |
| Celtic Cross | 10 | Week Ahead | 7 |
| — | — | Zodiac Wheel | 12 |
| — | — | Tree of Life | 10 |

---

### 🔮 Four Pillars (Saju) Reading (4 steps)

1. **Character selection** — Choose from 12 consultants (gender filter supported)
2. **Personal info entry** — Date of birth · birth hour · gender · blood type
3. **Time range × analysis domain** — Select both simultaneously; year-range options include a monthly breakdown toggle
4. **AI reading result** — Grok AI analyzes in real time + shareable link

**⏱️ 7 Time ranges**

| Range | Monthly detail | Range | Monthly detail |
|-------|----------------|-------|----------------|
| This week | — | Next year | ✓ |
| This month | — | 3 years | ✓ |
| This year | ✓ | 5 years | ✓ |
| — | — | Full life fortune | — |

**🎯 8 Analysis domains**: Overall · Love (single) · Love (couple) · Career & wealth · Health · Personality & aptitude · Compatibility · Auspicious dates

---

### 🌙 Spiritual Consultation (Shinjeom) (3 steps)

1. **Character selection** — Choose from 12 consultants (gender filter supported)
2. **Topic selection** — Fortune overview · Love/compatibility · Wealth/business · Career/transfer · Health/warding · Auspicious dates
3. **Conversational session** — Unlimited Q&A, then tap "Get Reading" to close the session (button activates after the first exchange)

---

### 👥 Character System

12 characters each offer consultations with a unique personality and speaking style. A gender filter helps users find their preferred consultant quickly. Each character has 6 expressions: default · smile · serious · surprised · wink · mystical.

**✨ Female Characters (6)**

| Character | Style | Speaking style |
|-----------|-------|----------------|
| 🌙 Arcana | Mysterious witch | Soft and enigmatic |
| ⛩️ Miko | Solemn shrine maiden | Calm and formal |
| 🌸 Seonhwa | Graceful celestial being | Elegant and warm |
| ⭐ Hoshi | Cheerful star spirit | Casual with emoji |
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

- 🎨 **6 card skin themes** — Gold Luxury · Dark Gothic · Celestial Mystic · Pastel Dream · Neon Cyber · Emerald Enchant
- 📅 **Daily Card** — Per-character daily fortune with tab switching + card-flip animation
- 🌈 **7 dynamic themes** — Auto-detects time of day and season, or set manually
- 🔐 **Social login** — Google account (Supabase Auth / NextAuth.js)
- 📚 **My Page** — Unified history for tarot & saju readings + preferred consultant setting
- 🔗 **Result sharing** — Share via URL link or copy to clipboard

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/xzawed/ArcanaInsight.git
cd ArcanaInsight

# 2. Install dependencies (pnpm required)
pnpm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local:
#   GROK_API_KEY=          # xAI API key (required)
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   SUPABASE_SERVICE_ROLE_KEY=
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 4. Start dev server
pnpm dev
# → Open http://localhost:3000
```

> 🔑 Get your Grok API key at [xAI Console](https://console.x.ai).
> 📖 Full environment variable reference: [CLAUDE.md](CLAUDE.md#환경-변수)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| 🗣️ Language | TypeScript (strict) |
| ⚛️ Framework | Next.js 16.2.3 (App Router) · React 19.2.4 |
| 🎨 Styling | Tailwind CSS v4 (`@theme` CSS-based config) |
| 🎬 Animation | Framer Motion v12.38 |
| 🤖 AI | Grok API (xAI) — SSE streaming · Claude API (Anthropic) auto-fallback |
| 🔐 Auth | Supabase Auth Helpers (Google) |
| 🗄️ Database | Supabase (PostgreSQL) · Drizzle ORM (on-premises switchover support) |
| 📦 State | Zustand v5 |
| 📦 Package manager | pnpm 10.33.0 |
| 🚀 Hosting | Railway (auto-deploy via GitHub Actions) |
| 🧪 E2E Tests | Playwright — 19 files, 141 tests (Desktop · Android · iOS) · [Guide](./e2e/README.md) |

### 🤖 AI-Native Development

This project is built with an **AI-native approach** where AI acts as a genuine development partner.

| Role | AI | Responsibility |
|------|----|----------------|
| 🧠 Code · QA · Deployment | **Claude CLI** (Anthropic) | Planning · implementation · review · CI · CLAUDE.md maintenance |
| ⚡ Production AI | **Grok API** (xAI) | Tarot/saju readings + character image generation |
| 🔄 Ops automation | **n8n Cloud** | Spec tracking · quality monitoring · weekly reports |
| 🚀 CI/CD | **GitHub Actions + Railway** | PR CI → weekly QA → auto-recheck loop |

> 📘 Full AI collaboration structure: [CLAUDE.md — Operations](CLAUDE.md#운영-체계--supergrok--claude-cli-역할-분담)

---

## 🏗️ Architecture Highlights

### 🔌 DB Provider Abstraction
A single `DB_PROVIDER` environment variable switches **instantly between Supabase and on-premises PostgreSQL**. The `getDb()` factory selects the adapter, while all API route logic remains unchanged. Rollback requires only a Railway environment variable change.

### 🎯 AI Fallback Pattern
`FallbackProvider` calls **Grok first, then automatically falls back to Claude API** on failure. Rate limit (429), server error (500), and auth failure (401) each trigger different cooldown durations for optimal recovery. The error surface is only shown to the user if both providers fail.

### 📡 SSE Streaming
`/api/tarot/reading`, `/api/saju/reading`, and `/api/daily-card` endpoints stream AI responses via **Server-Sent Events**. The client-side `useSSEStream` hook renders each token as a typing animation.

> 📖 Full architecture details: [CLAUDE.md](CLAUDE.md#핵심-아키텍처-패턴)

---

## 🖼️ Image Asset Specifications

### Character Images

10 characters use PNG cutout (nukki) images; 2 characters (miko · seonhwa) use legacy JPG paths.

| Item | Spec |
|------|------|
| Size | **1408×768** (grok-imagine-image-pro API default output) |
| Format (10 chars) | PNG (transparent background) — `/images/characters/{id}/nukki/{mood}.png` |
| Format (miko · seonhwa) | JPG (legacy) — `/images/characters/{id}/{mood}.jpg` |
| Expressions | default · smile · serious · surprised · wink · mystical |

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
pnpm test:e2e      # 🎭 E2E tests (Desktop/Android/iOS)
pnpm test:e2e:ui   # 🖥️  Playwright UI mode (visual debug)
```

> ⚠️ **Windows**: E2E tests must run inside Docker (Linux container). See [e2e/README.md](e2e/README.md) for details.

---

## 👥 Development & Operations

| Role | Owner | Description |
|------|-------|-------------|
| 🎨 Product planning / design | SuperGrok (xAI) | Feature planning, UX/UI discussion, spec finalization |
| ⚡ Production AI | SuperGrok (xAI) | Grok API tarot/saju readings + image generation |
| ⚙️ Code implementation / QA | Claude CLI (Anthropic) | 7-step process, Playwright E2E, weekly QA |
| 🚀 CI/CD + deployment | Claude CLI (Anthropic) | GitHub Actions → Railway auto-deploy |
| 📊 Operations analytics | SuperGrok (xAI) | User behavior analysis, reading quality monitoring |

Full operations system and 7-step development process: [CLAUDE.md](./CLAUDE.md)

---

## 📄 Documentation & Links

| Document | Contents |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Full dev guide (architecture · conventions · operations) |
| [e2e/README.md](e2e/README.md) | E2E test execution · conventions · failure handling |

| Service | URL |
|---------|-----|
| 🌐 Live Demo | [arcanainsight-production.up.railway.app](https://arcanainsight-production.up.railway.app) |
| 🔄 n8n Automation | [xzawed.app.n8n.cloud](https://xzawed.app.n8n.cloud) |

---

## 📄 License

This project is open source, released under the **[MIT License](LICENSE)**.

You are free to use, modify, and distribute this software. Please include the copyright notice and the full license text in any copies or substantial portions of the software.

© 2026 **xzawed**
