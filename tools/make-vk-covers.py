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

# Знак GOOD — каноническая геометрия бренд-пакета (viewBox 238.58 162.26 73.34 100.16,
# stroke-width 11, round cap/join). Снята пиксельно с референса и подогнана
# под оригинал студии по IoU масок.
# Источник правды: бренд-пакет _mark.js (C:\Users\боос\.minimax-agent\projects\good-growth-logo\_mark.js)
ORANGE = (248, 150, 29)   # #F8961D
TEAL = (40, 169, 146)     # #28A992
RED = (224, 31, 39)       # #E01F27
GREEN = (76, 184, 83)     # #4CB853

# Отрезки в координатах знака (единый масштаб по обеим осям, без искажений)
SEGS = [
    (256.25, 190.88, 244.60, 179.70, ORANGE),   # оранжевый: верхний крюк
    (244.60, 179.70, 244.08, 256.64, ORANGE),   # оранжевый: левая стойка
    (306.42, 167.76, 264.33, 209.33, TEAL),     # бирюзовая диагональ
    (287.58, 214.62, 244.33, 256.92, RED),      # красная диагональ
    (294.50, 233.19, 305.70, 243.90, GREEN),    # зелёный: нижний крюк
    (305.70, 243.90, 306.40, 170.20, GREEN),    # зелёный: правая стойка
]
STROKE = 11.0   # толщина штриха в координатах знака

# границы чернил знака (с учётом скруглённых концов)
_xs = [v for s in SEGS for v in (s[0], s[2])]
_ys = [v for s in SEGS for v in (s[1], s[3])]
INK_X0, INK_X1 = min(_xs) - STROKE / 2, max(_xs) + STROKE / 2
INK_Y0, INK_Y1 = min(_ys) - STROKE / 2, max(_ys) + STROKE / 2
INK_W = INK_X1 - INK_X0   # ширина чернил = 73.34
INK_H = INK_Y1 - INK_Y0   # высота чернил = 100.16


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


def draw_mark(d, x, y, size):
    """Знак GOOD четырьмя обводками — ровно на месте прежнего глифа M:
    та же ширина чернил, тот же левый край и тот же центр по вертикали.
    Геометрия — из бренд-пакета (единый масштаб по обеим осям).
    Всё остальное в обложке не тронуто."""
    target = 0.913 * size             # ширина чернил у прежнего глифа
    s = target / INK_W               # единый масштаб: ширина и высота вместе
    off_x = (x + 0.0435 * size) - INK_X0 * s
    off_y = (y + 0.5 * size) - ((INK_Y0 + INK_Y1) / 2) * s
    lw = max(6, int(round(STROKE * s)))
    r = lw / 2
    for x1, y1, x2, y2, color in SEGS:
        p1 = (off_x + x1 * s, off_y + y1 * s)
        p2 = (off_x + x2 * s, off_y + y2 * s)
        d.line([p1, p2], fill=color, width=lw)
        for p in (p1, p2):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


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
