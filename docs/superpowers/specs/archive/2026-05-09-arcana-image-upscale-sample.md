# All Character Image Upscale Enhancement

Date: 2026-05-09

## Scope

- Original character PNG files remain unchanged in `public/images/characters/[id]/nukki/`.
- The canonical high-resolution color source for enhanced regeneration is `public/images/characters/[id]/nukki/backup-v2/`.
- A non-destructive 2816 x 1536 enhanced set exists for all 12 characters in `public/images/characters/[id]/nukki-enhanced/`.
- The enhanced set keeps the same illustration, pose, expression, canvas, and transparent cutout silhouette.
- Production character image references now use `nukki-enhanced`.

## Method

- Resized every color layer from the `backup-v2` 1408 x 768 source to exactly 2816 x 1536.
- Root `nukki` assets are mixed-size (`1408 x 768` and `677 x 369`), so they are not used as the canonical color source for enhanced regeneration.
- Reused the existing transparent cutout alpha from the previous enhanced assets or root `nukki` files, then resized it to the 2816 x 1536 output.
- Decontaminated semi-transparent edge RGB from nearby opaque character colors so background color does not bleed into the cutout.
- Lightly tightened the resized alpha edge while preserving the existing silhouette.
- Reduced weathered pixel texture with low-radius surface smoothing in flat color areas.
- Protected hair, eye, clothing, and alpha edges with a Sobel-derived edge mask.
- Applied mild edge-only detail restoration instead of global sharpening.

## Validation

- Enhanced dimensions are exactly 2816 x 1536 for all 84 character mood files.
- All enhanced files remain `RGBA` PNGs.
- Every enhanced file keeps transparent background pixels and translucent antialias edge pixels.
- Alpha silhouettes follow the existing production cutouts while the color layer comes from the higher-resolution source.
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
