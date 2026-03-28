#!/bin/bash

# Generate placeholder SVG images for ArcanaInsight

BASE="public/images"

# ─────────────────────────────────────────────
# Card back
# ─────────────────────────────────────────────
cat > "${BASE}/cards/card-back.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a3e"/>
      <stop offset="100%" style="stop-color:#2a2a5e"/>
    </linearGradient>
  </defs>
  <rect width="200" height="300" rx="12" fill="url(#bg)" stroke="#8b5cf6" stroke-width="2"/>
  <rect x="10" y="10" width="180" height="280" rx="8" fill="none" stroke="#6366f1" stroke-width="1" opacity="0.4"/>
  <text x="100" y="130" text-anchor="middle" fill="#8b5cf6" font-size="48" opacity="0.6">✦</text>
  <text x="100" y="165" text-anchor="middle" fill="#6366f1" font-size="11" font-family="serif" letter-spacing="3" opacity="0.5">ARCANA</text>
  <text x="100" y="185" text-anchor="middle" fill="#6366f1" font-size="9" opacity="0.3">· · · · ·</text>
</svg>
SVGEOF

# ─────────────────────────────────────────────
# Helper: create a card SVG
# ─────────────────────────────────────────────
create_card() {
  local filepath="$1"
  local number="$2"
  local name="$3"
  local color="${4:-#f59e0b}"

  cat > "$filepath" << SVGEOF
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a3e"/>
      <stop offset="100%" style="stop-color:#16163a"/>
    </linearGradient>
  </defs>
  <rect width="200" height="300" rx="12" fill="url(#bg)" stroke="${color}" stroke-width="2"/>
  <rect x="8" y="8" width="184" height="284" rx="9" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.3"/>
  <text x="100" y="105" text-anchor="middle" fill="${color}" font-size="44" font-weight="bold" font-family="serif" opacity="0.9">${number}</text>
  <line x1="40" y1="120" x2="160" y2="120" stroke="${color}" stroke-width="0.5" opacity="0.4"/>
  <text x="100" y="148" text-anchor="middle" fill="#e2e8f0" font-size="13" font-family="sans-serif">${name}</text>
  <text x="100" y="270" text-anchor="middle" fill="#8b5cf6" font-size="9" opacity="0.4" letter-spacing="2">ArcanaInsight</text>
</svg>
SVGEOF
}

# ─────────────────────────────────────────────
# Major Arcana (22 cards) — filenames match imageUrl in data
# ─────────────────────────────────────────────
declare -a MAJOR_FILES=(
  "00-fool"
  "01-magician"
  "02-high-priestess"
  "03-empress"
  "04-emperor"
  "05-hierophant"
  "06-lovers"
  "07-chariot"
  "08-strength"
  "09-hermit"
  "10-wheel-of-fortune"
  "11-justice"
  "12-hanged-man"
  "13-death"
  "14-temperance"
  "15-devil"
  "16-tower"
  "17-star"
  "18-moon"
  "19-sun"
  "20-judgement"
  "21-world"
)

declare -a MAJOR_NAMES=(
  "The Fool"
  "The Magician"
  "High Priestess"
  "The Empress"
  "The Emperor"
  "Hierophant"
  "The Lovers"
  "The Chariot"
  "Strength"
  "The Hermit"
  "Wheel of Fortune"
  "Justice"
  "Hanged Man"
  "Death"
  "Temperance"
  "The Devil"
  "The Tower"
  "The Star"
  "The Moon"
  "The Sun"
  "Judgement"
  "The World"
)

for i in $(seq 0 21); do
  slug="${MAJOR_FILES[$i]}"
  name="${MAJOR_NAMES[$i]}"
  num="${slug:0:2}"
  # Create .svg file (data references .webp; we update data separately)
  create_card "${BASE}/cards/major/${slug}.svg" "$((10#$num))" "$name" "#f59e0b"
done

# ─────────────────────────────────────────────
# Minor Arcana (14 cards × 4 suits)
# ─────────────────────────────────────────────
declare -a MINOR_NAMES=("Ace" "Two" "Three" "Four" "Five" "Six" "Seven" "Eight" "Nine" "Ten" "Page" "Knight" "Queen" "King")
declare -a SUITS=("wands" "cups" "swords" "pentacles")
declare -a SUIT_COLORS=("#ef4444" "#3b82f6" "#94a3b8" "#22c55e")
declare -a SUIT_LABELS=("Wands" "Cups" "Swords" "Pentacles")

for s in 0 1 2 3; do
  suit="${SUITS[$s]}"
  color="${SUIT_COLORS[$s]}"
  label="${SUIT_LABELS[$s]}"
  for i in $(seq 0 13); do
    num=$(printf "%02d" $((i+1)))
    name="${MINOR_NAMES[$i]} of ${label}"
    create_card "${BASE}/cards/${suit}/${num}.svg" "$((i+1))" "$name" "$color"
  done
done

# ─────────────────────────────────────────────
# Helper: create character expression SVGs
# ─────────────────────────────────────────────
create_character() {
  local dir="$1"
  local char_name="$2"
  local color="$3"

  declare -a MOODS=("default" "smile" "serious" "surprised" "wink" "mystical")
  declare -a MOOD_SYMBOLS=("◈" "◉" "▲" "◎" "◇" "✦")
  declare -a MOOD_LABELS=("Default" "Smile" "Serious" "Surprised" "Wink" "Mystical")

  for m in 0 1 2 3 4 5; do
    mood="${MOODS[$m]}"
    symbol="${MOOD_SYMBOLS[$m]}"
    mood_label="${MOOD_LABELS[$m]}"

    cat > "${BASE}/characters/${dir}/${mood}.svg" << SVGEOF
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320" viewBox="0 0 256 320">
  <defs>
    <linearGradient id="charBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#12122a"/>
      <stop offset="100%" style="stop-color:#1a1a3e"/>
    </linearGradient>
  </defs>
  <rect width="256" height="320" rx="16" fill="url(#charBg)" stroke="${color}" stroke-width="2"/>
  <rect x="8" y="8" width="240" height="304" rx="12" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.3"/>
  <circle cx="128" cy="120" r="54" fill="${color}" opacity="0.08"/>
  <circle cx="128" cy="120" r="54" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>
  <text x="128" y="136" text-anchor="middle" fill="${color}" font-size="52" opacity="0.7">${symbol}</text>
  <line x1="40" y1="180" x2="216" y2="180" stroke="${color}" stroke-width="0.5" opacity="0.3"/>
  <text x="128" y="210" text-anchor="middle" fill="${color}" font-size="18" font-weight="bold" font-family="sans-serif">${char_name}</text>
  <text x="128" y="234" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">${mood_label}</text>
  <text x="128" y="300" text-anchor="middle" fill="#8b5cf6" font-size="9" opacity="0.4" letter-spacing="2">ArcanaInsight</text>
</svg>
SVGEOF
  done
}

create_character "arcana"   "아르카나" "#8b5cf6"
create_character "miko"     "미코"     "#ef4444"
create_character "seonhwa"  "선화"     "#ec4899"
create_character "hoshi"    "호시"     "#f59e0b"

echo "All placeholder SVGs created successfully."
