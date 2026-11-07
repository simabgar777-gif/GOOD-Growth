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

  fetch(DICT_URL, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) { dict = data; apply(); })
    .catch(function () {
      /* молча. Русский текст уже на странице. */
    });
})();
