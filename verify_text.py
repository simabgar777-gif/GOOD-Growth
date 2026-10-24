"""Построчное сравнение текста страницы до/после. Запуск: python verify_text.py <page>"""
import difflib
import functools
import http.server
import os
import shutil
import socketserver
import subprocess
import sys
import threading

from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(BASE, "live-pages")
SERVE = os.path.join(BASE, ".pilot-check")
PORT = 8733

FREEZE = """
(() => {
  const FIXED = new Date('2026-10-24T21:00:00+03:00').getTime();
  const Real = Date;
  function Fake(...args) {
    if (args.length === 0) return new Real(FIXED);
    return new Real(...args);
  }
  Fake.now = () => FIXED;
  Fake.parse = Real.parse;
  Fake.UTC = Real.UTC;
  Fake.prototype = Real.prototype;
  window.Date = Fake;
})();
"""


def build(page):
    if os.path.isdir(SERVE):
        shutil.rmtree(SERVE)
    os.makedirs(SERVE)
    for f in os.listdir(LIVE):
        shutil.copy2(os.path.join(LIVE, f), os.path.join(SERVE, f))
    shutil.copytree(os.path.join(BASE, "public", "i18n"), os.path.join(SERVE, "i18n"))
    os.makedirs(os.path.join(SERVE, "api"), exist_ok=True)
    with open(os.path.join(SERVE, "api", "analytics"), "w", encoding="utf-8") as fh:
        fh.write('{"totals":{"brands":2,"goals":5,"posts":9,"published":3,"channels":2},'
                 '"brands":[{"name":"Тест Капитана","goals":3,"posts":6,"published":2,'
                 '"channels":1,"last_published_at":"2026-10-20 10:00"}]}')
    before = subprocess.run(["git", "-C", BASE, "show", "main:live-pages/%s.html" % page],
                            capture_output=True).stdout
    with open(os.path.join(SERVE, "before.html"), "wb") as fh:
        fh.write(before)


def text_of(pg, url):
    pg.goto(url, wait_until="networkidle")
    pg.wait_for_timeout(1800)
    return [l.strip() for l in pg.evaluate("document.body.innerText").splitlines() if l.strip()]


def main():
    page = sys.argv[1]
    build(page)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SERVE)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            br = p.chromium.launch()
            pg = br.new_page(viewport={"width": 1440, "height": 900})
            pg.add_init_script(FREEZE)
            a = text_of(pg, "http://127.0.0.1:%d/before.html" % PORT)
            b = text_of(pg, "http://127.0.0.1:%d/%s.html" % (PORT, page))
            br.close()
    finally:
        srv.shutdown()

    print("строк до: %d, после: %d" % (len(a), len(b)))
    diff = list(difflib.unified_diff(a, b, "ДО", "ПОСЛЕ", lineterm="", n=1))
    if not diff:
        print("ТЕКСТ ИДЕНТИЧЕН")
        return 0
    for line in diff:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
