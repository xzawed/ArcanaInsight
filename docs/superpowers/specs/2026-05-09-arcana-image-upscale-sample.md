# Arcana Image Upscale Sample

Date: 2026-05-09

## Scope

- Original Arcana character PNG files remain unchanged in `public/images/characters/arcana/nukki/`.
- A non-destructive 2x sample set was added in `public/images/characters/arcana/nukki-enhanced/`.
- The sample keeps the same illustration, pose, expression, and transparent cutout silhouette.

## Method

- Resized PNGs from `1408 x 768` to `2816 x 1536`.
- Resized color with premultiplied alpha so transparent-edge RGB does not bleed into the cutout.
- Preserved alpha exactly from the Lanczos-upscaled source alpha.
- Reduced weathered pixel texture with low-radius surface smoothing in flat color areas.
- Protected hair, eye, clothing, and alpha edges with a Sobel-derived edge mask.
- Applied mild edge-only detail restoration instead of global sharpening.

## Validation

- Enhanced dimensions are exactly `2x` for every Arcana sample.
- All enhanced files remain `RGBA` PNGs.
- Alpha mismatch against the 2x source alpha is `0%`.
- Alpha bounding box drift and alpha center-of-mass drift are `0`.
- Luma edge ratio stays within `0.987 - 0.996`, preserving line identity while reducing noisy surface texture.

## Local Preview

Run `pnpm dev` and open:

```text
http://localhost:3000/dev/arcana-image-quality
```

The preview compares the original and enhanced Arcana files side by side for idle, smile, serious, surprised, wink, and mystical samples.

## Production Note

This PR does not switch production character paths to the enhanced assets yet. After visual approval, the same process can be applied to the remaining characters and the app can be updated to reference the enhanced set.
