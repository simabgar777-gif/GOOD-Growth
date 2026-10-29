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
      '<a class="gg-band-brand" href="/app" aria-label="GOOD Growth">' + '<svg class="gg-mark" viewBox="238 162 74 101" aria-hidden="true" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M256 193 244 180 244 252" stroke="#F8961D"/><path d="M306 168 263 209" stroke="#28A992"/><path d="M287 216 245 257" stroke="#E01F27"/><path d="M293 227 306.5 244 306.5 176" stroke="#4CB853"/></svg>' +
        '<b>GOOD Growth</b></a>' +
      '<a class="gg-crumb" href="/">← О сервисе</a>' +
      '<button type="button" class="gg-burger" id="ggBurger" aria-label="Меню" aria-expanded="false">☰</button>' +
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

    /* место: первым в body — тогда полоса всегда во всю ширину,
       независимо от отступов контейнера страницы */
    var rail = document.getElementById('gg-rail');
    if (rail && rail.parentNode === document.body) rail.insertAdjacentElement('afterend', band);
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

    /* ── мобильное меню: одна шапка вместо старой и новой ── */
    var burger = band.querySelector('#ggBurger');
    var rail = document.getElementById('gg-rail');
    if (burger) {
      var menu = document.createElement('div');
      menu.className = 'gg-mobmenu';
      menu.hidden = true;
      var links = rail ? rail.querySelectorAll('a[data-k]') : [];
      var html = '';
      links.forEach(function (a) {
        if (a.dataset.k === 'logout') return;
        html += '<a href="' + a.getAttribute('href') + '">' + a.textContent.trim() + '</a>';
      });
      html += '<a class="gg-mobmenu-out" href="/login" id="ggMobOut">Выйти</a>';
      menu.innerHTML = html;
      band.parentNode.insertBefore(menu, band.nextSibling);

      burger.addEventListener('click', function () {
        var open = menu.hidden;
        menu.hidden = !open;
        burger.setAttribute('aria-expanded', String(open));
        burger.textContent = open ? '✕' : '☰';
      });
      menu.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') { menu.hidden = true; burger.textContent = '☰'; }
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
