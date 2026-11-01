/* ============================================================
   GOOD Growth · поведение ЛЕВОЙ ПАНЕЛИ (приказ №76)

   Разметка панели статичная — она видна даже без этого файла.
   Здесь только три вещи:
     1. подсветка активного раздела по адресу
     2. кнопка темы (заменила иконку из спрятанной шапки)
     3. выход — переиспользует ту кнопку, что уже есть на странице
   ============================================================ */
(function () {
  'use strict';

  var rail = document.getElementById('gg-rail');
  if (!rail) return;

  /* ---------- 1. активный раздел ----------
     Приказ №77: адреса исправлены. Порядок важен — более длинные
     пути проверяются раньше (/partner/channels до /partner). */
  var path = (location.pathname || '/').replace(/\/+$/, '') || '/app';
  var MAP = [
    ['/partner/channels', 'channels'],
    ['/partner/team', 'team'],
    ['/partner/info', 'partners'],
    ['/partner', 'brands'],
    ['/app/strategy', 'strategy'],
    ['/app/posts', 'posts'],
    ['/app/schedule', 'schedule'],
    ['/app/analytics', 'analytics'],
    ['/app/billing', 'billing'],
    ['/app/onboard', 'app'],
    ['/app', 'app'],
    ['/profile', 'profile']
  ];
  var active = '';
  for (var i = 0; i < MAP.length; i++) {
    var base = MAP[i][0];
    if (path === base || path.indexOf(base + '/') === 0) {
      active = MAP[i][1];
      break;
    }
  }
  if (active) {
    var el = rail.querySelector('[data-k="' + active + '"]');
    if (el) {
      el.classList.add('is-on');
      el.setAttribute('aria-current', 'page');
    }
  }

  /* ---------- 2. тема ---------- */
  function T(k, fb) {
    try { return (window.ggT ? window.ggT(k, fb) : fb); } catch (e) { return fb; }
  }
  var THEMES = [
    { id: 'dark', icon: '☾', key: 'rail.theme.dark', label: 'Тёмная' },
    { id: 'light', icon: '☀', key: 'rail.theme.light', label: 'Светлая' },
    { id: 'system', icon: '◐', key: 'rail.theme.system', label: 'Системная' }
  ];
  var themeBtn = rail.querySelector('#ggRailTheme');
  var themeIcon = rail.querySelector('#ggRailTheme .gg-ico');
  var themeText = rail.querySelector('#ggRailTheme .gg-tx');

  function currentTheme() {
    if (window.ggTheme && window.ggTheme.get) return window.ggTheme.get();
    return 'dark';
  }

  function paintTheme() {
    var id = currentTheme(), m = THEMES[0];
    for (var k = 0; k < THEMES.length; k++) if (THEMES[k].id === id) m = THEMES[k];
    if (themeIcon) themeIcon.textContent = m.icon;
    if (themeText) themeText.textContent = T(m.key, m.label);
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var id = currentTheme(), next = THEMES[0];
      for (var k = 0; k < THEMES.length; k++) {
        if (THEMES[k].id === id) {
          next = THEMES[(k + 1) % THEMES.length];
          break;
        }
      }
      if (window.ggTheme && window.ggTheme.set) window.ggTheme.set(next.id);
      paintTheme();
    });
    paintTheme();
  }

  /* ---------- 3. выход ---------- */
  var out = rail.querySelector('#ggRailOut');
  if (out) {
    out.addEventListener('click', function (e) {
      e.preventDefault();
      // на странице уже есть кнопка выхода — не дублируем логику, нажимаем её
      var existing = document.getElementById('wsLogout') ||
                     document.querySelector('.ws-logout, [data-logout]');
      if (existing) {
        existing.click();
        return;
      }
      try {
        fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
          .catch(function () {})
          .then(function () { location.href = '/'; });
      } catch (err) {
        location.href = '/';
      }
    });
  }
})();

/* ── вход и выход по факту ─────────────────────────────────────
   «Выйти» и «Настройки» были зашиты в панель статикой: их видел
   и гость, который ещё не входил. Спрашиваем, кто перед нами. */
(function () {
  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var u = d && (d.user || (d.id ? d : null));
      var out = document.getElementById('ggRailOut')
             || document.querySelector('.gg-rail-out')
             || document.querySelector('[data-logout]');
      var prof = document.querySelector('#gg-rail a[data-k="profile"]')
              || document.querySelector('.sidebar a[data-k="profile"]');
      if (u) return;   /* вошёл — всё как есть */

      if (out && out.parentNode) {
        var a = document.createElement('a');
        a.href = '/login';
        a.className = 'gg-rail-in';
        a.textContent = 'Войти';
        out.parentNode.replaceChild(a, out);
      }
      if (prof) prof.style.display = 'none';
    })
    .catch(function () {});
})();

/* ── «Тропа»: маленький компас в панели ────────────────────
   Пять шагов пути. Состояния — по живым данным, без отметок. */
(function () {
  var STEPS = [
    { nm: 'Цель',   href: '/app/strategy',  c: '#F8961D' },
    { nm: 'Разбор', href: '/app/strategy',  c: '#E0574B' },
    { nm: 'Ритм',   href: '/app/schedule',  c: '#A96AB8' },
    { nm: 'Посты',  href: '/app/posts',     c: '#28A992' },
    { nm: 'Отклик', href: '/app/analytics', c: '#4CB853' }
  ];
  function j(u) { return fetch(u, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  function build(done) {
    var rail = document.getElementById('gg-rail') || document.querySelector('.sidebar');
    if (!rail || document.querySelector('.gg-trail')) return;
    var cur = done.indexOf(false);
    if (cur < 0) cur = done.length;
    var box = document.createElement('div');
    box.className = 'gg-trail';
    var html = '<div class="gg-trail-h">Путь</div>';
    STEPS.forEach(function (s, i) {
      var st = done[i] ? 'done' : (i === cur ? 'now' : '');
      html += '<a href="' + s.href + '" class="' + st + '" style="--step:' + s.c + '"' +
        (st === 'now' ? ' aria-current="step"' : '') + '><i></i>' + s.nm + '</a>';
    });
    box.innerHTML = html;
    var nav = rail.querySelector('.gg-rail-nav') || rail.querySelector('nav');
    if (nav && nav.parentNode) nav.parentNode.insertBefore(box, nav.nextSibling);
    else rail.appendChild(box);
  }

  function boot() {
    if (!document.getElementById('gg-rail') && !document.querySelector('.sidebar')) return;
    Promise.all([j('/api/analytics'), j('/api/slots'), j('/api/goals')]).then(function (res) {
      var t = (res[0] && res[0].totals) || {};
      var slots = (res[1] && res[1].slots) || [];
      var goals = (res[2] && res[2].goals) || [];
      var done = [Number(t.goals) > 0, false, slots.length > 0,
                  Number(t.posts) > 0, Number(t.published) > 0];
      if (!goals.length) return build(done);
      j('/api/goals/' + goals[0].id).then(function (g) {
        var s = (g && g.strategy) || {};
        done[1] = !!(s.summary || (s.topics && s.topics.length) || (s.audience && s.audience.text));
        build(done);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
