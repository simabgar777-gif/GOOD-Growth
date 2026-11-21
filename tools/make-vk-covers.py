# -*- coding: utf-8 -*-
"""Обложки GOOD Growth для VK. Рисуем в 2× и уменьшаем — чтобы линии были гладкими."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = r"C:\Users\боос\Documents\deepseek-harness\default-workspace\ship\good-growth\vk-covers"
os.makedirs(OUT, exist_ok=True)
SS = 2  # суперсэмплинг

GEORGIA = r"C:\Windows\Fonts\georgia.ttf"
GEORGIA_I = r"C:\Windows\Fonts\georgiai.ttf"
CONSOLA = r"C:\Windows\Fonts\consola.ttf"
CONSOLAB = r"C:\Windows\Fonts\consolab.ttf"

BG = (7, 8, 10)
INK = (244, 241, 234)
MUT = (150, 145, 134)
COPPER = (232, 165, 79)
ORANGE = (242, 160, 61)
RED = (224, 71, 58)
GREEN = (89, 196, 106)
TEAL = (53, 214, 192)


def radial(w, h, cx, cy, rx, ry, peak):
    """Гладкое тёплое свечение."""
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    a = np.clip(1.0 - d, 0, 1) ** 2.2
    return (a * peak).astype(np.uint8)


def background(w, h, glow=(0.55, 0.30), grid=28):
    img = Image.new("RGB", (w, h), BG)
    # сетка
    g = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    for x in range(0, w, grid):
        gd.line([(x, 0), (x, h)], fill=(236, 226, 206, 8))
    for y in range(0, h, grid):
        gd.line([(0, y), (w, y)], fill=(236, 226, 206, 8))
    img = Image.alpha_composite(img.convert("RGBA"), g).convert("RGB")
    # свечение
    a = radial(w, h, int(w * glow[0]), int(h * glow[1]), w * 0.85, h * 0.62, 34)
    glow_img = Image.new("RGB", (w, h), COPPER)
    img = Image.composite(glow_img, img, Image.fromarray(a).filter(ImageFilter.GaussianBlur(w // 60)))
    # виньетка: центр 255, края 0
    v = radial(w, h, w / 2, h / 2, w * 0.92, h * 0.92, 255)
    mask = Image.fromarray(v).filter(ImageFilter.GaussianBlur(w // 40))
    dark = Image.new("RGB", (w, h), (3, 4, 5))
    return Image.composite(img, dark, mask)


def stroke(d, p1, p2, width, color):
    d.line([p1, p2], fill=color, width=width)
    r = width / 2
    for p in (p1, p2):
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def draw_mark(d, x, y, size):
    k = size
    lw = max(6, int(k * 0.115))
    L = (x + k * 0.10, y + k * 0.12)
    Lb = (x + k * 0.10, y + k * 0.88)
    M = (x + k * 0.50, y + k * 0.66)
    Rt = (x + k * 0.90, y + k * 0.12)
    Rb = (x + k * 0.90, y + k * 0.88)
    # левый штрих: красный низ, оранжевый верх
    stroke(d, L, Lb, lw, RED)
    mid = (L[0], L[1] + (Lb[1] - L[1]) * 0.55)
    stroke(d, L, mid, lw, ORANGE)
    stroke(d, L, M, lw, TEAL)
    stroke(d, M, Rt, lw, GREEN)
    stroke(d, Rt, Rb, lw, GREEN)


def F(path, size):
    return ImageFont.truetype(path, size * SS)


def spaced(d, xy, text, f, fill, tracking=0, center=False, width=None):
    ws = [d.textlength(ch, font=f) for ch in text]
    total = sum(ws) + tracking * SS * max(0, len(text) - 1)
    x, y = xy
    if center:
        x -= total / 2
    for ch, cw in zip(text, ws):
        d.text((x, y), ch, font=f, fill=fill)
        x += cw + tracking * SS
    return total


# ── широкая 1590×400 ───────────────────────────────────────────────────
W, H = 1590, 400
w, h = W * SS, H * SS
img = background(w, h, glow=(0.66, 0.18), grid=26 * SS)
d = ImageDraw.Draw(img)
mark = 128 * SS
draw_mark(d, 92 * SS, (h - mark) / 2 - 4 * SS, mark)
tx = (92 + 128 + 42) * SS
spaced(d, (tx, 120 * SS), "GOOD GROWTH", F(GEORGIA, 56), INK, tracking=2)
spaced(d, (tx + 2 * SS, 190 * SS), "МАСТЕРСКАЯ РОСТА", F(CONSOLAB, 15), COPPER, tracking=6)
d.line([(tx, 240 * SS), (tx + 410 * SS, 240 * SS)], fill=(232, 165, 79, 88), width=1 * SS)
d.text((tx, 262 * SS), "Рост — не удача. Это ремесло.", font=F(GEORGIA_I, 30), fill=(220, 214, 202))
spaced(d, (tx + 1 * SS, 318 * SS), "GROWTH.GO-OOD.COM", F(CONSOLA, 15), MUT, tracking=4)
img.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, "vk-cover-1590x400.png"), "PNG")
print("  vk-cover-1590x400.png")

# ── пять вертикальных 1080×1920 ────────────────────────────────────────
CARDS = [
    ("GOOD GROWTH", ["Рост — не удача.", "Это ремесло."], "МАСТЕРСКАЯ СИСТЕМНОГО РОСТА"),
    ("ЦЕЛЬ → СТРАТЕГИЯ", ["Разбор цели", "на одном дыхании"], "5 ВОПРОСОВ О ДЕЛЕ — И ПЛАН НА НЕДЕЛЮ"),
    ("РИТМ НЕДЕЛИ", ["Посты выходят", "сами, по времени"], "ПОДКЛЮЧИ КАНАЛ — И РИТМ ДЕРЖИТСЯ САМ"),
    ("ТИШИНА", ["Не пустота,", "а пространство"], "СВЕТ, А НЕ ЯРКОСТЬ. ДЕЛО, А НЕ ШУМ"),
    ("ПЕРВЫЙ РАЗБОР", ["Бесплатно.", "Без карты."], "GROWTH.GO-OOD.COM"),
]

for i, (kicker, lines, foot) in enumerate(CARDS, 1):
    W, H = 1080, 1920
    w, h = W * SS, H * SS
    img = background(w, h, glow=(0.5, 0.36), grid=32 * SS)
    d = ImageDraw.Draw(img)

    mark = 210 * SS
    draw_mark(d, (w - mark) / 2, 420 * SS, mark)

    spaced(d, (w / 2, 742 * SS), kicker, F(CONSOLAB, 24), COPPER, tracking=8, center=True)

    ft = F(GEORGIA, 64)
    y = 826 * SS
    for line in lines:
        tw = d.textlength(line, font=ft)
        d.text(((w - tw) / 2, y), line, font=ft, fill=INK)
        y += 80 * SS

    d.line([(w / 2 - 88 * SS, y + 32 * SS), (w / 2 + 88 * SS, y + 32 * SS)],
           fill=(232, 165, 79, 110), width=1 * SS)
    spaced(d, (w / 2, y + 70 * SS), foot, F(CONSOLA, 21), MUT, tracking=4, center=True)
    d.arc([-w * 0.15, h * 0.80, w * 1.15, h * 1.30], 200, 340, fill=(232, 165, 79, 66), width=1 * SS)

    img.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, "vk-mobile-%d-1080x1920.png" % i), "PNG")
    print("  vk-mobile-%d-1080x1920.png" % i)
print("  готово")
