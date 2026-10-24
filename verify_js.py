"""Синтаксис встроенного JS на страницах. Запуск: python verify_js.py [страница ...]

Зачем: ошибка в строке скрипта не видна ни покрытию (оно смотрит разметку),
ни сравнению текста (страница просто не отрисуется). Ловится только парсером.
"""
import io
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(BASE, "live-pages")
RE_SCRIPT = re.compile(r"<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>", re.I)


def check_page(name):
    p = os.path.join(LIVE, "%s.html" % name)
    s = io.open(p, encoding="utf-8").read()
    blocks = [b for b in RE_SCRIPT.findall(s) if b.strip()]
    if not blocks:
        return True, []
    problems = []
    for i, b in enumerate(blocks):
        tmp = os.path.join(BASE, ".syntax-%s-%d.js" % (name, i))
        io.open(tmp, "w", encoding="utf-8").write(b)
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            m = re.search(r"\.js:(\d+)", r.stderr or "")
            ln = int(m.group(1)) if m else 0
            src = b.splitlines()
            ctx = ""
            if 0 < ln <= len(src):
                ctx = src[ln - 1].strip()[:200]
            problems.append((i, ln, ctx))
        os.remove(tmp)
    return not problems, problems


def main():
    pages = sys.argv[1:]
    if not pages:
        pages = sorted(f[:-5] for f in os.listdir(LIVE) if f.endswith(".html"))
    bad = 0
    for name in pages:
        ok, problems = check_page(name)
        if ok:
            print("  %-18s JS ok" % name)
        else:
            bad += 1
            print("  %-18s ОШИБКА JS" % name)
            for i, ln, ctx in problems:
                print("      блок %d, строка %d: %s" % (i, ln, ctx))
    print("\nВЕРДИКТ: %s" % ("синтаксис чист на всех страницах" if not bad
                             else "сломано страниц: %d" % bad))
    return 0 if not bad else 2


if __name__ == "__main__":
    raise SystemExit(main())
