"""Сборка index.html из макета Заи (1:1 разметка) + наши id и движок.

Основа: C:\\Users\\боос\\Pictures\\GOOD Growth\\index.html
Результат: live-pages/index.html
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\боос\Pictures\GOOD Growth\index.html"
OUT = os.path.join(HERE, "live-pages", "index.html")

src = io.open(SRC, encoding="utf-8").read()
css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", src, re.S))
head_extra = "\n".join(re.findall(r"<head>(.*?)<style", src, re.S)[:1])
body = src[src.find("<body"):]
body = body[:body.find("<script")]           # её JS не берём — движок наш
body = body[body.find(">") + 1:]             # без <body ...>

errors = []


def rep(old, new, why, count=1):
    global body
    n = body.count(old)
    if n != count:
        errors.append("%s — встретилось %d, ждали %d" % (why, n, count))
        return
    body = body.replace(old, new)


# ── панель: реальные маршруты ────────────────────────────────────────
NAV = [
    ('href="#desk"', 'href="/app" data-k="app"'),
    ('href="#goal" aria-current="page"', 'href="/app/strategy" data-k="strategy"'),
    ('href="#content"', 'href="/app/posts" data-k="posts"'),
    ('href="#publish"', 'href="/app/schedule" data-k="schedule"'),
    ('href="#brands"', 'href="/partner" data-k="brands"'),
    ('href="#channels"', 'href="/app/channels" data-k="channels"'),
    ('href="#analytics"', 'href="/app/analytics" data-k="analytics"'),
    ('href="#team"', 'href="/partner/team" data-k="team"'),
    ('href="#partners"', 'href="/partner/info" data-k="info"'),
    ('href="#billing"', 'href="/app/billing" data-k="billing"'),
    ('href="#settings"', 'href="/profile" data-k="profile"'),
    ('href="#logout"', 'href="/login" data-k="logout"'),
]
for a, b in NAV:
    rep(a, b, "панель " + a)

rep('<aside class="sidebar" aria-label="Разделы мастерской">',
    '<aside class="sidebar" id="gg-rail" aria-label="Разделы GOOD Growth">', "id панели")

# ── чип режима ИИ ────────────────────────────────────────────────────
rep('<span class="chip" title="Демо-режим ИИ: ответы берутся из примеров, ключ не тратится">',
    '<span class="chip" id="modeChip" title="Режим разбора">', "чип: обёртка")
rep('<span class="dot"></span><span data-i18n="aiMode">ИИ · демо</span>',
    '<span class="dot"></span><span id="modeText" data-i18n="aiMode">ИИ · не подключён</span>',
    "чип: текст")

# ── бренд-чип ────────────────────────────────────────────────────────
rep('<div class="brand-chip" title="Активный бренд">',
    '<div class="brand-chip" title="Активный бренд" id="brandPill" style="position:relative">',
    "бренд: обёртка")
rep('<b>Тест Капитана</b>',
    '<b id="brandLabel">—</b><div id="brandMenu" style="display:none;position:absolute;'
    'left:10px;right:10px;top:100%;margin-top:4px;background:var(--surface);'
    'border:1px solid var(--border);border-radius:10px;padding:6px;z-index:50"></div>',
    "бренд: имя и меню")

# ── main: снять занятый id goal ──────────────────────────────────────
rep('<main class="canvas" id="goal">', '<main class="canvas" id="goalPage">', "main id")

# ── форма цели ───────────────────────────────────────────────────────
rep('<section class="composer reveal in" aria-label="Форма цели">',
    '<section class="composer reveal in" id="askForm" aria-label="Форма цели">', "форма id")
rep('<textarea id="goalInput" data-i18n-ph="goalPlaceholder" placeholder="Например: «Хочу, чтобы о нашей юридической помощи узнали в Telegram»"></textarea>',
    '<textarea id="goal" name="goal" maxlength="2000" data-i18n-ph="goalPlaceholder" '
    'placeholder="Например: «Хочу, чтобы о нашей юридической помощи узнали в Telegram»"></textarea>',
    "поле цели")
rep('<button type="button" class="btn btn-primary">\n            <svg class="ic" viewBox="0 0 24 24"><path d="M12 3.5v13M7.2 11.5 12 16.3l4.8-4.8M5 20.5h14"/></svg>',
    '<button type="submit" class="btn btn-primary" id="goBtn">\n            <svg class="ic" viewBox="0 0 24 24"><path d="M12 3.5v13M7.2 11.5 12 16.3l4.8-4.8M5 20.5h14"/></svg>',
    "кнопка разбора")
rep('<button type="button" class="mic-btn" aria-label="Сказать цель голосом" title="Голосом">',
    '<button type="button" class="mic-btn" id="micQuick" aria-label="Сказать цель голосом" title="Голосом">',
    "микрофон")
rep('<p class="hint"><a href="#five" data-i18n="fiveQuestions">',
    '<p class="hint" id="micQuickHint"><a href="#five" id="modeSwap" data-i18n="fiveQuestions">',
    "ссылка пять вопросов")

# ── расчёт цены: внутрь composer, перед .row ────────────────────────
COST = '''        <div class="ggf-block" id="ggFormatBlock">
          <p class="ggf-label">Модель</p>
          <div class="ggf-row" id="ggProfileRow" role="group" aria-label="Модель генерации">
            <button type="button" class="ggf-opt" data-profile="fast" aria-pressed="false"><span data-i18n="o87.fast">Быстрая</span><small data-i18n="o87.fastHint">10 ₽ · просто и быстро</small></button>
            <button type="button" class="ggf-opt" data-profile="smart" aria-pressed="true"><span data-i18n="o87.smart">Умная</span><small data-i18n="o87.smartHint">30 ₽ · глубоко</small></button>
            <button type="button" class="ggf-opt" data-profile="creative" aria-pressed="false"><span data-i18n="o87.creative">Креативная</span><small data-i18n="o87.creativeHint">50 ₽ · неожиданно</small></button>
          </div>
          <p class="ggf-label" style="margin-top:14px;">Формат</p>
          <div class="ggf-row" id="ggFormatRow" role="group" aria-label="Формат поста">
            <button type="button" class="ggf-opt" data-format="text" aria-pressed="true"><span data-i18n="o87.text">Только текст</span><small data-i18n="o87.textHint">0 ₽</small></button>
            <button type="button" class="ggf-opt" data-format="image" aria-pressed="false"><span data-i18n="o87.image">С картинкой</span><small data-i18n="o87.imageHint">+5 ₽ · нарисуем сразу</small></button>
            <button type="button" class="ggf-opt" data-format="video" aria-pressed="false"><span data-i18n="o87.video">С видео</span><small data-i18n="o87.videoHint">+100 ₽ · 5 сек · в сборке</small></button>
          </div>
          <div class="ggf-row" style="margin-top:14px;">
            <div class="ggf-counter"><b id="ggCostRub">30 ₽</b><span id="ggCostPct" data-i18n="o87.costHint">от месячного лимита</span></div>
          </div>
          <p class="ggf-adv" id="ggAdvice" role="status" aria-live="polite"></p>
          <div class="ggf-reuse" id="ggReuse"><p class="ggf-label">Находки в твоих старых постах</p><div id="ggReuseList"></div></div>
        </div>
'''
rep('        <div class="row">\n          <button type="submit" class="btn btn-primary" id="goBtn">',
    COST + '        <div class="row">\n          <button type="submit" class="btn btn-primary" id="goBtn">',
    "расчёт цены")

# ── строки состояния под формой ─────────────────────────────────────
STATUS = '''        <p class="status-line" id="statusLine" role="status" aria-live="polite"></p>
        <p id="goal-error" class="error-box" role="alert" hidden></p>
'''
rep('      </section>\n\n      <nav class="subnav"', STATUS + '      </section>\n\n      <nav class="subnav"',
    "строки состояния")

# ── разбор: наш контейнер результата ─────────────────────────────────
rep('      </article>', '        <div id="resultRoot"></div>\n      </article>', "resultRoot")

# ── посты: наши контейнеры ───────────────────────────────────────────
rep('<div class="post-card">', '<div class="post-card" id="workshopSection">', "секция постов")
rep('<h3 data-i18n="postsTitle">Из стратегии — в готовое</h3>',
    '<h3 data-i18n="postsTitle">Из стратегии — в готовое</h3>'
    '<div id="postsStatus" class="status-line" role="status" aria-live="polite"></div>'
    '<div id="postsRoot" class="posts"></div>', "контейнеры постов")
rep('<button type="button" class="btn btn-primary" style="padding:12px 20px;">',
    '<button type="button" class="btn btn-primary" id="makeBtn" style="padding:12px 20px;">',
    "кнопка создать контент")
rep('<p class="hint-line" data-i18n="postsHint">Тексты напишет разум, картинки — за секунды.</p>',
    '<p class="hint-line" data-i18n="postsHint" id="workshopHint">Тексты напишет разум, картинки — за секунды.</p>',
    "подсказка контента")

# ── журнал ───────────────────────────────────────────────────────────
rep('<div class="j-list" id="jList">', '<div class="j-list" id="journalList">', "журнал: список")
body = body.replace('<div class="j-list" id="journalList">',
                    '<div class="j-list" id="journalList"><p class="hint" id="journalEmpty" hidden>Журнал пока пуст.</p>', 1)

# ── подвал ───────────────────────────────────────────────────────────
rep('<span><b>GOOD Growth</b> · <span data-i18n="trustLocal">',
    '<span id="footMeta"><b>GOOD Growth</b> · <span data-i18n="trustLocal">', "подвал: мета")
rep('<span data-i18n="trustVersion">редизайн V1 · концепт интерфейса</span>',
    '<span id="footMode">—</span> <button id="demoToggle" type="button" class="linkish">переключить демо</button>',
    "подвал: режим")

io.open(os.path.join(HERE, "_zaya_body.txt"), "w", encoding="utf-8").write(body)
io.open(os.path.join(HERE, "_zaya_css.txt"), "w", encoding="utf-8").write(css)

print("тело: %d байт · CSS: %d байт" % (len(body.encode()), len(css.encode())))
if errors:
    print("\nОШИБКИ (%d):" % len(errors))
    for e in errors:
        print("  · " + e)
else:
    print("все якоря найдены ✓")
