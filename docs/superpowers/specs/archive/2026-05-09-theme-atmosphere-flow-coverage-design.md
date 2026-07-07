# Theme Atmosphere Flow Coverage Design

Date: 2026-05-09

## Root Cause

The theme atmosphere system existed, but coverage was uneven:

- `/tarot`, `/saju`, and `/shinjeom` entry pages received theme atmosphere only through `ServiceBackground`, with a low service opacity that made the effect easy to miss.
- `/character/[id]`, which also works as a counselor/service selection screen, still used only a static background plus generic particles.
- Tarot, saju, and shinjeom session pages used `MysticBackground` but did not render active-theme atmosphere.

## Fix Direction

- Make `ThemeAtmosphere` testable with stable `data-testid`, theme, and intensity attributes.
- Increase service-page atmosphere intensity enough to be visible while preserving service-specific backgrounds.
- Add theme atmosphere to `/character/[id]`.
- Add low-intensity ambient theme atmosphere to tarot, saju, and shinjeom session pages.
- Add Playwright structural coverage for counselor selection, category selection, and tarot spread selection steps.

## Verification Strategy

Visual effects should not rely on screenshot diffs. The regression test checks that:

- A fixed service background exists.
- The expected atmosphere layer is attached.
- The layer carries the active theme id.
- Decorative particle nodes render under the atmosphere layer.
- The layer persists after step transitions.

Manual browser review remains useful for judging taste/readability after the structural test proves the effect is wired.
