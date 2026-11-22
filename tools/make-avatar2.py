# -*- coding: utf-8 -*-
"""Аватар: три варианта знака на тёмном, проверка в мелком размере."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = r"C:\Users\боос\Documents\deepseek-harness\default-workspace\ship\good-growth\og"
S = 1024
SS = 2
BG = (8, 9, 11)


def mark_mask(size, k_ratio=0.56, lw_ratio=0.13):
    """Белая маска знака M."""
    lay = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(lay)
    k = size * k_ratio
    x = (size - k) / 2
    y = (size - k) / 2
    lw = int(k * lw_ratio)
    L = (x + k * 0.05, y + k * 0.08)
    Lb = (x + k * 0.05, y + k * 0.92)
    M = (x + k * 0.50, y + k * 0.70)
    Rt = (x + k * 0.95, y + k * 0.08)
    Rb = (x + k * 0.95, y + k * 0.92)

    def seg(p1, p2):
        d.line([p1, p2], fill=255, width=lw)
        r = lw / 2
        for p in (p1, p2):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)

    seg(L, Lb)
    seg(L, M)
    seg(M, Rt)
    seg(Rt, Rb)
    return lay


def linear_gradient(size, top, bottom):
    g = np.zeros((size, size, 3), dtype=np.uint8)
    for y in range(size):
        t = y / max(1, size - 1)
        g[y, :, 0] = int(top[0] + (bottom[0] - top[0]) * t)
        g[y, :, 1] = int(top[1] + (bottom[1] - top[1]) * t)
        g[y, :, 2] = int(top[2] + (bottom[2] - top[2]) * t)
    return Image.fromarray(g)


def glow_layer(size, strength=44):
    yy, xx = np.mgrid[0:size, 0:size]
    d = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size * 0.62)
    a = (np.clip(1 - d, 0, 1) ** 2.3 * strength).astype(np.uint8)
    return Image.fromarray(a).filter(ImageFilter.GaussianBlur(size // 28))


def build(kind, name):
    size = S * SS
    base = Image.new("RGB", (size, size), BG)
    glow = Image.new("RGB", (size, size), (62, 45, 26))
    base = Image.composite(glow, base, glow_layer(size))

    mask = mark_mask(size)

    if kind == "copper":
        grad = linear_gradient(size, (250, 210, 148), (205, 132, 52))
        fg = grad
    elif kind == "cream":
        grad = linear_gradient(size, (248, 246, 240), (214, 208, 196))
        fg = grad
    else:  # colorful
        fg = Image.new("RGB", (size, size), (0, 0, 0))
        d = ImageDraw.Draw(fg)
        k = size * 0.56
        x = (size - k) / 2
        y = (size - k) / 2
        lw = int(k * 0.13)
        L = (x + k * 0.05, y + k * 0.08)
        Lb = (x + k * 0.05, y + k * 0.92)
        M = (x + k * 0.50, y + k * 0.70)
        Rt = (x + k * 0.95, y + k * 0.08)
        Rb = (x + k * 0.95, y + k * 0.92)

        def seg(p1, p2, color):
            d.line([p1, p2], fill=color, width=lw)
            r = lw / 2
            for p in (p1, p2):
                d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)

        seg(L, (L[0], L[1] + (Lb[1] - L[1]) * 0.5), (242, 160, 61))
        seg((L[0], L[1] + (Lb[1] - L[1]) * 0.5), Lb, (224, 71, 58))
        seg(L, M, (53, 214, 192))
        seg(M, Rt, (120, 208, 120))
        seg(Rt, Rb, (89, 196, 106))

    out = Image.new("RGB", (size, size), BG)
    out = Image.composite(fg, base, mask)

    if kind == "cream":
        ring = ImageDraw.Draw(out)
        pad = int(size * 0.055)
        ring.ellipse([pad, pad, size - pad, size - pad], outline=(232, 165, 79), width=int(size * 0.011))

    out = out.resize((S, S), Image.LANCZOS)

    # круглая версия
    cmask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(cmask).ellipse([0, 0, S - 1, S - 1], fill=255)
    circle = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    circle.paste(out, (0, 0), cmask)
    square_path = os.path.join(OUT, "avatar-%s-square.png" % kind)
    round_path = os.path.join(OUT, "avatar-%s-round.png" % kind)
    out.save(square_path, "PNG", optimize=True)
    circle.save(round_path, "PNG", optimize=True)
    print("  %-9s квадрат %5.1f КБ · круг %5.1f КБ" % (kind, os.path.getsize(square_path) / 1024, os.path.getsize(round_path) / 1024))
    return circle


imgs = [build(k, k) for k in ("copper", "cream", "colorful")]

# лист проверки: 96 / 64 / 40 px
sheet = Image.new("RGB", (760, 260), (244, 245, 247))
d = ImageDraw.Draw(sheet)
labels = ["медь", "крем", "цвет"]
for row, im in enumerate(imgs):
    for col, sz in enumerate((96, 64, 40)):
        th = im.resize((sz, sz), Image.LANCZOS)
        x = 40 + col * 120
        y = 30 + row * 78
        sheet.paste(th, (x, y), th)
    d.text((400, 34 + row * 78), labels[row], fill=(40, 40, 40))
sheet.save(os.path.join(OUT, "avatar-variants-check.png"), "PNG")
print("  avatar-variants-check.png")
