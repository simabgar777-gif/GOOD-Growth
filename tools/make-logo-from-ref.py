# -*- coding: utf-8 -*-
"""Знак GOOD по референсу Капитана: чистый, без водяных знаков.

Геометрия снята с референса (1026×984) и пересчитана в проценты,
чтобы знак масштабировался на любой размер.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = r"C:\Users\боос\Documents\deepseek-harness\default-workspace\ship\good-growth\og"
S = 1024
SS = 4  # рисуем крупно, потом уменьшаем

ORANGE = (245, 146, 29)
RED = (218, 33, 40)
TEAL = (40, 169, 146)
GREEN = (72, 179, 82)
DARK = (10, 11, 13)

# координаты в процентах от стороны квадрата (по референсу)
SEGS = [
    # (x1, y1, x2, y2, цвет, множитель толщины)
    (33.6, 29.0, 33.6, 69.0, ORANGE, 1.0),   # левая стойка
    (33.6, 29.0, 41.8, 36.0, ORANGE, 1.0),   # верхний крючок вправо
    (34.8, 78.5, 61.0, 49.0, RED, 1.0),      # красная диагональ снизу вверх
    (71.5, 20.5, 44.5, 47.5, TEAL, 1.0),     # бирюзовая диагональ сверху вниз
    (70.8, 24.0, 70.8, 69.5, GREEN, 1.0),    # правая стойка
    (70.8, 66.0, 61.5, 66.0, GREEN, 1.0),    # нижний крючок влево
]
THICK = 6.8  # % от стороны


def draw_logo(size, bg=None, pad_ratio=0.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if bg is None else bg + (255,))
    d = ImageDraw.Draw(img)
    inner = size * (1 - 2 * pad_ratio)
    off = size * pad_ratio
    lw = max(6, int(inner * THICK / 100))
    r = lw / 2

    def seg(x1, y1, x2, y2, color):
        p1 = (off + inner * x1 / 100, off + inner * y1 / 100)
        p2 = (off + inner * x2 / 100, off + inner * y2 / 100)
        d.line([p1, p2], fill=color + (255,), width=lw)
        for p in (p1, p2):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color + (255,))

    for x1, y1, x2, y2, color, _ in SEGS:
        seg(x1, y1, x2, y2, color)
    return img


def glow(size, strength=34):
    yy, xx = np.mgrid[0:size, 0:size]
    dd = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size * 0.62)
    a = (np.clip(1 - dd, 0, 1) ** 2.3 * strength).astype(np.uint8)
    return Image.fromarray(a).filter(ImageFilter.GaussianBlur(size // 26))


# 1) чистый знак на прозрачном
logo = draw_logo(S * SS, bg=None, pad_ratio=0.06).resize((S * 2, S * 2), Image.LANCZOS)
logo.save(os.path.join(OUT, "logo-good-2048.png"), "PNG", optimize=True)
print("  logo-good-2048.png · прозрачный, 2048")

# 2) аватар: тёмный круг
size = S * SS
gl = Image.new("RGB", (size, size), (58, 42, 24))
colored = draw_logo(size, bg=None, pad_ratio=0.12)
base_c = Image.new("RGB", (size, size), DARK)
base_c = Image.composite(gl, base_c, glow(size))
base_c.paste(colored, (0, 0), colored)

sq = base_c.resize((S, S), Image.LANCZOS)
sq.save(os.path.join(OUT, "avatar-logo-square.png"), "PNG", optimize=True)

mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).ellipse([0, 0, S - 1, S - 1], fill=255)
rd = Image.new("RGBA", (S, S), (0, 0, 0, 0))
rd.paste(sq, (0, 0), mask)
rd.save(os.path.join(OUT, "avatar-logo-round.png"), "PNG", optimize=True)
print("  avatar-logo-square.png / avatar-logo-round.png · 1024")

# 3) проверка мелкого размера
sheet = Image.new("RGB", (700, 210), (244, 245, 247))
d = ImageDraw.Draw(sheet)
for i, sz in enumerate((96, 64, 40, 32)):
    th = rd.resize((sz, sz), Image.LANCZOS)
    x = 34 + i * 120
    sheet.paste(th, (x, 46), th)
sheet.save(os.path.join(OUT, "avatar-logo-check.png"), "PNG")
print("  avatar-logo-check.png · 96/64/40/32 px")
