"""Снимки до/после. Запуск: python verify_shots.py <page>  (нужен Playwright)."""
import io
import os
import sys
import shutil
import subprocess
import threading
import functools
import http.server
import socketserver

from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(BASE, "live-pages")
SERVE = os.path.join(BASE, ".pilot-check")
PORT = 8731

# Часы на странице (schedule) идут сами — из-за них снимки всегда разные.
# Замораживаем время, чтобы сравнивать перевод, а не тиканье.
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
    # заглушка API, чтобы таблица и пустые состояния реально отрисовались
    os.makedirs(os.path.join(SERVE, "api"), exist_ok=True)
    io.open(os.path.join(SERVE, "api", "analytics"), "w", encoding="utf-8").write(
        '{"totals":{"brands":2,"goals":5,"posts":9,"published":3,"channels":2},'
        '"brands":[{"name":"Тест Капитана","goals":3,"posts":6,"published":2,'
        '"channels":1,"last_published_at":"2026-10-20 10:00"}]}')
    before = subprocess.run(["git", "-C", BASE, "show", "main:live-pages/%s.html" % page],
                            capture_output=True).stdout
    io.open(os.path.join(SERVE, "before.html"), "wb").write(before)
    return len(before)


def shoot(url, out, label):
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={"width": 1440, "height": 900})
        pg.add_init_script(FREEZE)
        pg.goto(url, wait_until="networkidle")
        pg.wait_for_timeout(1600)
        pg.screenshot(path=out, full_page=True)
        h = pg.evaluate("document.body.scrollHeight")
        n = pg.evaluate("document.body.innerText.length")
        r = pg.evaluate("document.documentElement.getAttribute('data-i18n-ready')")
        br.close()
    print("%-6s высота %s, символов %s, i18n-ready=%s" % (label, h, n, r))


def main():
    page = sys.argv[1] if len(sys.argv) > 1 else "login"
    print("перед-версия: %d байт" % build(page))
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SERVE)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        shoot("http://127.0.0.1:%d/before.html" % PORT,
              os.path.join(BASE, "%s-before.png" % page), "до")
        shoot("http://127.0.0.1:%d/%s.html" % (PORT, page),
              os.path.join(BASE, "%s-after.png" % page), "после")
    finally:
        srv.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
