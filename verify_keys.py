"""Сверка: все ключи, на которые ссылаются страницы, должны быть в ru.json.

Ловит то, что пропустила проверка покрытия:
data-i18n / data-i18n-attr / ggT('key' — есть в разметке, но нет в словаре.
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(BASE, "live-pages")
DICT = os.path.join(BASE, "public", "i18n", "ru.json")

RE_ATTR = re.compile(r'data-i18n="([^"]+)"')
RE_ATTRS = re.compile(r'data-i18n-attr="([^"]+)"')
RE_GGT = re.compile(r"ggT\(\s*'([^']+)'")


def main():
    d = json.load(io.open(DICT, encoding="utf-8"))
    keys = {k for k in d if not k.startswith("_")}

    missing, used = [], 0
    pages = sorted(f for f in os.listdir(LIVE) if f.endswith(".html"))
    checked = 0
    for f in pages:
        src = io.open(os.path.join(LIVE, f), encoding="utf-8").read()
        refs = set(RE_ATTR.findall(src))
        for spec in RE_ATTRS.findall(src):
            for pair in spec.split(","):
                if ":" in pair:
                    refs.add(pair.split(":", 1)[1].strip())
        refs |= set(RE_GGT.findall(src))
        if not refs:
            continue
        checked += 1
        used += len(refs)
        for k in sorted(refs):
            if k not in keys:
                missing.append((f, k))

    print("страниц с ключами: %d · ссылок на ключи: %d · ключей в словаре: %d"
          % (checked, used, len(keys)))
    print("НЕТ В СЛОВАРЕ: %d" % len(missing))
    for f, k in missing[:30]:
        print("   %-22s %s" % (f, k))
    # обратная проверка: ключи, на которые никто не ссылается
    unused = sorted(keys - {k for _f, k in missing} - set())
    all_refs = set()
    for f in pages:
        src = io.open(os.path.join(LIVE, f), encoding="utf-8").read()
        all_refs |= set(RE_ATTR.findall(src))
        for spec in RE_ATTRS.findall(src):
            for pair in spec.split(","):
                if ":" in pair:
                    all_refs.add(pair.split(":", 1)[1].strip())
        all_refs |= set(RE_GGT.findall(src))
    orphan = sorted(k for k in keys if k not in all_refs)
    print("\nключей, на которые никто не ссылается: %d" % len(orphan))
    for k in orphan[:15]:
        print("   %s" % k)

    print("\nВЕРДИКТ: %s" % ("все ключи на месте" if not missing
                             else "НЕ ХВАТАЕТ %d ключей" % len(missing)))
    return 0 if not missing else 2


if __name__ == "__main__":
    raise SystemExit(main())
