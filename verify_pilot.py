"""Проверка пилота: покрытие перевода + снимки до/после без изменений.

1. lxml: находит русский текст, чей ближайший элемент НЕ помечен data-i18n.
2. Поднимает локальный сервер и снимает старую и новую страницу.
3. Сравнивает картинки: страница не должна измениться.
"""
import io
import os
import shutil
import subprocess
import threading
import functools
import http.server
import socketserver
import re

from lxml import html as LH
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(BASE, "live-pages")
SERVE = os.path.join(BASE, ".pilot-check")
RU = re.compile(r"[\u0400-\u04FF]")
PORT = 8731


def coverage_check(path, label):
    doc = LH.fromstring(io.open(path, encoding="utf-8").read())
    uncovered = []
    for node in doc.iter():
        if not isinstance(node.tag, str) or node.tag in ("script", "style", "title"):
            continue
        for txt in (node.text, node.tail):
            if txt and RU.search(txt):
                if not node.get("data-i18n") and not (
                    node.getparent() is not None and node.getparent().get("data-i18n")
                ):
                    uncovered.append(re.sub(r"\s+", " ", txt).strip())
    # атрибуты
    attr_left = []
    for node in doc.iter():
        if not isinstance(node.tag, str):
            continue
        for a in ("placeholder", "aria-label", "title", "alt"):
            v = node.get(a)
            if v and RU.search(v) and not node.get("data-i18n-attr"):
                attr_left.append("%s=%s" % (a, v))
    print("[%s] русский текст БЕЗ data-i18n: %d" % (label, len(uncovered)))
    for s in uncovered[:10]:
        print("    «%s»" % s[:70])
    print("[%s] русский в атрибутах БЕЗ data-i18n-attr: %d" % (label, len(attr_left)))
    for s in attr_left[:10]:
        print("    %s" % s[:70])
    return len(uncovered), len(attr_left)


def build_serve_dir():
    if os.path.isdir(SERVE):
        shutil.rmtree(SERVE)
    os.makedirs(SERVE)
    for f in os.listdir(LIVE):
        shutil.copy2(os.path.join(LIVE, f), os.path.join(SERVE, f))
    # словарь и загрузчик
    shutil.copytree(os.path.join(BASE, "public", "i18n"), os.path.join(SERVE, "i18n"))
    # версия ДО правки — из git
    before = subprocess.run(
        ["git", "-C", BASE, "show", "main:live-pages/login.html"],
        capture_output=True)
    io.open(os.path.join(SERVE, "before.html"), "wb").write(before.stdout)
    return len(before.stdout)


def shoot(url, out):
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={"width": 1440, "height": 900})
        pg.goto(url, wait_until="networkidle")
        pg.wait_for_timeout(1200)
        pg.screenshot(path=out)
        # размер и текст
        h = pg.evaluate("document.body.scrollHeight")
        n = pg.evaluate("document.body.innerText.length")
        ready = pg.evaluate("document.documentElement.getAttribute('data-i18n-ready')")
        br.close()
        return h, n, ready


def main():
    print("=== 1. ПОКРЫТИЕ ===")
    coverage_check(os.path.join(SERVE_BEFORE := os.path.join(BASE, ".pilot-check"),
                                "before.html"), "до")
    coverage_check(os.path.join(LIVE, "login.html"), "после")

    print("\n=== 2. СНИМКИ ===")
    os.chdir(SERVE)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SERVE)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    b = shoot("http://127.0.0.1:%d/before.html" % PORT, os.path.join(BASE, "pilot-before.png"))
    a = shoot("http://127.0.0.1:%d/login.html" % PORT, os.path.join(BASE, "pilot-after.png"))
    srv.shutdown()

    print("до:    высота %s, символов %s" % (b[0], b[1]))
    print("после: высота %s, символов %s, data-i18n-ready=%s" % (a[0], a[1], a[2]))

    print("\n=== 3. СРАВНЕНИЕ КАРТИНОК ===")
    x = np.asarray(Image.open(os.path.join(BASE, "pilot-before.png")).convert("RGB"), float)
    y = np.asarray(Image.open(os.path.join(BASE, "pilot-after.png")).convert("RGB"), float)
    if x.shape != y.shape:
        print("РАЗНЫЙ РАЗМЕР: %s vs %s" % (x.shape, y.shape))
        return 1
    d = np.abs(x - y).max(axis=2)
    print("средняя разница:          %.3f" % d.mean())
    print("пикселей изменилось > 8:  %d (%.3f%%)" % ((d > 8).sum(), (d > 8).mean() * 100))
    print("ВЕРДИКТ: %s" % ("СТРАНИЦА НЕ ИЗМЕНИЛАСЬ" if d.mean() < 0.6 else "ЕСТЬ РАЗЛИЧИЯ — смотреть"))
    return 0


if __name__ == "__main__":
    n = build_serve_dir()
    print("перед-версия из git: %d байт" % n)
    raise SystemExit(main())
