"""СЛИЯНИЕ двух версий после отката 26.10.

Что случилось: на прод выложили index.html из СТАРОЙ ветки — с фичей
«формат и модель» (Order 87), но без нашей работы (блоки, тема, словарь,
панель). Скрипт app.js при этом НЕ обновили — поэтому кнопки формата мертвы.

Здесь соединяем:
  · app.js        = ИХ версия (с фичей) + НАША правка «одна строка»
  · index.html    = НАША версия (блоки/тема/словарь/панель) + ИХ блок «формат»

Источник их версий: /root/bak/o87-formats/index.html.o87 и app.js.o87
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
# от ship/good-growth вверх ДВА уровня — до default-workspace
SRC = os.path.join(os.path.dirname(os.path.dirname(BASE)),
                   "refs", "timeweb", "fromserver")
REPO = BASE

THEIR_JS = os.path.join(SRC, "app.js.o87")
THEIR_HTML = os.path.join(SRC, "index.html.o87")
MY_JS = os.path.join(REPO, "public", "app.js")
MY_HTML = os.path.join(REPO, "live-pages", "index.html")

OUT_JS = os.path.join(REPO, "public", "app.js")
OUT_HTML = os.path.join(REPO, "live-pages", "index.html")

# ── наша правка режима (та, что даёт «одну строку» по умолчанию)
MY_BLOCK = """/* переключение тёплый/быстрый вход
   Приказ №78: по умолчанию — ОДНА СТРОКА, как в одобренном дизайне.
   Пять вопросов — по ссылке «или пять вопросов — точнее».
   Раньше было quickMode = false: человек сразу видел стену из пяти полей. */
let quickMode = true;
function applyQuickMode() {
  warmForm.classList.toggle('quick-form-hidden', quickMode);
  quickForm.classList.toggle('quick-form-hidden', !quickMode);
  modeSwap.textContent = quickMode
    ? ggT('index.ws.swapToWarm', 'Рассказать о деле (пять вопросов)')
    : ggT('index.ws.swapToQuick', 'Написать цель одной фразой');
  const wi = $('warmIntro');
  if (wi) wi.hidden = quickMode;
}
modeSwap.addEventListener('click', () => {
  quickMode = !quickMode;
  applyQuickMode();
  if (quickMode) goalEl.focus(); else $('d_what').focus();
});
applyQuickMode();"""


def merge_js():
    theirs = io.open(THEIR_JS, encoding="utf-8").read()
    if "applyQuickMode" in theirs:
        return "app.js уже содержит нашу правку — пропуск"

    # их блок переключения режима — заменяем на наш
    pat = re.compile(
        r"/\* переключение тёплый/быстрый вход \*/\s*\n"
        r"let quickMode = false;\s*\n"
        r"modeSwap\.addEventListener\('click', \(\) => \{.*?\n\}\);\s*\n",
        re.S)
    m = pat.search(theirs)
    if not m:
        return "НЕ НАЙДЕН блок режима в их app.js — остановка"
    theirs = theirs[:m.start()] + MY_BLOCK + "\n" + theirs[m.end():]
    io.open(OUT_JS, "w", encoding="utf-8", newline="\n").write(theirs)
    return ("app.js: взята ИХ версия + наша правка режима "
            "(%d байт)" % len(theirs.encode()))


def extract_ggf():
    """Вытаскивает из их index.html CSS-правила .ggf-* и блок разметки."""
    h = io.open(THEIR_HTML, encoding="utf-8").read()
    # CSS: от первой строки с .ggf-block до закрывающей } @media
    css_start = h.find("/* Order 81: формат и модель */")
    if css_start < 0:
        css_start = h.find(".ggf-block {")
        if css_start < 0:
            return None, None
    css_end = h.find(".kicker { color: var(--mood-goal); }", css_start)
    if css_end < 0:
        return None, None
    css = h[css_start:css_end].rstrip()

    # разметка: <div class="ggf-block" ...> ... до строки перед postsStatus
    mk_start = h.find('<div class="ggf-block" id="ggFormatBlock"')
    if mk_start < 0:
        return css, None
    mk_end = h.find('<div id="postsStatus"', mk_start)
    if mk_end < 0:
        return css, None
    markup = h[mk_start:mk_end].rstrip()
    return css, markup


def merge_html():
    mine = io.open(MY_HTML, encoding="utf-8").read()
    if 'id="ggFormatBlock"' in mine:
        return "index.html уже содержит блок формата — пропуск"
    css, markup = extract_ggf()
    if not css or not markup:
        return "НЕ УДАЛОСЬ вырезать блок формата — остановка"

    # 1. CSS — перед нашими стилями волны 4
    anchor_css = "    /* ── ВОЛНА 4: мастерская в блоках"
    if mine.count(anchor_css) != 1:
        return "НЕТ якоря для CSS — остановка"
    mine = mine.replace(anchor_css, css + "\n\n" + anchor_css)

    # 2. разметка — перед postsStatus
    anchor_mk = '<div id="postsStatus" class="status-line" role="status" aria-live="polite"></div>'
    if mine.count(anchor_mk) != 1:
        return "НЕТ якоря для разметки — остановка"
    mine = mine.replace(anchor_mk, markup + "\n        " + anchor_mk)

    io.open(OUT_HTML, "w", encoding="utf-8", newline="").write(mine)
    return ("index.html: наша версия + блок формата (%d байт)" % len(mine.encode()))


def main():
    for p in (THEIR_JS, THEIR_HTML, MY_JS, MY_HTML):
        if not os.path.exists(p):
            print("НЕТ ФАЙЛА:", p)
            return 1
    r1 = merge_js()
    r2 = merge_html()
    print(" ", r1)
    print(" ", r2)
    return 0 if ("остановка" not in r1 and "остановка" not in r2) else 1


if __name__ == "__main__":
    raise SystemExit(main())
