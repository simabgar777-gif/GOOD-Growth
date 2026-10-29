/* ============================================================
   GOOD Growth · общая шапка и мобильное меню

   Одна шапка на всех страницах, как в дизайне Заи:

       ← О сервисе              [● ИИ]  [RU EN ՀԱ]  [◐]
       ─────────────────────────────────────────────────────

   На странице Заи своя такая же — там добавляем только бургер.
   На телефоне меню открывается по бургеру и собирается из
   пунктов панели.
   ============================================================ */
(function () {
  'use strict';

  var MARK =
    '<svg class="gg-mark" viewBox="238 162 74 101" aria-hidden="true" fill="none" ' +
    'stroke-width="11" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M256 193 244 180 244 252" stroke="#F8961D"/>' +
    '<path d="M306 168 263 209" stroke="#28A992"/>' +
    '<path d="M287 216 245 257" stroke="#E01F27"/>' +
    '<path d="M293 227 306.5 244 306.5 176" stroke="#4CB853"/></svg>';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* меню из пунктов панели */
  function buildMenu(burger, host) {
    if (!burger || !host) return;
    var rail = document.getElementById('gg-rail');
    var menu = document.createElement('div');
    menu.className = 'gg-mobmenu';
    menu.hidden = true;

    var here = location.pathname.replace(/\/+$/, '') || '/';
    var links = rail ? rail.querySelectorAll('a[data-k]') : [];

    /* активным считаем САМОЕ ДЛИННОЕ совпадение: иначе /app подсвечивался
       на /app/schedule вместе с «Публикациями» */
    var best = '', bestLen = -1;
    for (var b = 0; b < links.length; b++) {
      if (links[b].dataset.k === 'logout') continue;
      var hp = (links[b].getAttribute('href') || '').replace(/\/+$/, '');
      if ((hp === here || here.indexOf(hp + '/') === 0) && hp.length > bestLen) {
        best = hp; bestLen = hp.length;
      }
    }

    var html = '';
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.dataset.k === 'logout') continue;
      var href = a.getAttribute('href') || '#';
      var path = href.replace(/\/+$/, '');
      var on = (path === best);
      html += '<a href="' + href + '"' + (on ? ' class="is-on" aria-current="page"' : '') + '>' +
              a.textContent.trim() + '</a>';
    }
    /* выход/вход — по факту: гость не должен видеть «Выйти» */
    html += '<span id="ggMobAuth"></span>';
    menu.innerHTML = html;

    var authHost = menu.querySelector('#ggMobAuth');
    fetch('/api/me', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var u = d && (d.user || (d.id ? d : null));
        if (u) {
          var out = document.createElement('button');
          out.type = 'button';
          out.className = 'gg-mobmenu-out';
          out.textContent = 'Выйти';
          out.addEventListener('click', function () {
            out.disabled = true;
            fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
              .then(function () { location.href = '/'; })
              .catch(function () { location.href = '/'; });
          });
          authHost.appendChild(out);
        } else {
          var enter = document.createElement('a');
          enter.className = 'gg-mobmenu-in';
          enter.href = '/login';
          enter.textContent = 'Войти';
          authHost.appendChild(enter);
        }
      })
      .catch(function () {});

    host.appendChild(menu);

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

  ready(function () {
    /* ── страница Заи: свой блок языков и темы. Полосу не дублируем,
          но бургер для телефона добавляем в её топбар. ── */
    var nativeTop = document.querySelector('.status-chips') || document.querySelector('.lang-switch');
    if (nativeTop) {
      if (document.getElementById('ggBurger')) return;
      var tbar = document.querySelector('.topline');
      if (!tbar) return;
      var b2 = document.createElement('button');
      b2.type = 'button';
      b2.id = 'ggBurger';
      b2.className = 'gg-burger-inline';
      b2.setAttribute('aria-label', 'Меню');
      b2.setAttribute('aria-expanded', 'false');
      b2.textContent = '☰';

      /* порядок как на остальных страницах: сначала знак, потом бургер */
      var brand = document.createElement('a');
      brand.className = 'gg-band-brand';
      brand.href = '/app';
      brand.setAttribute('aria-label', 'GOOD Growth');
      brand.innerHTML = MARK + '<b>GOOD Growth</b>';
      tbar.insertBefore(brand, tbar.firstChild);
      brand.insertAdjacentElement('afterend', b2);

      buildMenu(b2, document.body);
      return;
    }

    if (document.querySelector('.gg-band')) return;

    /* ── обычная страница: своя полоса ── */
    var band = document.createElement('div');
    band.className = 'gg-band';
    band.innerHTML =
      '<a class="gg-band-brand" href="/app" aria-label="GOOD Growth">' + MARK +
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

    /* языки: русский нажат, остальные «скоро» */
    var langs = band.querySelectorAll('.gg-lang button');
    for (var k = 0; k < langs.length; k++) {
      langs[k].addEventListener('click', function (e) {
        if (this.getAttribute('data-lang') === 'ru') return;
        e.preventDefault();
      });
    }

    /* мобильное меню */
    buildMenu(band.querySelector('#ggBurger'), band.parentNode);
  });
})();
