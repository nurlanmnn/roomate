#!/usr/bin/env python3
"""Render every Roomate logo asset from one geometry ("two under one roof").

The mark is a roof line over two dots: a roommate (white) and you (marigold).
Geometry lives in a 100x100 box; keep it in sync with
src/components/ui/RoomateMark.tsx and assets/logo.svg.

Usage: python3 mobile/scripts/generate-logo.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

MOBILE = Path(__file__).resolve().parent.parent
XCASSETS = MOBILE / "ios/RoommateApp/Images.xcassets"

COBALT = (29, 59, 168)    # enamel
WHITE = (255, 255, 255)   # on-enamel
MARIGOLD = (242, 183, 5)  # marigold ("yours")

# Geometry in a 100x100 icon box.
ROOF = [(20, 53.5), (50, 27.5), (80, 53.5)]
STROKE = 8.5
DOTS = [(39, 63.5), (61, 63.5)]
DOT_R = 8.5
# Bounding box of the bare mark (roof stroke + dots), used for cropped renders.
BOX = (20 - STROKE / 2, 27.5 - STROKE / 2 - 0.5, 80 + STROKE / 2, 63.5 + DOT_R)

SS = 4  # supersampling factor


def draw_mark(d, scale, ox, oy, roof, dot_a, dot_b):
    w = STROKE * scale
    pts = [(ox + x * scale, oy + y * scale) for x, y in ROOF]
    for a, b in zip(pts, pts[1:]):
        d.line([a, b], fill=roof, width=round(w))
    for x, y in pts:
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=roof)
    for (x, y), col in zip(DOTS, (dot_a, dot_b)):
        cx, cy, r = ox + x * scale, oy + y * scale, DOT_R * scale
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col)


def app_icon(size):
    big = size * SS
    im = Image.new("RGB", (big, big), COBALT)
    draw_mark(ImageDraw.Draw(im), big / 100, 0, 0, WHITE, WHITE, MARIGOLD)
    return im.resize((size, size), Image.LANCZOS)


def bare_mark(width, roof, dot_a, dot_b, pad=0.0):
    """Transparent PNG of the mark alone, cropped to its box plus `pad` (fraction)."""
    bx0, by0, bx1, by1 = BOX
    bw, bh = bx1 - bx0, by1 - by0
    p = bw * pad
    scale = width * SS / (bw + 2 * p)
    W, H = round((bw + 2 * p) * scale), round((bh + 2 * p) * scale)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_mark(ImageDraw.Draw(im), scale, (p - bx0) * scale, (p - by0) * scale, roof, dot_a, dot_b)
    return im.resize((round(W / SS), round(H / SS)), Image.LANCZOS)


def main():
    icon = app_icon(1024)
    icon.save(MOBILE / "assets/icon.png")
    icon.save(XCASSETS / "AppIcon.appiconset/icon.png")

    # Mark for light grounds (README, web, email): cobalt roof, cobalt + marigold dots.
    bare_mark(1024, COBALT, COBALT, MARIGOLD, pad=0.08).save(MOBILE / "assets/logo-mark.png")

    # Launch screen: white mark on the enamel field, 120pt wide.
    splash_dir = XCASSETS / "SplashScreenLogo.imageset"
    splash_dir.mkdir(exist_ok=True)
    for n in (1, 2, 3):
        bare_mark(120 * n, WHITE, WHITE, MARIGOLD).save(splash_dir / f"SplashScreenLogo{'' if n == 1 else f'@{n}x'}.png")
    bare_mark(360, WHITE, WHITE, MARIGOLD).save(MOBILE / "assets/splash-icon.png")
    print("Logo assets written.")


if __name__ == "__main__":
    main()
