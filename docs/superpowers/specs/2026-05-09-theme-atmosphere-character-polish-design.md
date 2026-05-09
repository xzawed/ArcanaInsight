# Theme Atmosphere and Character Edge Polish Design

Date: 2026-05-09

## Goals

- Make transparent character cutouts read sharper and more intentional after background removal.
- Add richer theme-specific atmosphere so each selected theme changes the emotional texture of the page, not just colors.
- Keep effects decorative, accessible, and mobile-conscious.

## Character Edge Treatment

- Keep source PNG assets unchanged.
- Apply subtle CSS edge support in the shared character renderer instead of creating harsh outlines.
- Stabilize moving image layers with compositor-friendly styles.
- Reduce sprite-level blur where it makes transparent antialiasing look hazy, while keeping aura and glow in surrounding layers.
- Treat the static character profile page separately because it bypasses `CharacterDisplay`.

## Theme Atmosphere

Seven existing themes map to distinct ambient effects:

- `midnight`: small stars, constellation shimmer, deep lunar haze.
- `dawn`: pale mist and soft aurora-like dawn light.
- `sunset`: warm horizon rays and golden dust.
- `spring`: drifting cherry petals.
- `summer`: firefly glints and night-sky sparkle.
- `autumn`: falling leaves and ember-like dust.
- `winter`: slow snow and frost glow.

The implementation should use deterministic decorative layers, avoid random SSR output, and respect reduced motion.

## Integration

- Add a central theme atmosphere config under `src/components/effects/`.
- Reuse it from home/service/background effect components.
- Preserve service identity for tarot/saju/shinjeom while letting active theme add a secondary atmosphere.
- Keep all atmospheric layers `pointer-events-none` and `aria-hidden`.

## Verification

- Run `pnpm lint`, `pnpm type-check`, `pnpm build`, and doc link checks.
- Use the local browser to inspect at least the home hero and Arcana preview/profile area across multiple themes.
- Check console output for new errors.
