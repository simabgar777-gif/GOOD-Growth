# -*- coding: utf-8 -*-
"""Ищет дизайн-заглушки (PLACEHOLDER:) в файлах проекта.

Заглушки — цифры и подписи, которые стоят «для вида» на время стройки.
Перед открытием список должен стать пустым: см. PRELAUNCH-CHECKLIST.md
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN_DIRS = ["landing-live", "live-pages", "public"]
EXT = (".html", ".js", ".css", ".json")
PATTERN = re.compile(r"PLACEHOLDER:([A-Za-z0-9_\-]+)")


def scan():
    hits = []
    for d in SCAN_DIRS:
        base = os.path.join(ROOT, d)
        if not os.path.isdir(base):
            continue
        for dirpath, _dirs, files in os.walk(base):
            if "node_modules" in dirpath:
                continue
            for name in files:
                if not name.endswith(EXT):
                    continue
                path = os.path.join(dirpath, name)
                try:
                    text = io.open(path, encoding="utf-8").read()
                except Exception:
                    continue
                lines = text.split("\n")
                for m in PATTERN.finditer(text):
                    line_no = text.count("\n", 0, m.start()) + 1
                    context = lines[line_no - 1].strip()[:120]
                    hits.append((os.path.relpath(path, ROOT), line_no, m.group(1), context))
    return hits


def main():
    hits = scan()
    if not hits:
        print("  заглушек нет — можно открываться ✓")
        return 0
    print("  найдено заглушек: %d" % len(hits))
    print()
    for path, line, tag, ctx in hits:
        print("  %s:%d" % (path, line))
        print("     [%s] %s" % (tag, ctx))
    print()
    print("  заменить по списку: PRELAUNCH-CHECKLIST.md")
    return 1


if __name__ == "__main__":
    sys.exit(main())
