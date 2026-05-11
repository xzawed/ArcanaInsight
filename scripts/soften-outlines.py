"""
캐릭터 누끼-enhanced 이미지 윤곽선 자연스럽게 소프트닝

Real-ESRGAN 업스케일 후 두꺼워진 외곽선·내부선을 어두운 픽셀(선) 영역에만
선택적으로 블러를 적용해 자연스럽게 완화한다. 색상 영역은 최대한 유지.

사전 준비:
    pip install Pillow

사용법:
    python scripts/soften-outlines.py [옵션]

옵션:
    --blur       <0.3~3.0>  윤곽선 블러 반경 (기본: 0.8)
    --threshold  <20~120>   어두운 픽셀 감지 임계값 (기본: 70, 낮을수록 더 어두운 선만)
    --strength   <0.1~1.0>  블러 적용 강도 (기본: 0.55, 높을수록 더 많이 부드러워짐)
    --shadow-lift <0~30>    최어두운 픽셀 밝기 살짝 올리기 (기본: 0)
    --preview               arcana/default.png 1장만 처리해 preview 파일 저장
    --dry-run               대상 목록만 출력

예:
    python scripts/soften-outlines.py --preview
    python scripts/soften-outlines.py --blur 0.8 --strength 0.55
    python scripts/soften-outlines.py --blur 1.0 --strength 0.7 --threshold 60
"""

import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError:
    print("❌ Pillow가 설치되지 않았습니다.  pip install Pillow  를 실행하세요.")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
IMAGES_ROOT = ROOT / "public" / "images" / "characters"


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--blur",         type=float, default=0.8)
    p.add_argument("--threshold",    type=int,   default=70)
    p.add_argument("--strength",     type=float, default=0.55)
    p.add_argument("--shadow-lift",  type=int,   default=0,   dest="shadow_lift")
    p.add_argument("--preview",      action="store_true")
    p.add_argument("--dry-run",      action="store_true", dest="dry_run")
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


def soften_image(img_path: Path, opts) -> Image.Image:
    img = Image.open(img_path).convert("RGBA")
    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))

    # 어두운 픽셀(윤곽선) 위치를 나타내는 마스크 생성
    # 밝기가 threshold 이하인 픽셀을 선 영역으로 간주
    gray = rgb.convert("L")
    thr = opts.threshold
    line_mask = gray.point(lambda px: max(0, min(255, (thr - px) * 255 // max(1, thr))))
    # 마스크 가장자리를 약간 확산시켜 선 주변도 포함
    line_mask = line_mask.filter(ImageFilter.GaussianBlur(radius=opts.blur * 0.6))

    # 전체 이미지 블러
    blurred = rgb.filter(ImageFilter.GaussianBlur(radius=opts.blur))

    # 마스크 기반 합성: 선 영역 → 블러된 버전, 나머지 → 원본
    # strength로 최종 혼합 비율 조절
    if opts.strength < 1.0:
        partial_mask = line_mask.point(lambda px: int(px * opts.strength))
    else:
        partial_mask = line_mask

    result_rgb = Image.composite(blurred, rgb, partial_mask)

    # shadow-lift: 매우 어두운 픽셀 밝기를 살짝 올림 (0이면 스킵)
    if opts.shadow_lift > 0:
        lift = opts.shadow_lift
        result_rgb = result_rgb.point(lambda px: min(255, px + lift if px < thr else px))

    return Image.merge("RGBA", (*result_rgb.split(), a))


def main():
    opts = parse_args()

    print("=== 캐릭터 이미지 윤곽선 소프트닝 ===")
    print(f"  blur:{opts.blur}  threshold:{opts.threshold}  strength:{opts.strength}  shadow-lift:{opts.shadow_lift}")

    if opts.preview:
        preview_src = IMAGES_ROOT / "arcana" / "nukki-enhanced" / "default.png"
        if not preview_src.exists():
            print(f"❌ 미리보기 대상 없음: {preview_src}")
            sys.exit(1)
        preview_dst = ROOT / "preview_soften_outline.png"
        result = soften_image(preview_src, opts)
        result.save(preview_dst, "PNG")
        print(f"\n✅ 미리보기 저장: {preview_dst}")
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
    backup_root = ROOT / f"backup-outline-soften-{timestamp}"

    print(f"\n[1/2] 원본 백업 → {backup_root}")
    for img_path in images:
        rel = img_path.relative_to(IMAGES_ROOT)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img_path, dst)
    print(f"  백업 완료 ({len(images)}개)")

    print("\n[2/2] 윤곽선 소프트닝 처리...")
    success, fail = 0, 0
    for i, img_path in enumerate(images, 1):
        label = f"{img_path.parent.parent.name}/{img_path.name}"
        print(f"  [{i:2d}/{len(images)}] {label} ... ", end="", flush=True)
        try:
            result = soften_image(img_path, opts)
            result.save(img_path, "PNG", optimize=False, compress_level=6)
            success += 1
            print("✅")
        except Exception as e:
            fail += 1
            print(f"❌ {str(e)[:60]}")

    print(f"\n완료: 성공 {success}개  실패 {fail}개")
    print(f"원본 백업: {backup_root}")


if __name__ == "__main__":
    main()
