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

  var DICT_URL = '/i18n/ru.json';
  var dict = null;

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

    // заголовок вкладки
    if (dict['login.meta.title']) document.title = dict['login.meta.title'];

    document.documentElement.setAttribute('data-i18n-ready', '1');
    try { document.dispatchEvent(new CustomEvent('gg:i18n')); } catch (e) {}
  }

  /* Перевод для скриптов страницы. Всегда с запасным текстом:
     если словарь ещё не пришёл — вернётся то, что написано в коде. */
  window.ggT = function (key, fallback) {
    return (dict && dict[key] != null) ? dict[key] : (fallback != null ? fallback : key);
  };

  window.ggLang = function () { return 'ru'; };

  fetch(DICT_URL, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) { dict = data; apply(); })
    .catch(function () {
      /* молча. Русский текст уже на странице. */
    });
})();
