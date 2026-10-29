"""Сборка итогового index.html: разметка Заи + наш движок и id."""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
LP = os.path.join(HERE, "live-pages")

body = io.open(os.path.join(HERE, "_zaya_body.txt"), encoding="utf-8").read()
css = io.open(os.path.join(HERE, "_zaya_css.txt"), encoding="utf-8").read()

# ── боковой подвал: добавляем тему и id для rail.js ──────────────────
old_foot = '''      <nav class="nav" aria-label="Настройки">
        <a href="/profile" data-k="profile">'''
new_foot = '''      <nav class="nav" aria-label="Настройки">
        <button type="button" class="nav-link" id="ggRailTheme" data-theme-pick="dark"
                style="display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:10px;
                       background:none;border:0;width:100%;cursor:pointer;color:var(--muted);font:inherit;font-size:13.5px">
          <span class="gg-ico" aria-hidden="true">◐</span><span class="gg-tx">Тёмная</span>
        </button>
        <a href="/profile" data-k="profile">'''
if old_foot not in body:
    print("НЕ НАЙДЕН подвал панели"); sys.exit(1)
body = body.replace(old_foot, new_foot, 1)

body = body.replace('<a href="/login" data-k="logout">',
                    '<a href="/login" data-k="logout" id="ggRailOut">', 1)

# ── кнопка темы в топбаре: помечаем для theme.js ────────────────────
body = body.replace('<button class="icon-btn" id="themeBtn"',
                    '<button class="icon-btn" id="themeBtn" data-theme-pick="light"', 1)
if 'id="themeBtn"' not in body:
    body = body.replace('<button class="icon-btn"', '<button class="icon-btn" id="themeBtn" data-theme-pick="light"', 1)

# ── скрытая панель «пять вопросов» (наши поля) ──────────────────────
WARM = '''
      <!-- наши поля пяти вопросов: скрыты, открываются ссылкой -->
      <section class="composer warm-panel" id="warmForm" hidden style="margin-top:18px">
        <p class="hint" id="warmIntro">Ответь на пять коротких вопросов — чем больше расскажешь, тем точнее будет стратегия.</p>

        <label class="field-lbl" for="d_what">что ты делаешь?</label>
        <textarea id="d_what" name="d_what" rows="3" placeholder="Например: «Мастерская ремонта велосипедов»"></textarea>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div>
            <label class="field-lbl" for="d_where">где ты находишься?</label>
            <input id="d_where" name="d_where" type="text" placeholder="«Москва, район Хамовники»">
          </div>
          <div>
            <label class="field-lbl" for="d_who">кто твой клиент?</label>
            <input id="d_who" name="d_who" type="text" placeholder="«Взрослые, которые хотят научиться играть»">
          </div>
        </div>

        <label class="field-lbl" for="d_want" style="margin-top:12px">чего ты хочешь?</label>
        <textarea id="d_want" name="d_want" rows="2" placeholder="«Чтобы узнали», «Чтобы записались»"></textarea>

        <label class="field-lbl" style="margin-top:12px">фото твоего дела (по желанию)</label>
        <div class="row" style="margin-top:6px">
          <img id="photoPreview" alt="" hidden style="width:64px;height:64px;border-radius:10px;object-fit:cover">
          <span id="photoPreviewPh" class="hint">нет фото</span>
          <input type="file" id="d_photo" accept="image/*" hidden>
          <button type="button" class="btn" id="photoBtn" style="padding:9px 14px;font-size:13px">Загрузить фото</button>
          <button type="button" class="btn" id="photoClear" hidden style="padding:9px 14px;font-size:13px">Убрать</button>
        </div>

        <input type="hidden" id="micWarm"><input type="hidden" id="micWhere">
        <input type="hidden" id="micWho"><input type="hidden" id="micWant">
        <input type="hidden" id="micWarmHint"><input type="hidden" id="micQuickHintHidden">

        <div class="row" style="margin-top:16px">
          <button type="submit" class="btn btn-primary" id="warmBtn">Рассказать о деле</button>
          <p class="hint" id="warmStatus" role="status" aria-live="polite">Разбор появится ниже и сохранится в журнале.</p>
        </div>
      </section>
'''
body = body.replace('      <nav class="subnav"', WARM + '\n      <nav class="subnav"', 1)

