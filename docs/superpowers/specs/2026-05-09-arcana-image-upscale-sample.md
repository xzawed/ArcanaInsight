# All Character Image Upscale Enhancement

Date: 2026-05-09

## Scope

- Original character PNG files remain unchanged in `public/images/characters/[id]/nukki/`.
- A non-destructive 2x enhanced set exists for all 12 characters in `public/images/characters/[id]/nukki-enhanced/`.
- The enhanced set keeps the same illustration, pose, expression, canvas, and transparent cutout silhouette.
- Production character image references now use `nukki-enhanced`.

## Method

- Resized every PNG to exactly `2x` its source dimensions.
- Current source assets are mixed-size (`1408 x 768` and `677 x 369`), so enhanced dimensions follow each source file.
- Resized color with premultiplied alpha so transparent-edge RGB does not bleed into the cutout.
- Preserved alpha exactly from the Lanczos-upscaled source alpha.
- Reduced weathered pixel texture with low-radius surface smoothing in flat color areas.
- Protected hair, eye, clothing, and alpha edges with a Sobel-derived edge mask.
- Applied mild edge-only detail restoration instead of global sharpening.

## Validation

- Enhanced dimensions are exactly `2x` for every character sample.
- All enhanced files remain `RGBA` PNGs.
- Alpha mismatch against the 2x source alpha is `0%`.
- Alpha bounding box drift and alpha center-of-mass drift are `0`.
- Luma edge ratio remains close to source-scale detail, preserving line identity while reducing noisy surface texture.

## Local Preview

Run `pnpm dev` and open:

```text
http://localhost:3000/dev/arcana-image-quality
```

The all-character preview is also available at:

```text
http://localhost:3000/dev/character-image-quality
```

The preview compares original and enhanced files side by side across all characters and mood samples.

## Production Note

Production UI paths now point at `nukki-enhanced`; the original `nukki` folder remains available for comparison and rollback.
