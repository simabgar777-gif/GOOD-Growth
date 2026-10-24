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

  /* ---------- 1. активный раздел ---------- */
  var path = (location.pathname || '/').replace(/\/+$/, '') || '/app';
  var MAP = [
    ['/app/strategy', 'strategy'],
    ['/app/posts', 'posts'],
    ['/app/schedule', 'schedule'],
    ['/app/analytics', 'analytics'],
    ['/app/channels', 'channels'],
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
