/* ============================================================
   GOOD Growth · тема (приказ №74, уточнение)

   Плавающей плашки НЕТ. Переключатель живёт в профиле,
   в блоке «Настройки» — там ему и место.

   Иконку в шапку добавит Зая: gg-header.js у неё на сервере,
   я его не вижу.

   Модуль только применяет и запоминает тему. Никакого DOM.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'gg_theme';
  var VALID = { dark: 1, light: 1, system: 1 };

  function get() {
    try {
      var v = localStorage.getItem(KEY);
      return VALID[v] ? v : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function apply(mode) {
    var d = document.documentElement;
    if (mode === 'system') {
      d.removeAttribute('data-theme');
      d.setAttribute('data-theme-src', 'system');
    } else {
      d.setAttribute('data-theme', mode === 'light' ? 'light' : 'dark');
      d.removeAttribute('data-theme-src');
    }
  }

  function paint() {
    var mode = get();
    var btns = document.querySelectorAll('[data-theme-pick]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed',
        btns[i].getAttribute('data-theme-pick') === mode ? 'true' : 'false');
    }
  }

  function set(mode) {
    if (!VALID[mode]) mode = 'dark';
    apply(mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    paint();
    try { document.dispatchEvent(new CustomEvent('gg:theme', { detail: { mode: mode } })); } catch (e) {}
  }

  window.ggTheme = { get: get, set: set, apply: apply, paint: paint };

  // если инлайн-скрипт в <head> не сработал
  apply(get());

  // кнопки могли отрисоваться позже (профиль строит разметку скриптом)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paint);
  } else {
    paint();
  }
  document.addEventListener('gg:ready', paint);
})();
