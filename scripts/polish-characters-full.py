"""
캐릭터 이미지 전체 보정 — 외곽 디프린지 + 내부 윤곽선 소프트닝 통합 처리

1단계: 외곽 디프린지 — 누끼 처리 후 가장자리에 남은 검은 프린지 제거
2단계: 내부 소프트닝 — 내부 윤곽선을 자연스럽게 완화

사전 준비:
    pip install Pillow numpy

사용법:
    python scripts/polish-characters-full.py [옵션]

옵션:
    --spread     <1~5>    외곽 프린지 번지기 반경 (기본: 3)
    --df-thresh  <0~50>   외곽 어두운 픽셀 임계값 (기본: 30)
    --blur       <0.5~3>  내부 선 블러 반경 (기본: 2.5)
    --strength   <0.1~1>  내부 선 블러 강도 (기본: 1.0)
    --line-thresh <20~120> 내부 선 감지 임계값 (기본: 70)
    --preview            arcana/idle.png 1장만 처리해 미리보기 저장
    --dry-run            대상 목록만 출력

예:
    python scripts/polish-characters-full.py --preview
    python scripts/polish-characters-full.py
"""

import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

try:
    from PIL import Image, ImageFilter
    import numpy as np
except ImportError as e:
    print(f"필요한 라이브러리가 없습니다: {e}\npip install Pillow numpy  를 실행하세요.")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
IMAGES_ROOT = ROOT / "public" / "images" / "characters"


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--spread",      type=int,   default=3)
    p.add_argument("--df-thresh",   type=int,   default=30,  dest="df_thresh")
    p.add_argument("--blur",        type=float, default=2.5)
    p.add_argument("--strength",    type=float, default=1.0)
    p.add_argument("--line-thresh", type=int,   default=70,  dest="line_thresh")
    p.add_argument("--preview",     action="store_true")
    p.add_argument("--dry-run",     action="store_true", dest="dry_run")
    return p.parse_args()


def find_images():
    results = []
    for char_dir in sorted(IMAGES_ROOT.iterdir()):
        enhanced_dir = char_dir / "nukki-enhanced"
        if not enhanced_dir.is_dir():
            continue
        for img_path in sorted(enhanced_dir.glob("*.png")):
            results.append(img_path)
    return results


# ── 1단계: 외곽 디프린지 ──────────────────────────────────────────────────────
def defringe(img: Image.Image, spread: int, threshold: int) -> Image.Image:
    arr = np.array(img, dtype=np.float32)
    rgb, alpha = arr[:, :, :3], arr[:, :, 3]

    opaque_mask = alpha >= 200
    opaque_rgb = rgb * opaque_mask[:, :, np.newaxis]

    spread_src = Image.fromarray(opaque_rgb.astype(np.uint8), mode="RGB")
    weight_src = Image.fromarray((opaque_mask * 255).astype(np.uint8), mode="L")

    for _ in range(spread):
        spread_src = spread_src.filter(ImageFilter.BoxBlur(1))
        weight_src = weight_src.filter(ImageFilter.BoxBlur(1))

    spread_rgb = np.array(spread_src, dtype=np.float32)
    spread_w   = np.array(weight_src, dtype=np.float32) / 255.0
    safe_w     = np.where(spread_w > 0.01, spread_w, 1.0)
    spread_rgb_n = np.clip(spread_rgb / safe_w[:, :, np.newaxis], 0, 255)

    brightness   = np.max(rgb, axis=2)
    edge_mask    = (alpha > 0) & (alpha < 200)
    dark_mask    = (alpha >= 200) & (brightness <= threshold)
    target_mask  = edge_mask | dark_mask

    fixed_rgb = rgb.copy()
    fixed_rgb[target_mask] = spread_rgb_n[target_mask]

    result = arr.copy()
    result[:, :, :3] = np.clip(fixed_rgb, 0, 255)
    return Image.fromarray(result.astype(np.uint8), mode="RGBA")


# ── 2단계: 내부 선 소프트닝 ───────────────────────────────────────────────────
def soften(img: Image.Image, blur: float, strength: float, line_thresh: int) -> Image.Image:
    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))

    gray = rgb.convert("L")
    thr = line_thresh
    line_mask = gray.point(lambda px: max(0, min(255, (thr - px) * 255 // max(1, thr))))
    line_mask = line_mask.filter(ImageFilter.GaussianBlur(radius=blur * 0.6))

    blurred = rgb.filter(ImageFilter.GaussianBlur(radius=blur))

    partial_mask = line_mask.point(lambda px: int(px * strength)) if strength < 1.0 else line_mask
    result_rgb = Image.composite(blurred, rgb, partial_mask)

    return Image.merge("RGBA", (*result_rgb.split(), a))


# ── 통합 처리 ─────────────────────────────────────────────────────────────────
def process(img_path: Path, opts) -> Image.Image:
    img = Image.open(img_path).convert("RGBA")
    img = defringe(img, opts.spread, opts.df_thresh)
    img = soften(img, opts.blur, opts.strength, opts.line_thresh)
    return img


def main():
    opts = parse_args()

    print("=== 캐릭터 이미지 전체 보정 ===")
    print(f"  [디프린지] spread:{opts.spread}  threshold:{opts.df_thresh}")
    print(f"  [소프트닝] blur:{opts.blur}  strength:{opts.strength}  line-threshold:{opts.line_thresh}")

    if opts.preview:
        src = IMAGES_ROOT / "arcana" / "nukki-enhanced" / "idle.png"
        if not src.exists():
            print(f"미리보기 대상 없음: {src}")
            sys.exit(1)
        dst = ROOT / "preview_full_polish.png"
        result = process(src, opts)
        result.save(dst, "PNG")
        print(f"\n미리보기 저장: {dst}")
        return

    images = find_images()
    print(f"  대상: {len(images)}개 이미지")

    if opts.dry_run:
        for p in images:
            print(f"  {p.parent.parent.name}/nukki-enhanced/{p.name}")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_root = ROOT / f"backup-full-polish-{timestamp}"

    print(f"\n[1/2] 원본 백업 -> {backup_root}")
    for img_path in images:
        rel = img_path.relative_to(IMAGES_ROOT)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img_path, dst)
    print(f"  백업 완료 ({len(images)}개)")

    print("\n[2/2] 보정 처리...")
    success, fail = 0, 0
    for i, img_path in enumerate(images, 1):
        label = f"{img_path.parent.parent.name}/{img_path.name}"
        print(f"  [{i:2d}/{len(images)}] {label} ... ", end="", flush=True)
        try:
            result = process(img_path, opts)
            result.save(img_path, "PNG", optimize=False, compress_level=6)
            success += 1
            print("OK")
        except Exception as e:
            fail += 1
            print(f"FAIL {str(e)[:60]}")

    print(f"\n완료: 성공 {success}개  실패 {fail}개")
    print(f"원본 백업: {backup_root}")


if __name__ == "__main__":
    main()
