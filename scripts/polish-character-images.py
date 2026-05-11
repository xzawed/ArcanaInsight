"""
캐릭터 누끼 이미지 색상·밝기·선명도 일괄 보정
Real-ESRGAN 처리 후 또는 단독으로 사용 가능

사전 준비:
    pip install Pillow

사용법:
    python scripts/polish-character-images.py [옵션]

옵션:
    --sharpness  <0.0~3.0>  선명도 강도 (기본: 1.4)
    --brightness <0.5~2.0>  밝기 강도   (기본: 1.05)
    --contrast   <0.5~2.0>  대비 강도   (기본: 1.08)
    --color      <0.5~2.0>  채도 강도   (기본: 1.05)
    --edge-blur  <0~5>      가장자리 페더링 반경 (기본: 1)
    --dry-run               대상 목록만 출력

예:
    python scripts/polish-character-images.py
    python scripts/polish-character-images.py --sharpness 1.6 --contrast 1.1
"""

import argparse
import sys
import os
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError:
    print("❌ Pillow가 설치되지 않았습니다.")
    print("   pip install Pillow  를 실행하세요.")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
IMAGES_ROOT = ROOT / "public" / "images" / "characters"


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--sharpness",  type=float, default=1.4)
    p.add_argument("--brightness", type=float, default=1.05)
    p.add_argument("--contrast",   type=float, default=1.08)
    p.add_argument("--color",      type=float, default=1.05)
    p.add_argument("--edge-blur",  type=int,   default=1, dest="edge_blur")
    p.add_argument("--dry-run",    action="store_true", dest="dry_run")
    return p.parse_args()


def find_images():
    results = []
    for char_dir in sorted(IMAGES_ROOT.iterdir()):
        nukki_dir = char_dir / "nukki"
        if not nukki_dir.is_dir():
            continue
        for img_path in sorted(nukki_dir.glob("*.png")):
            results.append(img_path)
    return results


def polish_image(img_path: Path, opts) -> None:
    img = Image.open(img_path).convert("RGBA")

    # RGBA → RGB for enhancement, alpha를 별도 보존
    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))

    # 밝기
    if opts.brightness != 1.0:
        rgb = ImageEnhance.Brightness(rgb).enhance(opts.brightness)

    # 대비
    if opts.contrast != 1.0:
        rgb = ImageEnhance.Contrast(rgb).enhance(opts.contrast)

    # 채도
    if opts.color != 1.0:
        rgb = ImageEnhance.Color(rgb).enhance(opts.color)

    # 선명도
    if opts.sharpness != 1.0:
        rgb = ImageEnhance.Sharpness(rgb).enhance(opts.sharpness)

    # 알파 가장자리 페더링 (nukki 경계 부드럽게)
    if opts.edge_blur > 0 and a.mode == "L":
        a = a.filter(ImageFilter.GaussianBlur(radius=opts.edge_blur / 2))

    result = Image.merge("RGBA", (*rgb.split(), a))
    result.save(img_path, "PNG", optimize=False, compress_level=6)


def main():
    opts = parse_args()
    images = find_images()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_root = ROOT / f"backup_polish_{timestamp}"

    print("=== 캐릭터 이미지 색상·선명도 보정 ===")
    print(f"  대상: {len(images)}개")
    print(f"  선명도:{opts.sharpness}  밝기:{opts.brightness}  대비:{opts.contrast}  채도:{opts.color}  엣지 블러:{opts.edge_blur}")

    if opts.dry_run:
        print("\n[DRY RUN] 대상 목록:")
        for p in images:
            print(f"  {p.parent.parent.name}/nukki/{p.name}")
        return

    # 백업
    print(f"\n[1/2] 원본 백업 → {backup_root}")
    for img_path in images:
        rel = img_path.relative_to(IMAGES_ROOT)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy2(img_path, dst)
    print("  백업 완료.")

    # 처리
    print("\n[2/2] 보정 처리...")
    success, fail = 0, 0
    for i, img_path in enumerate(images, 1):
        label = f"{img_path.parent.parent.name}/{img_path.name}"
        print(f"  [{i:2d}/{len(images)}] {label} ... ", end="", flush=True)
        try:
            polish_image(img_path, opts)
            success += 1
            print("✅")
        except Exception as e:
            fail += 1
            print(f"❌ {str(e)[:60]}")

    print(f"\n완료: 성공 {success}개  실패 {fail}개")
    print(f"원본 백업: {backup_root}")


if __name__ == "__main__":
    main()
