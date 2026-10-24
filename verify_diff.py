"""Сравнение снимков. Запуск: python verify_diff.py <page>  (нужны numpy+Pillow)."""
import os
import sys
import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
page = sys.argv[1] if len(sys.argv) > 1 else "login"
a = np.asarray(Image.open(os.path.join(BASE, "%s-before.png" % page)).convert("RGB"), float)
b = np.asarray(Image.open(os.path.join(BASE, "%s-after.png" % page)).convert("RGB"), float)

print("до:    %s" % (a.shape,))
print("после: %s" % (b.shape,))
if a.shape != b.shape:
    print("ВЕРДИКТ: РАЗМЕР ИЗМЕНИЛСЯ — смотреть глазами")
    raise SystemExit(0)

d = np.abs(a - b).max(axis=2)
print("средняя разница:  %.3f" % d.mean())
print("изменилось > 8:   %d пикс. (%.3f%%)" % ((d > 8).sum(), (d > 8).mean() * 100))
print("ВЕРДИКТ: %s" % ("СТРАНИЦА НЕ ИЗМЕНИЛАСЬ" if d.mean() < 0.8 else "ЕСТЬ РАЗЛИЧИЯ"))
