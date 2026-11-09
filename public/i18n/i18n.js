/* ============================================================
   GOOD Growth · i18n, волна 0 (пилот)

   Принцип: страница работает БЕЗ этого файла.
   Русский текст уже лежит в HTML. Словарь только ПЕРЕКРЫВАЕТ его.
   Не загрузился JSON — человек ничего не заметил.

   Разметка:
     <h1 data-i18n="login.h1">Вход</h1>
     <a data-i18n-attr="aria-label:login.eye.show">...</a>
   В JS:  ggT('login.msg.fill', 'Заполни email и пароль.')
   ============================================================ */
(function () {
  'use strict';

  /* Языки: ru — основа, en — переведён, hy — в работе.
     Выбор хранится в localStorage.gg_lang, можно задать ссылкой ?lang=en */
  var SUPPORTED = ['ru', 'en', 'hy'];
  var READY = ['ru', 'en'];            /* у каких языков есть словарь */

  function pickLang() {
    var m = String(location.search || '').match(/[?&]lang=([a-z]{2})/i);
    if (m) {
      var q = m[1].toLowerCase();
      if (SUPPORTED.indexOf(q) >= 0) {
        try { localStorage.setItem('gg_lang', q); } catch (e) {}
        return q;
      }
    }
    try {
      var saved = localStorage.getItem('gg_lang');
      if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    var nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    if (nav === 'hy' || nav === 'am') return 'hy';
    if (nav === 'en') return 'en';
    return 'ru';
  }

  var LANG = pickLang();
  if (READY.indexOf(LANG) < 0) LANG = 'ru';     /* языка ещё нет — остаёмся на русском */
  var DICT_URL = '/i18n/' + LANG + '.json';
  var dict = null;
  try {
    document.documentElement.setAttribute('lang', LANG === 'hy' ? 'hy' : LANG);
    document.documentElement.setAttribute('data-lang', LANG);
  } catch (e) {}

  function readAttrs(value) {
    // "aria-label:login.eye.show,title:login.h2"
    return String(value || '').split(',').map(function (pair) {
      var i = pair.indexOf(':');
      if (i < 0) return null;
      return { name: pair.slice(0, i).trim(), key: pair.slice(i + 1).trim() };
    }).filter(function (a) { return a && a.name && a.key; });
  }

  function apply() {
    if (!dict) return;

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      if (dict[key] != null) nodes[i].textContent = dict[key];
    }

    var attrs = document.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrs.length; j++) {
      var list = readAttrs(attrs[j].getAttribute('data-i18n-attr'));
      for (var k = 0; k < list.length; k++) {
        if (dict[list[k].key] != null) attrs[j].setAttribute(list[k].name, dict[list[k].key]);
      }
    }

    document.documentElement.setAttribute('data-i18n-ready', '1');
    try { document.dispatchEvent(new CustomEvent('gg:i18n', { detail: { lang: LANG } })); } catch (e) {}
  }

  /* Перевод для скриптов страницы. Всегда с запасным текстом:
     если словарь ещё не пришёл — вернётся то, что написано в коде. */
  window.ggT = function (key, fallback) {
    return (dict && dict[key] != null) ? dict[key] : (fallback != null ? fallback : key);
  };

  window.ggLang = function () { return LANG; };

  /* смена языка: сохранить и перечитать страницу */
  window.ggSetLang = function (lang) {
    var l = String(lang || '').toLowerCase();
    if (SUPPORTED.indexOf(l) < 0 || READY.indexOf(l) < 0) return false;
    try { localStorage.setItem('gg_lang', l); } catch (e) {}
    try {
      var u = new URL(location.href);
      u.searchParams.delete('lang');
      location.replace(u.pathname + (u.search ? u.search : '') + u.hash);
    } catch (e) { location.reload(); }
    return true;
  };

  window.ggLangReady = function (lang) { return READY.indexOf(String(lang || '').toLowerCase()) >= 0; };

  /* ── перевод «по значению» ───────────────────────────────────
     Часть интерфейса рисуют скрипты до загрузки словаря (меню,
     крошка, чипы). Для них держим карту «русский текст → английский»
     и проходим по странице после загрузки и после изменений. */
  var RU2EN = null;
  var PREFIX_IDX = null;      /* первые 44 знака → английский вариант */

  function buildValueMap() {
    if (LANG === 'ru') return;
    fetch('/i18n/ru.json', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (ru) {
        if (!ru || !dict) return;
        var map = {};
        var norm = function (v) { return String(v).replace(/\s+/g, ' ').trim(); };
        for (var k in ru) {
          if (typeof ru[k] !== 'string') continue;
          var en = dict[k];
          if (typeof en === 'string' && en && en !== ru[k]) map[norm(ru[k])] = en;
        }
        RU2EN = map;
        PREFIX_IDX = {};
        for (var rk in map) {
          var head = rk.slice(0, 44);
          if (head.length >= 30 && !PREFIX_IDX[head]) PREFIX_IDX[head] = map[rk];
        }
        translateByValue();
        translateBlocks();
        translateAttrs();
        observe();
      })
      .catch(function () {});
  }


  /* строки с числами: словарь не может знать все варианты */
  var PATTERNS = [
    [/^(\d+) из (\d+)$/i, '$1 of $2'],
    [/^Тариф: (Старт|Рост|Про|Агентство|Безлимит)$/i, function (m) {
      var P2 = { 'Старт': 'Start', 'Рост': 'Growth', 'Про': 'Pro', 'Агентство': 'Agency', 'Безлимит': 'Unlimited' };
      return 'Plan: ' + (P2[m[1]] || m[1]);
    }],
    [/^(\d+) из (\d+) · весь путь пройден$/i, '$1 of $2 · the whole path is done'],
    [/^0?(\d) · сделано$/i, '0$1 · done'],
    [/^Запланировать (\d+) (?:пост|поста|постов)$/i, 'Schedule $1 posts'],
    [/^(\d+) (?:пост|поста|постов) ещё не вышли$/i, "$1 posts haven't gone out yet"],
    [/^(\d+) (?:пост|поста|постов) в месяц$/i, '$1 posts a month'],
    [/^брендов: (\d+) (?:бренд|бренда|брендов)$/i, 'brands: $1'],
    [/^каналов: (\d+) (?:канал|канала|каналов)$/i, 'channels: $1'],
    [/^каналов: (.+)$/i, 'channels: $1'],
    [/^публикаций в день: (\d+)$/i, 'posts a day: $1'],
    [/^публикаций: (\d+) (?:пост|поста|постов) в день$/i, 'posts: $1 a day'],
    [/^публикаций: (.+)$/i, 'posts: $1'],
    [/^брендов: (.+)$/i, 'brands: $1'],
    [/^Оплатить (.+)$/i, 'Pay $1'],
    [/^или (.+) за год$/i, 'or $1 a year'],
    [/^Сейчас у тебя тариф «(.+)»\.$/i, 'Your plan is “$1”.'],
    [/^хватит тарифа «(.+)»$/i, 'the “$1” plan is enough'],
    [/^(.+) ₽$/i, '$1 ₽']
  ];

  var PLANS = { 'Старт': 'Start', 'Рост': 'Growth', 'Про': 'Pro', 'Агентство': 'Agency', 'Безлимит': 'Unlimited' };
  function planNames(text) {
    var out = text;
    for (var k in PLANS) out = out.split(k).join(PLANS[k]);
    return out;
  }

  function translatePatterns(text) {
    for (var i = 0; i < PATTERNS.length; i++) {
      var p = PATTERNS[i];
      if (p[0].test(text)) {
        var out = (typeof p[1] === 'function') ? text.replace(p[0], p[1]) : text.replace(p[0], p[1]);
        if (out !== text) return out;
      }
    }
    return null;
  }

  function translateByValue() {
    if (!RU2EN || !document.body) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      var t = n.nodeValue;
      if (!t) continue;
      var key = t.replace(/\s+/g, ' ').trim();
      if (!key) continue;
      var lead = (t.match(/^\s*/) || [''])[0];
      var trail = (t.match(/\s*$/) || [''])[0];
      var en = RU2EN[key];
      if (en && en !== key) { n.nodeValue = lead + en + trail; continue; }
      if (key.length <= 120) {
        var pat = translatePatterns(key);
        if (pat) { n.nodeValue = lead + planNames(pat) + trail; }
      }
    }
  }

  /* абзацы часто разбиты на куски жирным — переводим блоком */
  function translateBlocks() {
    if (!RU2EN) return;
    var els = document.querySelectorAll('p, li, h2, h3, h4, div, span, small');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.gg-rail') || el.closest('script') || el.closest('style')) continue;
      if (el.childElementCount > 6) continue;
      var txt = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 400) continue;
      if (!/[А-Яа-яЁё]/.test(txt)) continue;
      var en = RU2EN[txt];
      if (!en && PREFIX_IDX && txt.length >= 30) en = PREFIX_IDX[txt.slice(0, 44)];
      if (!en) continue;
      if (/[<]/.test(el.innerHTML)) {
        el.textContent = planNames(en);       /* теряем жирный, сохраняем смысл */
      } else {
        el.textContent = planNames(en);
      }
    }
  }

  /* атрибуты: placeholder, title, aria-label — по значению словаря */
  function translateAttrs() {
    if (!RU2EN) return;
    var els = document.querySelectorAll('[placeholder], [title], [aria-label]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (!v) return;
        var key = v.replace(/\s+/g, ' ').trim();
        var en = RU2EN[key];
        if (en && en !== key) el.setAttribute(attr, en);
      });
    }
  }

  var pending = null;
  function observe() {
    if (!window.MutationObserver || !document.body) return;
    var mo = new MutationObserver(function () {
      if (pending) return;
      pending = setTimeout(function () { pending = null; translateByValue(); translateBlocks(); translateAttrs(); }, 350);
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.ggRetranslate = function () { translateByValue(); translateBlocks(); translateAttrs(); };

  fetch(DICT_URL, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) { dict = data; apply(); buildValueMap(); })
    .catch(function () {
      /* молча. Русский текст уже на странице. */
    });
})();
