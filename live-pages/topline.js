/* ============================================================
   GOOD Growth · правый блок топбара на всех страницах

   Приказ Капитана: «шапка должна быть на всех страницах такая же —
   язык и цвет в углу».

   Модуль НЕ трогает существующую шапку (#gg-header) — он добавляет
   в конец .gg-topbar тот же набор, что у дизайна Заи:
       [• режим]  [RU EN ՀԱ]  [◐]

   Языки пока только показываются: русский стоит, другие помечены
   «скоро» — включать перевод будем отдельным заходом.
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    /* 1) топбар страницы, 2) шапка #gg-header, 3) своя полоса сверху */
    var bar = document.querySelector('.gg-topbar') || document.getElementById('gg-header');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'gg-band';
      var wrap = document.querySelector('.wrap') || document.querySelector('main');
      if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(bar, wrap);
      else document.body.insertBefore(bar, document.body.firstChild);
    }
    if (bar.querySelector('.gg-sys')) return;

    var box = document.createElement('div');
    box.className = 'gg-sys';
    box.innerHTML =
      '<span class="gg-chip" title="Режим разбора">' +
        '<span class="dot"></span><span class="gg-chip-tx">ИИ · не подключён</span>' +
      '</span>' +
      '<div class="gg-lang" role="group" aria-label="Язык">' +
        '<button type="button" aria-pressed="true" data-lang="ru">RU</button>' +
        '<button type="button" aria-pressed="false" data-lang="en" title="скоро">EN</button>' +
        '<button type="button" aria-pressed="false" data-lang="hy" title="скоро">ՀԱ</button>' +
      '</div>' +
      '<button type="button" class="gg-icon" id="ggThemeBtn" aria-label="Сменить тему" title="Сменить тему">◐</button>';

    bar.appendChild(box);

    /* режим ИИ — настоящий, из /api/keys/.../status либо из /api/me */
    fetch('/api/keys/deepseek/status', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var tx = box.querySelector('.gg-chip-tx');
        if (!tx) return;
        if (!d) { tx.textContent = 'ИИ · не подключён'; return; }
        tx.textContent = d.on ? 'ИИ: живой' : (d.demo ? 'ИИ · демо' : 'ИИ · не подключён');
      })
      .catch(function () {});

    /* тема */
    var btn = box.querySelector('#ggThemeBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = (window.ggTheme && window.ggTheme.get) ? window.ggTheme.get() : 'dark';
        var next = cur === 'light' ? 'dark' : 'light';
        if (window.ggTheme && window.ggTheme.set) window.ggTheme.set(next);
      });
    }

    /* языки: русский нажат, остальные помечены «скоро» */
    box.querySelectorAll('.gg-lang button').forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (b.getAttribute('data-lang') === 'ru') return;
        e.preventDefault();
        b.setAttribute('title', 'скоро');
      });
    });
  });
})();