# ── «Стол» для /app ─────────────────────────────────────────────────
DESK = '''
      <section id="deskSection" hidden aria-label="Стол">
        <div class="gg-topbar"><h1>Стол</h1><div class="gg-grow"></div>
          <a class="desk-more" href="/app/strategy">В мастерскую →</a></div>

        <div class="gg-blk">
          <div class="gg-blk-h"><h2>Сегодня</h2><span class="gg-blk-q">что происходит?</span></div>
          <div class="gg-blk-b">
            <div class="gg-tiles" style="grid-template-columns:repeat(3,1fr)">
              <div class="gg-tile"><div class="gg-n" id="deskGoals">—</div><div class="gg-l">целей разобрано</div></div>
              <div class="gg-tile"><div class="gg-n" id="deskPosts">—</div><div class="gg-l">постов создано</div></div>
              <div class="gg-tile"><div class="gg-n" id="deskPublished">—</div><div class="gg-l">опубликовано</div></div>
            </div>
          </div>
        </div>

        <div class="gg-blk">
          <div class="gg-blk-h"><h2>С чего начать</h2><span class="gg-blk-q">какой шаг сейчас?</span></div>
          <div class="gg-blk-b">
            <a class="desk-step" id="deskStep" href="/app/strategy">
              <span class="desk-step-t" id="deskStepTitle">Задать цель</span>
              <span class="desk-step-h" id="deskStepHint">С этого начинается всё</span>
              <span class="desk-step-go">→</span>
            </a>
          </div>
        </div>

        <div class="gg-blk" id="deskWaitBlk" hidden>
          <div class="gg-blk-h"><h2>Что ждёт</h2><span class="gg-blk-q">что само не сделается?</span></div>
          <div class="gg-blk-b" id="deskWait"></div>
        </div>

        <div class="gg-blk">
          <div class="gg-blk-h"><h2>Последнее</h2><span class="gg-blk-q">что уже было?</span>
            <a class="desk-more" href="/app/strategy">Открыть всё</a></div>
          <div class="gg-blk-b" id="deskLast"></div>
        </div>
      </section>
'''
body = body.replace('      <header class="hero reveal in">', DESK + '\n      <header class="hero reveal in">', 1)

