# -*- coding: utf-8 -*-
"""Вариант B для соцсетей: настоящий экран «Цель» в рамке, с подписью."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = r"C:\Users\боос\Documents\deepseek-harness\default-workspace\ship\good-growth\og"
SRC = os.path.join(BASE, "goal-raw.png")
OUT = os.path.join(BASE, "og-goal.png")

GEORGIA_I = r"C:\Windows\Fonts\georgiai.ttf"
CONSOLA = r"C:\Windows\Fonts\consola.ttf"
CONSOLAB = r"C:\Windows\Fonts\consolab.ttf"
INK = (244, 241, 234)
MUT = (166, 160, 148)
COPPER = (232, 165, 79)
COPPER_LT = (243, 197, 131)
BG = (9, 10, 12)

W, H = 1200, 630
img = Image.new("RGB", (W, H), BG)

# тёплое свечение сверху
yy, xx = np.mgrid[0:H, 0:W]
d = np.sqrt(((xx - W * 0.5) / (W * 0.7)) ** 2 + ((yy - H * 0.05) / (H * 0.7)) ** 2)
a = (np.clip(1 - d, 0, 1) ** 2.4 * 30).astype(np.uint8)
glow = Image.new("RGB", (W, H), COPPER)
img = Image.composite(glow, img, Image.fromarray(a).filter(ImageFilter.GaussianBlur(40)))

# вырезаем экран «Цель» из снимка (координаты в CSS px × 2)
raw = Image.open(SRC)
box = (240 * 2, 92 * 2, 1600 * 2, 545 * 2)
shot = raw.crop(box)
target_w = 1120
shot = shot.resize((target_w, int(shot.height * target_w / shot.width)), Image.LANCZOS)

# мягкая тень под снимком
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
x0 = (W - target_w) // 2
y0 = 66
sd.rounded_rectangle([x0 + 6, y0 + 10, x0 + target_w - 6, y0 + shot.height + 10], 18, fill=(0, 0, 0, 170))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))
img = Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB")

# рамка + вставка
mask = Image.new("L", shot.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width - 1, shot.height - 1], 16, fill=255)
img.paste(shot, (x0, y0), mask)
dr = ImageDraw.Draw(img)
dr.rounded_rectangle([x0, y0, x0 + target_w, y0 + shot.height], 16, outline=(232, 165, 79, 90), width=2)

# верхняя подпись
f_top = ImageFont.truetype(CONSOLAB, 15)
dr.text((x0 + 4, 34), "МАСТЕРСКАЯ СИСТЕМНОГО РОСТА", font=f_top, fill=COPPER)

# нижняя строка
line_y = y0 + shot.height + 34
dr.line([(x0, line_y), (x0 + target_w, line_y)], fill=(236, 226, 206, 30), width=1)
f_cta = ImageFont.truetype(GEORGIA_I, 26)
dr.text((x0 + 2, line_y + 18), "Первый разбор — бесплатно", font=f_cta, fill=(220, 214, 202))
f_sub = ImageFont.truetype(GEORGIA_I, 19)
dr.text((x0 + 2, line_y + 56), "из одной цели — разбор, ритм, посты и картинки", font=f_sub, fill=(150, 145, 134))

f_url = ImageFont.truetype(CONSOLAB, 16)
url = "GROWTH.GO-OOD.COM"
uw = sum(dr.textlength(ch, font=f_url) for ch in url) + 3 * (len(url) - 1)
dr.text((x0 + target_w - uw, line_y + 26), url, font=f_url, fill=COPPER)

img.save(OUT, "PNG", optimize=True)
print("  og-goal.png:", img.size, "·", round(os.path.getsize(OUT) / 1024, 1), "КБ")
