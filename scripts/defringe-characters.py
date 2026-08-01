"""
캐릭터 누끼 이미지 디프린지 (Defringe)

누끼 처리 후 가장자리에 남은 검은 테두리(어두운 배경색이 반투명 픽셀에 잔류)를
제거한다. 내부 불투명 픽셀의 색상을 가장자리 방향으로 번지게(spread) 하여
자연스러운 가장자리를 만든다.

사전 준비:
    pip install Pillow numpy

사용법:
    python scripts/defringe-characters.py [옵션]

옵션:
    --spread     <1~5>   색상 번지기 반경 픽셀 (기본: 2)
    --threshold  <0~50>  어두운 픽셀 감지 임계값 (기본: 20, 낮을수록 더 어두운 픽셀만)
    --preview            arcana/idle.png 1장만 처리해 preview 파일 저장
    --dry-run            대상 목록만 출력

예:
    python scripts/defringe-characters.py --preview
    python scripts/defringe-characters.py --spread 3 --threshold 30
    python scripts/defringe-characters.py
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
    print(f"필요한 라이브러리가 없습니다: {e}")
    print("pip install Pillow numpy  를 실행하세요.")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
IMAGES_ROOT = ROOT / "public" / "images" / "characters"


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--spread",     type=int, default=2)
    p.add_argument("--threshold",  type=int, default=20)
    p.add_argument("--preview",    action="store_true")
    p.add_argument("--dry-run",    action="store_true", dest="dry_run")
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


def defringe_image(img_path: Path, spread: int, threshold: int) -> Image.Image:
    img = Image.open(img_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)  # (H, W, 4)

    rgb = arr[:, :, :3]   # float32 RGB
    alpha = arr[:, :, 3]  # float32 alpha (0~255)

    # 불투명 마스크: alpha >= 200인 픽셀을 "신뢰할 수 있는 색상" 소스로 사용
    opaque_mask = alpha >= 200

    # "색상 번지기": 불투명 픽셀의 색상을 주변으로 spread 픽셀만큼 확산
    # 방법: GaussianBlur로 색상 가중 평균 계산
    opaque_rgb = rgb * (opaque_mask[:, :, np.newaxis])  # 불투명 영역만 색상 유지

    # PIL 이미지로 변환해 번지기 수행
    spread_img_src = Image.fromarray(opaque_rgb.astype(np.uint8), mode="RGB")
    weight_src = Image.fromarray(opaque_mask.astype(np.uint8) * 255, mode="L")

    for _ in range(spread):
        spread_img_src = spread_img_src.filter(ImageFilter.BoxBlur(1))
        weight_src = weight_src.filter(ImageFilter.BoxBlur(1))

    spread_rgb = np.array(spread_img_src, dtype=np.float32)
    spread_weight = np.array(weight_src, dtype=np.float32) / 255.0

    # spread_weight가 0인 영역은 나눗셈 방지
    safe_weight = np.where(spread_weight > 0.01, spread_weight, 1.0)
    spread_rgb_normalized = np.clip(spread_rgb / safe_weight[:, :, np.newaxis], 0, 255)

    # 디프린지 적용 대상:
    # 1) 반투명 가장자리 픽셀 (0 < alpha < 200)
    # 2) 불투명이지만 매우 어두운(검은 프린지) 픽셀 (alpha >= 200, 밝기 <= threshold)
    brightness = np.max(rgb, axis=2)  # 채널별 최대값 = 밝기 근사
    edge_mask = (alpha > 0) & (alpha < 200)
    dark_fringe_mask = (alpha >= 200) & (brightness <= threshold)
    target_mask = edge_mask | dark_fringe_mask

    # 타겟 픽셀에 번진 색상 적용
    fixed_rgb = rgb.copy()
    fixed_rgb[target_mask] = spread_rgb_normalized[target_mask]

    # 최종 이미지 재조합
    result = np.zeros_like(arr)
    result[:, :, :3] = np.clip(fixed_rgb, 0, 255)
    result[:, :, 3] = alpha

    return Image.fromarray(result.astype(np.uint8), mode="RGBA")


def main():
    opts = parse_args()

    print("=== 캐릭터 이미지 디프린지 (Defringe) ===")
    print(f"  spread:{opts.spread}  threshold:{opts.threshold}")

    if opts.preview:
        preview_src = IMAGES_ROOT / "arcana" / "nukki-enhanced" / "idle.png"
        if not preview_src.exists():
            print(f"미리보기 대상 없음: {preview_src}")
            sys.exit(1)
        preview_dst = ROOT / "preview_defringe.png"
        result = defringe_image(preview_src, opts.spread, opts.threshold)
        result.save(preview_dst, "PNG")
        print(f"\n미리보기 저장: {preview_dst}")
        print("  원본과 비교 후 파라미터를 조정해 전체 실행하세요.")
        return

    images = find_images()
    print(f"  대상: {len(images)}개 이미지")

    if opts.dry_run:
        print("\n[DRY RUN] 대상 목록:")
        for p in images:
            print(f"  {p.parent.parent.name}/nukki-enhanced/{p.name}")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_root = ROOT / f"backup-defringe-{timestamp}"

    print(f"\n[1/2] 원본 백업 -> {backup_root}")
    for img_path in images:
        rel = img_path.relative_to(IMAGES_ROOT)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img_path, dst)
    print(f"  백업 완료 ({len(images)}개)")

    print("\n[2/2] 디프린지 처리...")
    success, fail = 0, 0
    for i, img_path in enumerate(images, 1):
        label = f"{img_path.parent.parent.name}/{img_path.name}"
        print(f"  [{i:2d}/{len(images)}] {label} ... ", end="", flush=True)
        try:
            result = defringe_image(img_path, opts.spread, opts.threshold)
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
