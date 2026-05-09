# Arcana Image Upscale Sample

Date: 2026-05-09

## Scope

- Original Arcana character PNG files remain unchanged in `public/images/characters/arcana/nukki/`.
- A non-destructive 2x sample set was added in `public/images/characters/arcana/nukki-enhanced/`.
- The sample keeps the same illustration, pose, expression, and transparent cutout silhouette.

## Method

- Resized RGBA PNGs from `1408 x 768` to `2816 x 1536` with Lanczos resampling.
- Applied a light unsharp mask and subtle contrast adjustment to the color layer.
- Preserved transparency while slightly cleaning the semi-transparent edge alpha.

## Local Preview

Run `pnpm dev` and open:

```text
http://localhost:3000/dev/arcana-image-quality
```

The preview compares the original and enhanced Arcana files side by side for idle, smile, serious, surprised, wink, and mystical samples.

## Production Note

This PR does not switch production character paths to the enhanced assets yet. After visual approval, the same process can be applied to the remaining characters and the app can be updated to reference the enhanced set.