# ── мост: наши классы в её языке ────────────────────────────────────
BRIDGE = '''
    /* ── МОСТ: наши классы, её язык ──────────────────────────── */
    .warm-panel[hidden] { display: none !important; }
    .warm-panel input[type=text], .warm-panel textarea { width:100%; border:1px solid var(--border);
      border-radius:var(--r-m); background:var(--bg-soft); color:var(--fg); font:inherit;
      font-size:15px; padding:12px 14px; }
    .warm-panel .error-box { color:var(--danger); font-size:13px; margin-top:8px; }
    .status-line { font-size:13px; color:var(--faint); margin-top:10px; min-height:0; }
    .status-line:empty, .ggf-adv:empty { display:none; }
    .linkish { background:none; border:0; color:var(--muted); font:inherit; cursor:pointer;
      text-decoration:underline; text-underline-offset:3px; }

    /* расчёт цены в её языке */
    .ggf-block { margin-top:18px; border:1px solid var(--border); border-radius:var(--r-m);
      background:var(--bg-soft); padding:16px 18px; }
    .ggf-label { font-family:var(--font-mono); font-size:10.5px; letter-spacing:.2em;
      text-transform:uppercase; color:var(--faint); margin:0 0 8px; }
    .ggf-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .ggf-opt { font:inherit; font-size:13px; padding:8px 13px; border-radius:10px; cursor:pointer;
      background:var(--surface-2); color:var(--muted); border:1px solid var(--border); }
    .ggf-opt small { display:block; font-size:10.5px; color:var(--faint); margin-top:2px; }
    .ggf-opt[aria-pressed="true"] { background:var(--amber-soft); border-color:var(--amber); color:var(--fg); }
    .ggf-opt[aria-pressed="true"] small { color:var(--amber); opacity:.85; }
    .ggf-counter { margin-left:auto; text-align:right; }
    .ggf-counter b { font-family:var(--font-display); font-size:20px; color:var(--fg); }
    .ggf-counter span { display:block; font-size:10.5px; color:var(--faint); }
    .ggf-reuse { display:none; } .ggf-reuse.open { display:block; }

    /* «Стол» */
    #deskSection { padding-top:8px; }
    #deskSection .gg-topbar { display:flex; align-items:center; gap:12px; padding-bottom:14px;
      border-bottom:1px solid var(--border); margin-bottom:22px; }
    #deskSection .gg-topbar h1 { font-family:var(--font-display); font-size:clamp(24px,2.4vw,34px); margin:0; }
    .gg-grow { flex:1; }
    .gg-blk { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-l);
      padding:22px 24px; margin-bottom:16px; }
    .gg-blk-h { display:flex; align-items:baseline; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
    .gg-blk-h h2 { font-family:var(--font-mono); font-size:11px; letter-spacing:.18em;
      text-transform:uppercase; margin:0; }
    .gg-blk-q { font-family:var(--font-display); font-style:italic; font-size:13.5px; color:var(--faint); }
    .gg-tiles { display:grid; gap:12px; }
    .gg-tile { background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-m); padding:16px 18px; }
    .gg-tile .gg-n { font-family:var(--font-display); font-size:clamp(26px,3vw,34px); line-height:1; }
    .gg-tile .gg-l { font-family:var(--font-mono); font-size:10.5px; letter-spacing:.1em;
      text-transform:uppercase; color:var(--faint); margin-top:8px; }
    .desk-step { display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:12px;
      background:var(--surface-2); border:1px solid var(--border); text-decoration:none; color:var(--fg); }
    .desk-step-t { font-weight:600; font-size:15px; }
    .desk-step-h { color:var(--faint); font-size:12.5px; flex:1; }
    .desk-step-go { color:var(--amber); font-size:18px; font-weight:700; }
    .desk-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); }
    .desk-row:last-child { border-bottom:0; }
    .desk-row-t { font-weight:600; font-size:13.5px; }
    .desk-row-h { color:var(--faint); font-size:12px; flex:1; }
    .desk-row-go, .desk-more { color:var(--amber); font-size:11.5px; font-weight:600; text-decoration:none; }
    .desk-last { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);
      text-decoration:none; color:var(--fg); }
    .desk-last:last-child { border-bottom:0; }
    .desk-last-d { width:84px; flex:none; color:var(--faint); font-size:11.5px; }
    .desk-last-t { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
    .desk-last-go { color:var(--amber); font-size:11.5px; font-weight:600; }
    .desk-empty { color:var(--faint); font-size:12.5px; }


    /* ── ДУБЛИ: app.js рисует свой разбор и посты во временные контейнеры.
       Пока они не переодеты в её классы — не показываем, чтобы не было каши.
       Шаг 2: переодеть и снять display:none. */
    #postsRoot, #resultRoot, #journalList .jrow { display: none !important; }

    /* показ: Стол или Мастерская */
    body.is-desk .hero, body.is-desk .composer, body.is-desk .subnav,
    body.is-desk #razbor, body.is-desk #postsSec, body.is-desk #journal { display:none !important; }
    body.is-workshop #deskSection { display:none !important; }
'''

