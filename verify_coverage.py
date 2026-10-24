"""Покрытие перевода для страницы. Запуск: python verify_coverage.py <page>  (нужен lxml)."""
import io
import os
import re
import sys
import subprocess
from lxml import html as LH

BASE = os.path.dirname(os.path.abspath(__file__))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
RU = re.compile(r"[\u0400-\u04FF]")
SKIP = ("script", "style", "title")

# Намеренно не переводим: это заставки, которые скрипт страницы заменяет
# своим текстом через ggT(). Пометить их data-i18n = гонка (словарь придёт
# позже и перезапишет живой текст на «Загрузка…»). Проверено опытом.
ALLOW = {
    "channels": {"Загрузка…", "Загружаю…"},
    # «Пост» в #mTitle — подпись, которую скрипт заменяет на «Пост № N».
    "schedule": {"Пост"},
    # заставка, которую скрипт сразу заменяет содержимым карточки
    "accept-invite": {"Загружаю приглашение…"},
    # заставка панели тарифа и текст кнопки до скрипта — их ставит JS
    "billing": {"Загружаю тариф…", "Оплатить"},
    # текст режима ставит app.js
    "index": {"проверяю…"},
    # заставка, которую скрипт заменяет содержимым профиля
    "profile": {"Загружаю профиль…"},
}


def check(path, label, page=None):
    allow = ALLOW.get(page or "", set())
    doc = LH.fromstring(io.open(path, encoding="utf-8").read())
    uncovered = []
    for node in doc.iter():
        if not isinstance(node.tag, str) or node.tag in SKIP:
            continue
        for txt in (node.text, node.tail):
            if txt and RU.search(txt):
                if not node.get("data-i18n") and not (
                    node.getparent() is not None and node.getparent().get("data-i18n")
                ):
                    s = re.sub(r"\s+", " ", txt).strip()
                    if s not in allow:
                        uncovered.append(s)
    attr_left = []
    for node in doc.iter():
        if not isinstance(node.tag, str):
            continue
        for a in ("placeholder", "aria-label", "title", "alt"):
            v = node.get(a)
            if v and RU.search(v) and not node.get("data-i18n-attr"):
                attr_left.append("%s=%s" % (a, v))
    print("[%s] разметка без data-i18n: %d" % (label, len(uncovered)))
    for s in uncovered[:8]:
        print("    <<%s>>" % s[:70])
    print("[%s] атрибуты без пометки:   %d" % (label, len(attr_left)))
    for s in attr_left[:8]:
        print("    %s" % s[:70])
    return len(uncovered) + len(attr_left)


def main():
    page = sys.argv[1] if len(sys.argv) > 1 else "login"
    rel = "live-pages/%s.html" % page
    before = subprocess.run(["git", "-C", BASE, "show", "main:%s" % rel],
                            capture_output=True).stdout
    tmp = os.path.join(BASE, ".before-%s.html" % page)
    io.open(tmp, "wb").write(before)
    a = check(tmp, "до", page)
    b = check(os.path.join(BASE, "live-pages", "%s.html" % page), "после", page)
    os.remove(tmp)
    print("\nСТРАНИЦА %s: было непокрыто %d, стало %d" % (page, a, b))
    print("ВЕРДИКТ: %s" % ("всё покрыто" if b == 0 else "осталось %d" % b))
    return 0 if b == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
