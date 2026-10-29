/* ============================================================
   GOOD Growth · общая шапка (topline)

   Приказ Капитана: шапка одинаковая на всех страницах, как в
   дизайне Заи:

       ← О сервисе                    [● ИИ]  [RU EN ՀԱ]  [◐]
       ─────────────────────────────────────────────────────
       (ниже — заголовок страницы и содержимое)

   Полоса во всю ширину, липнет к верху, с линией и размытием.
   На странице Заи (index) своя такая же — там модуль молчит.
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    /* на странице Заи уже есть свой топбар — не дублируем */
    if (document.querySelector('.status-chips') || document.querySelector('.lang-switch')) return;
    if (document.querySelector('.gg-band')) return;

    var band = document.createElement('div');
    band.className = 'gg-band';
    band.innerHTML =
      '<a class="gg-crumb" href="/">← О сервисе</a>' +
      '<div class="gg-sys">' +
        '<span class="gg-chip" title="Режим разбора">' +
          '<span class="dot"></span><span class="gg-chip-tx">ИИ · не подключён</span>' +
        '</span>' +
        '<div class="gg-lang" role="group" aria-label="Язык">' +
          '<button type="button" aria-pressed="true" data-lang="ru">RU</button>' +
          '<button type="button" aria-pressed="false" data-lang="en" title="скоро">EN</button>' +
          '<button type="button" aria-pressed="false" data-lang="hy" title="скоро">ՀԱ</button>' +
        '</div>' +
        '<button type="button" class="gg-icon" id="ggThemeBtn" aria-label="Сменить тему" title="Сменить тему">◐</button>' +
      '</div>';

    /* место: перед содержимым страницы */
    var wrap = document.querySelector('.wrap') || document.querySelector('main');
    if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(band, wrap);
    else document.body.insertBefore(band, document.body.firstChild);

    /* режим ИИ — настоящий */
    fetch('/api/keys/deepseek/status', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var tx = band.querySelector('.gg-chip-tx');
        if (!tx || !d) return;
        tx.textContent = d.on ? 'ИИ: живой' : (d.demo ? 'ИИ · демо' : 'ИИ · не подключён');
      })
      .catch(function () {});

    /* тема */
    var btn = band.querySelector('#ggThemeBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = (window.ggTheme && window.ggTheme.get) ? window.ggTheme.get() : 'dark';
        if (window.ggTheme && window.ggTheme.set) window.ggTheme.set(cur === 'light' ? 'dark' : 'light');
      });
    }

    /* языки: русский нажат, остальные «скоро» */
    band.querySelectorAll('.gg-lang button').forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (b.getAttribute('data-lang') === 'ru') return;
        e.preventDefault();
      });
    });
  });
})();
