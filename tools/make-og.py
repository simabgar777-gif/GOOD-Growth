# -*- coding: utf-8 -*-
"""Обложка для соцсетей (OG): 1200×630 в каноне GOOD."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = r"C:\Users\боос\Documents\deepseek-harness\default-workspace\ship\good-growth\og"
os.makedirs(OUT_DIR, exist_ok=True)
SS = 2

GEORGIA = r"C:\Windows\Fonts\georgia.ttf"
GEORGIA_I = r"C:\Windows\Fonts\georgiai.ttf"
CONSOLA = r"C:\Windows\Fonts\consola.ttf"
CONSOLAB = r"C:\Windows\Fonts\consolab.ttf"

BG = (7, 8, 10)
INK = (244, 241, 234)
MUT = (166, 160, 148)
COPPER = (232, 165, 79)
COPPER_LT = (243, 197, 131)
ORANGE = (242, 160, 61)
RED = (224, 71, 58)
GREEN = (89, 196, 106)
TEAL = (53, 214, 192)


def radial(w, h, cx, cy, rx, ry, peak):
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    a = np.clip(1.0 - d, 0, 1) ** 2.1
    return (a * peak).astype(np.uint8)


def background(w, h):
    img = Image.new("RGB", (w, h), BG)
    g = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    step = 34 * SS
    for x in range(0, w, step):
        gd.line([(x, 0), (x, h)], fill=(236, 226, 206, 9))
    for y in range(0, h, step):
        gd.line([(0, y), (w, y)], fill=(236, 226, 206, 9))
    img = Image.alpha_composite(img.convert("RGBA"), g).convert("RGB")

    # тёплый свет справа сверху
    a = radial(w, h, int(w * 0.82), int(h * 0.06), w * 0.62, h * 0.85, 46)
    glow = Image.new("RGB", (w, h), COPPER)
    img = Image.composite(glow, img, Image.fromarray(a).filter(ImageFilter.GaussianBlur(w // 80)))

    # мягкая виньетка
    v = radial(w, h, w / 2, h / 2, w * 0.95, h * 0.95, 255)
    mask = Image.fromarray(v).filter(ImageFilter.GaussianBlur(w // 45))
    dark = Image.new("RGB", (w, h), (3, 4, 5))
    return Image.composite(img, dark, mask)


def stroke(d, p1, p2, width, color):
    d.line([p1, p2], fill=color, width=width)
    r = width / 2
    for p in (p1, p2):
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def draw_mark(d, x, y, k):
    lw = max(6, int(k * 0.115))
    L = (x + k * 0.10, y + k * 0.12)
    Lb = (x + k * 0.10, y + k * 0.88)
    M = (x + k * 0.50, y + k * 0.66)
    Rt = (x + k * 0.90, y + k * 0.12)
    Rb = (x + k * 0.90, y + k * 0.88)
    stroke(d, L, Lb, lw, RED)
    mid = (L[0], L[1] + (Lb[1] - L[1]) * 0.55)
    stroke(d, L, mid, lw, ORANGE)
    stroke(d, L, M, lw, TEAL)
    stroke(d, M, Rt, lw, GREEN)
    stroke(d, Rt, Rb, lw, GREEN)


def F(path, size):
    return ImageFont.truetype(path, int(size * SS))


def spaced(d, xy, text, f, fill, tracking=0):
    ws = [d.textlength(ch, font=f) for ch in text]
    x, y = xy
    for ch, cw in zip(text, ws):
        d.text((x, y), ch, font=f, fill=fill)
        x += cw + tracking * SS
    return sum(ws) + tracking * SS * max(0, len(text) - 1)


W, H = 1200, 630
w, h = W * SS, H * SS
img = background(w, h)
d = ImageDraw.Draw(img)

# знак слева
mark = 150 * SS
draw_mark(d, 74 * SS, (h - mark) / 2 - 26 * SS, mark)

tx = (74 + 150 + 46) * SS

# верхняя мелкая строка
spaced(d, (tx, 128 * SS), "МАСТЕРСКАЯ СИСТЕМНОГО РОСТА", F(CONSOLAB, 15), COPPER, tracking=6)

# имя
spaced(d, (tx, 168 * SS), "GOOD GROWTH", F(GEORGIA, 62), INK, tracking=2)

# слоган
d.text((tx, 252 * SS), "Рост — не удача.", font=F(GEORGIA, 46), fill=(226, 220, 208))
d.text((tx, 306 * SS), "Это ремесло.", font=F(GEORGIA_I, 46), fill=COPPER_LT)

# линия
d.line([(tx, 386 * SS), (tx + 420 * SS, 386 * SS)], fill=(232, 165, 79, 110), width=1 * SS)

# что делает
d.text((tx, 410 * SS), "Цель · разбор · ритм · посты", font=F(CONSOLA, 20), fill=(206, 200, 188))

# адрес
spaced(d, (tx, 470 * SS), "GROWTH.GO-OOD.COM", F(CONSOLAB, 17), COPPER_LT, tracking=4)

# нижняя строка-приглашение
d.line([(74 * SS, 548 * SS), (1126 * SS, 548 * SS)], fill=(236, 226, 206, 22), width=1 * SS)
d.text((74 * SS, 572 * SS), "Первый разбор — бесплатно", font=F(GEORGIA_I, 24), fill=(214, 208, 196))
w_gg = sum(d.textlength(ch, font=F(CONSOLAB, 14)) for ch in "GOOD GROWTH") + 4 * SS * (len("GOOD GROWTH") - 1)
spaced(d, (1126 * SS - w_gg, 574 * SS), "GOOD GROWTH", F(CONSOLAB, 14), COPPER, tracking=4)

img.resize((W, H), Image.LANCZOS).save(os.path.join(OUT_DIR, "og-good-growth.png"), "PNG", optimize=True)
print("  og-good-growth.png 1200×630")
