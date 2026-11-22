# -*- coding: utf-8 -*-
"""Аватар для соцсетей: только знак, без текста. Круг и квадрат."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUT = r"C:\Users\боос\Documents\deepseek-harness\default-workspace\ship\good-growth\og"
os.makedirs(OUT, exist_ok=True)

S = 1024
SS = 2  # рисуем в 2048 и уменьшаем
BG = (8, 9, 11)
COPPER = (232, 165, 79)
COPPER_LT = (243, 197, 131)
ORANGE = (242, 160, 61)
RED = (224, 71, 58)
GREEN = (89, 196, 106)
TEAL = (53, 214, 192)


def radial_alpha(size, cx, cy, r, power=2.2):
    yy, xx = np.mgrid[0:size, 0:size]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    return (np.clip(1 - d, 0, 1) ** power)


def draw_mark(d, x, y, k, lw_ratio=0.125):
    lw = max(4, int(k * lw_ratio))
    L = (x + k * 0.06, y + k * 0.10)
    Lb = (x + k * 0.06, y + k * 0.90)
    M = (x + k * 0.50, y + k * 0.68)
    Rt = (x + k * 0.94, y + k * 0.10)
    Rb = (x + k * 0.94, y + k * 0.90)

    def seg(p1, p2, color):
        d.line([p1, p2], fill=color, width=lw)
        r = lw / 2
        for p in (p1, p2):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)

    mid = (L[0], L[1] + (Lb[1] - L[1]) * 0.55)
    seg(L, mid, ORANGE)          # левая перекладина, низ — тёплый
    seg(L, Lb, RED)              # нижняя часть
    seg(L, M, TEAL)              # диагональ вниз
    seg(M, Rt, GREEN)            # диагональ вверх
    seg(Rt, Rb, GREEN)           # правая стойка


def make(bg_mode="square"):
    size = S * SS
    img = Image.new("RGB", (size, size), BG)
    # мягкое свечение в центре
    a = (radial_alpha(size, size / 2, size / 2, size * 0.62) * 40).astype(np.uint8)
    glow = Image.new("RGB", (size, size), (60, 44, 26))
    img = Image.composite(glow, img, Image.fromarray(a).filter(ImageFilter.GaussianBlur(size // 30)))

    d = ImageDraw.Draw(img)
    k = size * 0.56
    draw_mark(d, (size - k) / 2, (size - k) / 2, k)

    img = img.resize((S, S), Image.LANCZOS)

    # круглая маска
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, S - 1, S - 1], fill=255)
    circle = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    circle.paste(img, (0, 0), mask)

    if bg_mode == "round":
        circle.save(os.path.join(OUT, "avatar-round.png"), "PNG", optimize=True)
        print("  avatar-round.png · 1024×1024 · прозрачный круг")
    else:
        img.save(os.path.join(OUT, "avatar-square.png"), "PNG", optimize=True)
        print("  avatar-square.png · 1024×1024 · тёмный квадрат")

    # проверка мелкого размера
    small = circle.resize((64, 64), Image.LANCZOS)
    return small


small = make("square")
make("round")

# лист проверки: 64 и 40 px на фоне ленты
sheet = Image.new("RGB", (420, 220), (245, 246, 248))
sd = ImageDraw.Draw(sheet)
for i, sz in enumerate((96, 64, 40)):
    im = small.resize((sz, sz), Image.LANCZOS)
    x = 30 + i * 130
    sheet.paste(im, (x, 40), im)
    sd.ellipse([x, 40, x + sz, 40 + sz], outline=(200, 200, 200))
sheet.save(os.path.join(OUT, "avatar-check.png"), "PNG")
print("  avatar-check.png · как выглядит в ленте (96/64/40 px)")
