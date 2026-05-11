"""
캐릭터 이미지 윤곽선 가늘게 + 재색상 (Thin & Recolor Outlines)

1단계: 형태학적 침식(erosion)으로 검은 윤곽선을 얇게 깎는다.
2단계: 침식된 바깥 레이어 → 주변 색상으로 채운다.
3단계: 남은 핵심 윤곽선 → 주변 색상의 어두운 버전으로 재색상.

사전 준비:
    pip install Pillow numpy

사용법:
    python scripts/thin-recolor-outlines.py [옵션]

옵션:
    --threshold  <20~80>   윤곽선으로 판단할 밝기 임계값 (기본: 45)
    --thin       <1~4>     윤곽선 침식 횟수 — 1=1픽셀 얇게, 2=2픽셀 얇게 (기본: 1)
    --darkness   <0.1~0.7> 재색상 후 어두운 정도 (기본: 0.35)
    --spread     <1~5>     주변 색상 탐색 반경 (기본: 3)
    --char       <name>    미리보기용 캐릭터 지정 (기본: arcana)
    --preview              1장만 처리해 미리보기 저장
    --dry-run              대상 목록만 출력

예:
    python scripts/thin-recolor-outlines.py --preview --char miko
    python scripts/thin-recolor-outlines.py --threshold 45 --thin 1 --darkness 0.35
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
    p.add_argument("--threshold", type=int,   default=45)
    p.add_argument("--thin",      type=int,   default=1)
    p.add_argument("--darkness",  type=float, default=0.35)
    p.add_argument("--spread",    type=int,   default=3)
    p.add_argument("--char",      type=str,   default="arcana")
    p.add_argument("--preview",   action="store_true")
    p.add_argument("--dry-run",   action="store_true", dest="dry_run")
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


def spread_neighbor_colors(rgb, alpha, is_outline, spread):
    """비-윤곽선 픽셀의 색상을 윤곽선 방향으로 확산."""
    not_outline_mask = (~is_outline & (alpha > 50)).astype(np.float32)
    color_source = rgb * not_outline_mask[:, :, np.newaxis]
    src_pil = Image.fromarray(color_source.astype(np.uint8), mode="RGB")
    wgt_pil = Image.fromarray((not_outline_mask * 255).astype(np.uint8), mode="L")

    for _ in range(spread):
        src_pil = src_pil.filter(ImageFilter.BoxBlur(1))
        wgt_pil = wgt_pil.filter(ImageFilter.BoxBlur(1))

    spread_rgb = np.array(src_pil, dtype=np.float32)
    spread_wgt = np.array(wgt_pil, dtype=np.float32) / 255.0
    safe_wgt = np.where(spread_wgt > 0.01, spread_wgt, 1.0)
    return np.clip(spread_rgb / safe_wgt[:, :, np.newaxis], 0, 255)


def thin_and_recolor(img_path: Path, threshold: int, thin: int,
                     darkness: float, spread: int) -> Image.Image:
    img = Image.open(img_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    rgb   = arr[:, :, :3]
    alpha = arr[:, :, 3]

    brightness  = np.max(rgb, axis=2)
    is_outline  = (brightness < threshold) & (alpha > 50)

    # 주변 색상 계산
    neighbor_color = spread_neighbor_colors(rgb, alpha, is_outline, spread)

    # 침식(erosion): MinFilter로 윤곽선 마스크를 안쪽으로 축소
    outline_pil = Image.fromarray((is_outline.astype(np.uint8)) * 255, mode="L")
    for _ in range(thin):
        outline_pil = outline_pil.filter(ImageFilter.MinFilter(3))
    outline_core = np.array(outline_pil) > 127

    # 침식으로 제거된 바깥 레이어 → 주변 색상 그대로 채움 (outline → color)
    outline_removed = is_outline & ~outline_core

    # 남은 핵심 윤곽선 → 주변 색상의 어두운 버전으로 재색상
    recolored = neighbor_color * darkness

    result_rgb = rgb.copy()
    result_rgb[outline_removed] = neighbor_color[outline_removed]
    result_rgb[outline_core]    = recolored[outline_core]

    result = arr.copy()
    result[:, :, :3] = np.clip(result_rgb, 0, 255)
    return Image.fromarray(result.astype(np.uint8), mode="RGBA")


def make_compare(src_path: Path, result: Image.Image, out_path: Path) -> None:
    orig  = Image.open(src_path).convert("RGBA")
    arr   = np.array(orig)
    alpha = arr[:, :, 3]

    edge_rows, edge_cols = np.where((alpha > 0) & (alpha < 200))
    cy = int(edge_rows[len(edge_rows) // 3])
    cx = int(edge_cols[len(edge_cols) // 3])
    pad = 40

    BG = (200, 195, 220, 255)
    def comp_crop(im, cy, cx, pad, scale=5):
        bg   = Image.new("RGBA", im.size, BG)
        c    = Image.alpha_composite(bg, im).convert("RGB")
        box  = (max(0, cx-pad), max(0, cy-pad),
                min(im.width, cx+pad), min(im.height, cy+pad))
        crop = c.crop(box)
        return crop.resize((crop.width*scale, crop.height*scale), Image.NEAREST)

    oc = comp_crop(orig,   cy, cx, pad)
    fc = comp_crop(result, cy, cx, pad)
    w, h = oc.size

    from PIL import ImageDraw
    cmp = Image.new("RGB", (w*2+4, h+30), (240, 240, 240))
    cmp.paste(oc, (0, 30))
    cmp.paste(fc, (w+4, 30))
    d = ImageDraw.Draw(cmp)
    d.text((w//2-35,       6), "ORIGINAL",  fill=(180, 0, 0))
    d.text((w+4+w//2-50,   6), "RECOLORED", fill=(0, 130, 0))
    cmp.save(out_path)


def main():
    opts = parse_args()
    print("=== 윤곽선 얇게 + 재색상 (Thin & Recolor Outlines) ===")
    print(f"  threshold:{opts.threshold}  thin:{opts.thin}  darkness:{opts.darkness}  spread:{opts.spread}")

    if opts.preview:
        src = IMAGES_ROOT / opts.char / "nukki-enhanced" / "default.png"
        if not src.exists():
            print(f"미리보기 대상 없음: {src}")
            sys.exit(1)
        result  = thin_and_recolor(src, opts.threshold, opts.thin, opts.darkness, opts.spread)
        prev_out = ROOT / "preview_thin_recolor.png"
        cmp_out  = ROOT / "preview_thin_recolor_compare.png"
        result.save(prev_out, "PNG")
        make_compare(src, result, cmp_out)
        print(f"\n미리보기: {prev_out}")
        print(f"비교:      {cmp_out}")

        # 통계
        img = Image.open(src).convert("RGBA")
        arr = np.array(img, dtype=np.float32)
        brightness = np.max(arr[:, :, :3], axis=2)
        alpha = arr[:, :, 3]
        is_outline = (brightness < opts.threshold) & (alpha > 50)
        outline_pil = Image.fromarray((is_outline.astype(np.uint8)) * 255, mode="L")
        for _ in range(opts.thin):
            outline_pil = outline_pil.filter(ImageFilter.MinFilter(3))
        outline_core = np.array(outline_pil) > 127
        total = int((alpha > 50).sum())
        print(f"\n  원본 윤곽선: {is_outline.sum():,}px ({100*is_outline.sum()/total:.1f}%)")
        print(f"  침식 후 핵심: {outline_core.sum():,}px ({100*outline_core.sum()/total:.1f}%)")
        print(f"  제거된 바깥: {(is_outline & ~outline_core).sum():,}px")
        return

    images = find_images()
    print(f"  대상: {len(images)}개 이미지")

    if opts.dry_run:
        for p in images:
            print(f"  {p.parent.parent.name}/nukki-enhanced/{p.name}")
        return

    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_root = ROOT / f"backup-thin-recolor-{timestamp}"

    print(f"\n[1/2] 원본 백업 -> {backup_root}")
    for img_path in images:
        rel = img_path.relative_to(IMAGES_ROOT)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img_path, dst)
    print(f"  백업 완료 ({len(images)}개)")

    print("\n[2/2] 처리...")
    success, fail = 0, 0
    for i, img_path in enumerate(images, 1):
        label = f"{img_path.parent.parent.name}/{img_path.name}"
        print(f"  [{i:2d}/{len(images)}] {label} ... ", end="", flush=True)
        try:
            result = thin_and_recolor(img_path, opts.threshold, opts.thin,
                                       opts.darkness, opts.spread)
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
