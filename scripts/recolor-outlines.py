"""
캐릭터 이미지 아웃라인 재색상 (Outline Recoloring)

검은 윤곽선 픽셀의 색상을 주변 픽셀 색상의 어두운 버전으로 교체한다.
예: 피부 옆 검은 선 → 진한 피부색 선, 파란 머리카락 옆 검은 선 → 진한 파란색 선

사전 준비:
    pip install Pillow numpy

사용법:
    python scripts/recolor-outlines.py [옵션]

옵션:
    --threshold  <10~80>   윤곽선으로 판단할 밝기 임계값 (기본: 45, 낮을수록 더 어두운 선만)
    --darkness   <0.1~0.7> 재색상 후 어두운 정도 (기본: 0.35, 낮을수록 더 어두움)
    --spread     <1~5>     주변 색상 탐색 반경 (기본: 3)
    --preview              arcana/default.png 1장만 처리해 미리보기 저장
    --dry-run              대상 목록만 출력

예:
    python scripts/recolor-outlines.py --preview
    python scripts/recolor-outlines.py --threshold 45 --darkness 0.35
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
    p.add_argument("--darkness",  type=float, default=0.35)
    p.add_argument("--spread",    type=int,   default=3)
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


def recolor_outlines(img_path: Path, threshold: int, darkness: float, spread: int) -> Image.Image:
    img = Image.open(img_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)   # H × W × 4

    rgb   = arr[:, :, :3]    # 0~255
    alpha = arr[:, :, 3]     # 0~255

    # 픽셀 최대 밝기 (채널 중 가장 밝은 값)
    brightness = np.max(rgb, axis=2)

    # 윤곽선 마스크: 캐릭터 내부(alpha > 50)에서 어두운 픽셀
    is_outline = (brightness < threshold) & (alpha > 50)

    # ── 주변 색상 계산 ────────────────────────────────────────────────────────
    # 비-아웃라인 픽셀의 색상을 아웃라인 영역으로 번지게 함
    not_outline_mask = (~is_outline & (alpha > 50)).astype(np.float32)

    # 비-아웃라인 색상만 남기고 주변으로 확산
    color_source = rgb * not_outline_mask[:, :, np.newaxis]
    src_pil      = Image.fromarray(color_source.astype(np.uint8), mode="RGB")
    wgt_pil      = Image.fromarray((not_outline_mask * 255).astype(np.uint8), mode="L")

    for _ in range(spread):
        src_pil = src_pil.filter(ImageFilter.BoxBlur(1))
        wgt_pil = wgt_pil.filter(ImageFilter.BoxBlur(1))

    spread_rgb = np.array(src_pil, dtype=np.float32)
    spread_wgt = np.array(wgt_pil, dtype=np.float32) / 255.0

    safe_wgt       = np.where(spread_wgt > 0.01, spread_wgt, 1.0)
    neighbor_color = np.clip(spread_rgb / safe_wgt[:, :, np.newaxis], 0, 255)  # 정규화된 주변 색상

    # ── 재색상 ───────────────────────────────────────────────────────────────
    # 윤곽선 픽셀 → 주변 색상 × darkness (어두운 버전)
    new_outline_color = neighbor_color * darkness

    result_rgb = rgb.copy()
    result_rgb[is_outline] = new_outline_color[is_outline]

    result = arr.copy()
    result[:, :, :3] = np.clip(result_rgb, 0, 255)
    return Image.fromarray(result.astype(np.uint8), mode="RGBA")


def make_compare(src_path: Path, result: Image.Image, out_path: Path) -> None:
    """실루엣 가장자리 + 내부 크롭 2구역 비교 이미지 생성"""
    orig = Image.open(src_path).convert("RGBA")
    arr  = np.array(orig)
    alpha = arr[:, :, 3]

    edge_rows, edge_cols = np.where((alpha > 0) & (alpha < 200))
    cy = int(edge_rows[len(edge_rows) // 3])
    cx = int(edge_cols[len(edge_cols) // 3])
    pad = 40

    BG = (200, 195, 220, 255)
    def comp_crop(img, cy, cx, pad, scale=5):
        bg  = Image.new("RGBA", img.size, BG)
        c   = Image.alpha_composite(bg, img).convert("RGB")
        box = (max(0, cx-pad), max(0, cy-pad),
               min(img.width, cx+pad), min(img.height, cy+pad))
        crop = c.crop(box)
        return crop.resize((crop.width*scale, crop.height*scale), Image.NEAREST)

    oc = comp_crop(orig,   cy, cx, pad)
    fc = comp_crop(result, cy, cx, pad)
    w, h = oc.size

    from PIL import ImageDraw
    cmp = Image.new("RGB", (w*2+4, h+30), (240,240,240))
    cmp.paste(oc, (0, 30)); cmp.paste(fc, (w+4, 30))
    d = ImageDraw.Draw(cmp)
    d.text((w//2-35,   6), "ORIGINAL",  fill=(180,0,0))
    d.text((w+4+w//2-50, 6), "RECOLORED", fill=(0,130,0))
    cmp.save(out_path)


def main():
    opts = parse_args()
    print("=== 아웃라인 재색상 (Outline Recoloring) ===")
    print(f"  threshold:{opts.threshold}  darkness:{opts.darkness}  spread:{opts.spread}")

    if opts.preview:
        src = IMAGES_ROOT / "arcana" / "nukki-enhanced" / "default.png"
        if not src.exists():
            print(f"미리보기 대상 없음: {src}")
            sys.exit(1)
        result   = recolor_outlines(src, opts.threshold, opts.darkness, opts.spread)
        prev_out = ROOT / "preview_recolor.png"
        cmp_out  = ROOT / "preview_recolor_compare.png"
        result.save(prev_out, "PNG")
        make_compare(src, result, cmp_out)
        print(f"\n미리보기: {prev_out}")
        print(f"비교:      {cmp_out}")
        return

    images = find_images()
    print(f"  대상: {len(images)}개 이미지")

    if opts.dry_run:
        for p in images:
            print(f"  {p.parent.parent.name}/nukki-enhanced/{p.name}")
        return

    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_root = ROOT / f"backup-recolor-{timestamp}"

    print(f"\n[1/2] 원본 백업 -> {backup_root}")
    for img_path in images:
        rel = img_path.relative_to(IMAGES_ROOT)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img_path, dst)
    print(f"  백업 완료 ({len(images)}개)")

    print("\n[2/2] 재색상 처리...")
    success, fail = 0, 0
    for i, img_path in enumerate(images, 1):
        label = f"{img_path.parent.parent.name}/{img_path.name}"
        print(f"  [{i:2d}/{len(images)}] {label} ... ", end="", flush=True)
        try:
            result = recolor_outlines(img_path, opts.threshold, opts.darkness, opts.spread)
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