# ── финальный файл ──────────────────────────────────────────────────
HTML = '''<!doctype html>
<html lang="ru" data-theme="dark">
<head>
<meta charset="utf-8" />
<script>(function(){try{var t=localStorage.getItem("gg_theme")||"dark";var d=document.documentElement;if(t==="system"){d.removeAttribute("data-theme");d.setAttribute("data-theme-src","system")}else{d.setAttribute("data-theme",t==="light"?"light":"dark")}}catch(e){}})();</script>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GOOD Growth — от цели до готовых постов</title>
<meta name="description" content="Опиши своё дело — получи стратегию и готовые посты с картинками для Telegram." />
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/za.css">
<link rel="stylesheet" href="/i18n/i18n.js.css" onerror="this.remove()">
<style>
__CSS__
__BRIDGE__
</style>
</head>
<body>
__BODY__
<script src="/i18n/i18n.js"></script>
<script src="/public/app.js"></script>
<script src="/strategy.js" defer></script>
<script src="/za-ui.js" defer></script>
<script src="/theme.js" defer></script>
<script src="/rail.js" defer></script>
<script src="/desk.js" defer></script>
<script>
/* появление блоков (её анимация .reveal). Если наблюдатель не сработает —
   через 1.2 с показываем всё принудительно: страница не может остаться пустой. */
(function(){
  var nodes = document.querySelectorAll('.reveal:not(.in)');
  if (!nodes.length) return;
  function showAll(){ document.querySelectorAll('.reveal:not(.in)').forEach(function(el){ el.classList.add('in'); }); }
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    nodes.forEach(function(el){ rio.observe(el); });
    setTimeout(showAll, 1200);
  } else { showAll(); }
})();

/* тема: переключатель в панели и в топбаре */
(function(){
  function pick(mode){ if(window.ggTheme) window.ggTheme.set(mode); }
  function boot(){
    var b = document.getElementById('ggRailTheme');
    if (b) b.addEventListener('click', function(){
      var now = window.ggTheme ? window.ggTheme.get() : 'dark';
      var next = now === 'light' ? 'dark' : 'light';
      pick(next);
      var tx = b.querySelector('.gg-tx'); if (tx) tx.textContent = next === 'light' ? 'Светлая' : 'Тёмная';
    });
    var t = document.getElementById('themeBtn');
    if (t) t.addEventListener('click', function(){
      var now = window.ggTheme ? window.ggTheme.get() : 'dark';
      pick(now === 'light' ? 'dark' : 'light');
    });
    if (window.ggTheme) {
      var cur = window.ggTheme.get();
      var tx = document.querySelector('#ggRailTheme .gg-tx');
      if (tx) tx.textContent = cur === 'light' ? 'Светлая' : 'Тёмная';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
</script>
</body>
</html>
'''

# ── подготовка тела: идемпотентно, ДО сборки ────────────────────
def prepare_body(body):
    import json as _json, re as _re

    if 'id="emptyState"' not in body:
        body = body.replace('<footer class="trust">',
                            '<p id="emptyState" hidden></p>\n      <footer class="trust">', 1)

    if 'data-i18n="z.' not in body:
        keys, ph = {}, {}
        for m in _re.finditer(r'<([a-z0-9]+)([^>]*?)\bdata-i18n="([^"]+)"([^>]*)>(.*?)</\1>', body, _re.S):
            k = m.group(3); t = _re.sub(r"<[^>]+>", "", m.group(5)).strip()
            if t and k not in keys: keys[k] = t
        for m in _re.finditer(r'data-i18n-ph="([^"]+)"[^>]*placeholder="([^"]*)"', body, _re.S):
            ph[m.group(1)] = m.group(2)
        for m in _re.finditer(r'placeholder="([^"]*)"[^>]*data-i18n-ph="([^"]+)"', body, _re.S):
            ph[m.group(2)] = m.group(1)
        body = _re.sub(r'data-i18n="([^"]+)"', lambda m: 'data-i18n="z.%s"' % m.group(1), body)
        body = _re.sub(r'data-i18n-ph="([^"]+)"',
                       lambda m: 'data-i18n-attr="placeholder:z.ph.%s"' % m.group(1), body)
        dp = os.path.join(HERE, "public", "i18n", "ru.json")
        try:
            dic = _json.load(io.open(dp, encoding="utf-8"))
        except Exception:
            dic = {}
        for k, v in list(keys.items()) + [("ph." + k, v) for k, v in ph.items()]:
            kk = "z." + k
            if kk not in dic: dic[kk] = v
        if dic:
            dic.setdefault("_meta", {})
            dic["_meta"]["keys"] = len([x for x in dic if not x.startswith("_")])
            dic["_meta"]["pages"] = sorted({x.split(".")[0] for x in dic if not x.startswith("_")})
            io.open(dp, "w", encoding="utf-8", newline="\n").write(
                _json.dumps(dic, ensure_ascii=False, indent=2) + "\n")
    return body


