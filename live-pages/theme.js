/* ============================================================
   GOOD Growth · переключатель темы (приказ №74)

   · запоминает выбор в localStorage
   · «Системная» — НЕ ставит data-theme, работает prefers-color-scheme
   · по умолчанию (первый визит) — ТЁМНАЯ: она основная
   · сам ставит кнопку в левый нижний угол

   Атрибут темы должен быть выставлен ДО отрисовки — это делает
   маленький инлайн-скрипт в <head> каждой страницы (иначе вспышка).
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'gg_theme';
  var MODES = [
    { id: 'dark', label: 'Тёмная' },
    { id: 'light', label: 'Светлая' },
    { id: 'system', label: 'Системная' }
  ];

  function read() {
    try { return localStorage.getItem(KEY) || 'dark'; } catch (e) { return 'dark'; }
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

  function save(mode) {
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  function paint(switcher, mode) {
    var btns = switcher.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-mode') === mode ? 'true' : 'false');
    }
  }

  function set(mode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') mode = 'dark';
    apply(mode);
    save(mode);
    var sw = document.querySelector('.gg-theme-switch');
    if (sw) paint(sw, mode);
    try { document.dispatchEvent(new CustomEvent('gg:theme', { detail: { mode: mode } })); } catch (e) {}
  }

  function build() {
    if (document.querySelector('.gg-theme-switch')) return;
    var box = document.createElement('div');
    box.className = 'gg-theme-switch';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Тема оформления');
    for (var i = 0; i < MODES.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = MODES[i].label;
      b.setAttribute('data-mode', MODES[i].id);
      b.addEventListener('click', function () {
        set(this.getAttribute('data-mode'));
      });
      box.appendChild(b);
    }
    document.body.appendChild(box);
    paint(box, read());
  }

  window.ggTheme = { get: read, set: set, apply: apply };

  // на случай, если инлайн-скрипт в <head> не сработал
  apply(read());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
