# Arcana Character Effect Browser Review

Date: 2026-05-09

## Scope

- Reviewed `CharacterDisplay`, `CharacterAnimationLayer`, and `SpriteAnimator`.
- Added a local-only preview route at `/dev/arcana-effects`.
- The preview uses the production Arcana character data and the same rendering stack as tarot/saju/shinjeom screens.

## Findings

- `SpriteAnimator` already applies visible expression swaps and idle motion.
- `GlowOverlay`, `EyeBlinkLayer`, `CharacterAuraLayer`, and `GlowBurstRing` are visible overlays around the sprite.
- The old mood animation layer rendered an empty animated overlay. It did not wrap the sprite, so smile/surprised/wink/serious motion was not visibly moving Arcana.
- Character profile pages still use a static image. The preview route exists to verify the animated stack directly without changing the public profile page layout.
- The global CSP blocked the existing Google Fonts stylesheet. The CSP now allows the configured Google font CSS and font files, and permits React development eval only in local development.

## Preview Effects

- `default`: idle float, soft radial glow, periodic blink overlay.
- `smile`: expression swap plus a light scale pulse on the full character.
- `serious`: expression swap plus a small upward settle motion.
- `surprised`: expression swap plus a quick pop and settle bounce.
- `wink`: expression swap plus a short playful scale pulse.
- `mystical`: mystical expression, faster aura glow, idle float, and blink overlay.

## Local URL

Run `pnpm dev` and open:

```text
http://localhost:3000/dev/arcana-effects
```

Browser check result:

- Preview route rendered with Arcana.
- Mood buttons switched the visible expression sample.
- Console had 0 errors after the CSP update. One existing Next image aspect-ratio warning remains from the theme icon.