def strip_demo(body):
    """Убирает демо-содержимое Заи (XPath, без cssselect).
    Остаются пустые блоки: их заполняет strategy.js настоящими данными."""
    from lxml import html as _lh

    frag = _lh.fragment_fromstring(body, create_parent="div")
    frag.set("id", "__wrap__")

    def clear_text(xp):
        for el in frag.xpath(xp):
            for ch in list(el):
                el.remove(ch)     # иначе остаются span с подписями
            el.text = ""

    def clear_kids(xp):
        for el in frag.xpath(xp):
            for ch in list(el):
                el.remove(ch)

    clear_text('//p[@class="meta"]')
    clear_text('//p[@class="strategy-line"]')
    clear_text('//div[@id="audience"]//h3')
    clear_kids('//div[@id="audience"]//ul')
    clear_text('//div[@id="rhythm"]//p[@class="big"]')
    clear_kids('//div[@id="rhythm"]//div[@class="days"]')
    clear_text('//div[@id="rhythm"]//p[@class="note"]')

    for el in frag.xpath('//div[@id="topics"]//div[@class="topic"]'):
        el.getparent().remove(el)

    clear_kids('//div[@id="chans"]//div[@class="channels"]')
    clear_kids('//div[@id="steps"]//div[@class="steps"]')
    clear_kids('//div[@id="journalList"]')

    for el in frag.xpath('//div[@id="postsSec"]//div[@class="post-card"]'):
        el.getparent().remove(el)

    # демо-цель в цитате — на её место встанет настоящая
    for el in frag.xpath('//blockquote[@class="goal-quote"]'):
        for ch in list(el):
            el.remove(ch)
        el.text = ""

    # workshopSection жил на демо-карточке — переносим на сам блок постов
    if not frag.xpath('//*[@id="workshopSection"]'):
        ps = frag.xpath('//div[@id="postsSec"]')
        if ps:
            ps[0].set("id", "workshopSection")
            ps[0].set("data-workshop", "1")

    if not frag.xpath('//p[@id="journalEmpty"]'):
        jl = frag.xpath('//div[@id="journalList"]')
        if jl:
            p = _lh.Element("p")
            p.set("id", "journalEmpty")
            p.set("class", "hint")
            p.set("hidden", "hidden")
            p.text = "Журнал пока пуст."
            jl[0].append(p)

    return b"".join(_lh.tostring(ch, encoding="utf-8") for ch in frag).decode("utf-8")


body = strip_demo(body)

body = prepare_body(body)

out = (HTML.replace("__CSS__", css)
           .replace("__BRIDGE__", BRIDGE)
           .replace("__BODY__", body))

io.open(os.path.join(LP, "index.html"), "w", encoding="utf-8", newline="").write(out)
print("index.html собран: %d байт" % len(out.encode()))

# контроль
ids = set(re.findall(r'\bid="([^"]+)"', out))
MUST = """askForm brandLabel brandMenu brandPill d_photo d_want d_what d_where d_who demoToggle
emptyState footMeta footMode goBtn goal goal-error journalEmpty journalList makeBtn micQuick
micQuickHint micWant micWarm micWarmHint micWhere micWho modeChip modeSwap modeText photoBtn
photoClear photoPreview photoPreviewPh postsRoot postsStatus resultRoot statusLine warmBtn
warmForm warmIntro warmStatus workshopHint workshopSection""".split()
miss = [x for x in MUST if x not in ids]
print("наши id: %d / %d · нет: %s" % (len(MUST) - len(miss), len(MUST), ", ".join(miss) if miss else "ни одного"))
