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
  ['/pricing', 'pricing'],
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

      /* гость в кабинете: показываем вход, а не пустые цифры */
      if (!u && !window.ggAuthGuard) {
        var p = location.pathname.replace(/\/+$/, '');
        if ((p === '/app' || p.indexOf('/app/') === 0 || p === '/profile' || p.indexOf('/partner') === 0)
            && p !== '/app/onboard' && p !== '/app/onboard/') {
          window.ggAuthGuard = true;
          location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
          return;
        }
      }
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

/* ============================================================
   «Путь» — общий источник состояния + тропа

   ПРАВДА ПРЕЖДЕ ВСЕГО: три честных состояния.
     loading — ещё не знаем
     auth    — не вошёл
     error   — не смогли загрузить (НЕ «0 из 5»)
     ok      — настоящие данные

   Один расчёт на всю страницу: и тропа, и лента берут отсюда.
   Кэш 30 секунд — чтобы не гонять до 12 запросов на «Стол».
   ============================================================ */
(function () {
  var TTL = 30000;
  var cache = null, at = 0, inflight = null;

  function j(u) {
    return fetch(u, { credentials: 'same-origin' }).then(function (r) {
      if (r.status === 401) { var e = new Error('auth'); e.auth = true; throw e; }
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  function compute() {
    return Promise.all([j('/api/analytics'), j('/api/slots'), j('/api/goals')])
      .then(function (res) {
        var t = (res[0] && res[0].totals) || {};
        var slots = (res[1] && res[1].slots) || [];
        var goals = (res[2] && res[2].goals) || [];

        var done = [
          Number(t.goals) > 0,
          false,                                  /* разбор — проверим ниже */
          slots.length > 0,
          Number(t.posts) > 0,
          Number(t.published) > 0
        ];
        if (!goals.length) return done;

        return j('/api/goals/' + goals[0].id).then(function (g) {
          var s = (g && g.strategy) || {};
          /* «разбор» — это НЕ заглушка: нужны реальные темы или живая сводка */
          var hasTopics = Array.isArray(s.topics) && s.topics.length > 0;
          var hasSummary = typeof s.summary === 'string' && s.summary.length > 20 &&
                           s.summary.indexOf('не описан') < 0;
          done[1] = hasTopics || hasSummary;
          return done;
        }, function () { return done; });
      });
  }

  function load(force) {
    var now = Date.now();
    if (!force && cache && (now - at) < TTL) return Promise.resolve(cache);
    if (inflight) return inflight;
    inflight = compute().then(function (done) {
      cache = { status: 'ok', done: done };
      at = Date.now(); inflight = null;
      return cache;
    }, function (err) {
      inflight = null;
      return { status: err && err.auth ? 'auth' : 'error' };
    });
    return inflight;
  }

  window.ggPathState = {
    load: load,
    invalidate: function () { at = 0; },
    TTL: TTL
  };

  /* ── тропа: десктоп (в панели) и телефон (в шапке) ────────── */
  var STEPS = [
    { nm: 'Цель',   href: '/app/strategy',  c: '#F8961D' },
    { nm: 'Разбор', href: '/app/strategy',  c: '#E0574B' },
    { nm: 'Ритм',   href: '/app/schedule',  c: '#A96AB8' },
    { nm: 'Посты',  href: '/app/posts',     c: '#28A992' },
    { nm: 'Отклик', href: '/app/analytics', c: '#4CB853' }
  ];

  function stateOf(res, i, cur) {
    if (res.status !== 'ok') return '';
    return res.done[i] ? 'done' : (i === cur ? 'now' : '');
  }
  function currentIdx(res) {
    if (res.status !== 'ok') return -1;
    var k = res.done.indexOf(false);
    return k < 0 ? res.done.length : k;
  }

  /* панель */
  function renderRail(res) {
    var rail = document.getElementById('gg-rail') || document.querySelector('.sidebar');
    if (!rail) return;
    var old = document.querySelector('.gg-trail');
    if (old) old.remove();

    var cur = currentIdx(res);
    var box = document.createElement('div');
    box.className = 'gg-trail';
    var html = '<div class="gg-trail-h">Путь</div>';

    if (res.status === 'loading') {
      STEPS.forEach(function (s) { html += '<a class="loading" href="' + s.href + '"><i style="--step:' + s.c + '"></i>' + s.nm + '</a>'; });
    } else if (res.status === 'auth') {
      html += '<a class="note" href="/login">Войди, чтобы видеть путь</a>';
    } else if (res.status === 'error') {
      html += '<a class="note" href="#" data-path-retry>Не удалось загрузить · повторить</a>';
    } else {
      STEPS.forEach(function (s, i) {
        var st = stateOf(res, i, cur);
        html += '<a href="' + s.href + '" class="' + st + '" style="--step:' + s.c + '"' +
          (st === 'now' ? ' aria-current="step"' : '') +
          ' aria-label="' + s.nm + (st === 'done' ? ' — сделано' : st === 'now' ? ' — сейчас' : ' — впереди') + '">' +
          '<i></i>' + s.nm + '</a>';
      });
    }
    box.innerHTML = html;
    var nav = rail.querySelector('.gg-rail-nav') || rail.querySelector('nav');
    if (nav && nav.parentNode) nav.parentNode.insertBefore(box, nav.nextSibling);
    else rail.appendChild(box);
  }

  /* телефон: компактная полоса в шапке */
  function renderMobile(res) {
    /* полоса живёт ПОД шапкой отдельной строкой: в шапке ей тесно */
    var host = document.querySelector('.gg-band') || document.querySelector('.topline');
    if (!host || !host.parentNode) return;
    var old = document.querySelector('.gg-mtrail');
    if (old) old.remove();

    var cur = currentIdx(res);
    var box = document.createElement('div');
    box.className = 'gg-mtrail';
    if (res.status === 'auth') { box.innerHTML = '<a href="/login">войти</a>'; }
    else if (res.status === 'error') { box.innerHTML = '<a href="#" data-path-retry>путь: повторить</a>'; }
    else {
      var html = '<span class="lbl">Путь</span>';
      STEPS.forEach(function (s, i) {
        var st = res.status === 'ok' ? stateOf(res, i, cur) : 'loading';
        html += '<a href="' + s.href + '" class="' + st + '" style="--step:' + s.c +
          '" aria-label="' + s.nm + '"><i></i></a>';
      });
      if (res.status === 'ok' && cur < STEPS.length) {
        html += '<span class="now-name">' + STEPS[cur].nm + '</span>';
      }
      box.innerHTML = html;
    }
    host.parentNode.insertBefore(box, host.nextSibling);
  }

  function paint(res) {
    /* маленькая тропа из панели убрана: её место — большая тропа
       на странице «Цель». На телефоне полоса остаётся: там нет панели. */
    var oldTrail = document.querySelector('.gg-trail');
    if (oldTrail) oldTrail.remove();
    renderMobile(res);
  }

  function boot() {
    var hasRail = document.getElementById('gg-rail') || document.querySelector('.sidebar');
    var hasTop = document.querySelector('.gg-band') || document.querySelector('.topline');
    if (!hasRail && !hasTop) return;

    paint({ status: 'loading' });
    load().then(paint);

    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-path-retry]');
      if (!b) return;
      e.preventDefault();
      paint({ status: 'loading' });
      load(true).then(paint);
    });

    /* после действий человека состояния могли измениться */
    ['gg:goal', 'gg:posts-changed', 'gg:slots-changed'].forEach(function (ev) {
      document.addEventListener(ev, function () { window.ggPathState.invalidate(); load(true).then(paint); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ── КРОШКА «← Стол»: одна на всех страницах ──────────────────
   Дверь домой в кабинет. На самом Столе не нужна — ты уже дома. */
(function () {
  function fix() {
    if (window.ggCrumbFix) return;
    window.ggCrumbFix = true;

    var here = location.pathname.replace(/\/+$/, '');
    var bar = document.querySelector('.topline') || document.querySelector('.gg-band');
    var existing = document.querySelector('.gg-crumb') || document.querySelector('.crumb a');

    if (here === '/app') {
      /* дома крошка не нужна */
      var c = document.querySelector('.crumb');
      if (c) c.style.display = 'none';
      if (existing && existing.classList.contains('gg-crumb')) existing.remove();
      return;
    }

    if (existing) {
      existing.setAttribute('href', '/app');
      existing.textContent = '← Стол';
      return;
    }
    if (!bar) return;

    var a = document.createElement('a');
    a.className = 'gg-crumb';
    a.href = '/app';
    a.textContent = '← Стол';
    bar.insertBefore(a, bar.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix);
  else fix();
})();

/* ── панель открыть / закрыть ─────────────────────────────────
   Сжимается до иконок; выбор запоминается. */
(function railCollapse() {
  var KEY = 'gg_rail';
  var btn = document.createElement('button');
  btn.id = 'ggRailToggle';
  btn.type = 'button';
  btn.className = 'gg-rail-toggle';

  function apply(collapsed) {
    /* класс на <html> — его ставит ранний скрипт в <head>, поэтому
       панель не мигает: свёрнутая ширина известна ДО отрисовки */
    document.documentElement.classList.toggle('gg-rail-collapsed', collapsed);
    document.body.classList.toggle('gg-rail-collapsed', collapsed);
    btn.textContent = collapsed ? '\u203A' : '\u2039';
    btn.setAttribute('aria-label', collapsed ? 'Развернуть панель' : 'Свернуть панель');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.title = btn.getAttribute('aria-label');
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  var saved = document.documentElement.classList.contains('gg-rail-collapsed');
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(btn);
    apply(saved);
    btn.addEventListener('click', function () {
      var next = !document.body.classList.contains('gg-rail-collapsed');
      try { localStorage.setItem(KEY, next ? '1' : '0'); } catch (e) {}
      apply(next);
    });
  });
})();

/* ── аккаунт внизу панели: имя, тариф и меню ─────────────────
   Как у Buffer: одна точка входа ко всему личному. */
(function accountBlock() {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var rail = document.getElementById('gg-rail');
    if (!rail) return;
    document.body.classList.add('gg-acc-ready');

    var acc = document.createElement('div');
    acc.className = 'gg-acc';
    acc.innerHTML =
      '<button type="button" class="gg-acc-btn" id="ggAccBtn" aria-haspopup="menu" aria-expanded="false">' +
        '<span class="gg-acc-ava">◈</span>' +
        '<span class="gg-acc-tx"><b id="ggAccName">Мой аккаунт</b><em id="ggAccPlan">тариф: —</em></span>' +
        '<span class="gg-acc-chev">\u2303</span>' +
      '</button>' +
      '<div class="gg-acc-pop" id="ggAccPop" role="menu" hidden>' +
        '<div class="gg-acc-head"><b id="ggAccEmail">—</b><em>GOOD Growth</em></div>' +
        '<a role="menuitem" href="/profile">Настройки</a>' +
        '<a role="menuitem" href="/partner/channels">Каналы</a>' +
        '<a role="menuitem" href="/pricing">Тарифы</a>' +
        '<a role="menuitem" href="/app/billing">Оплата</a>' +
        '<a role="menuitem" href="/partner/info">Партнёрам</a>' +
        '<a role="menuitem" href="mailto:hello@growth.go-ood.com">Помощь</a>' +
        '<button type="button" role="menuitem" id="ggAccTheme">Сменить тему</button>' +
        '<button type="button" role="menuitem" class="danger" id="ggAccOut">Выйти</button>' +
      '</div>';
    rail.appendChild(acc);

    var btn = acc.querySelector('#ggAccBtn');
    var pop = acc.querySelector('#ggAccPop');

    function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    function open() { pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      pop.hidden ? open() : close();
    });
    document.addEventListener('click', function (e) {
      if (!pop.hidden && !acc.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    acc.querySelector('#ggAccTheme').addEventListener('click', function () {
      var t = document.getElementById('ggRailTheme');
      if (t) t.click();
      close();
    });
    acc.querySelector('#ggAccOut').addEventListener('click', function () {
      var out = document.getElementById('ggRailOut') || document.querySelector('[data-logout]');
      if (out) { out.click(); return; }
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
        .then(function () { location.href = '/login'; })
        .catch(function () { location.href = '/login'; });
    });

    var NAMES = { start: 'Старт', growth: 'Рост', pro: 'Про', agency: 'Агентство', unlimited: 'Безлимит' };

    fetch('/api/me', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var u = d && (d.user || d);
        if (u && (u.name || u.email)) {
          acc.querySelector('#ggAccName').textContent = u.name || u.email;
          acc.querySelector('#ggAccEmail').textContent = u.email || u.name;
          acc.querySelector('.gg-acc-ava').textContent = (u.name || u.email || 'G').charAt(0).toUpperCase();
        }
      })
      .catch(function () {});

    fetch('/api/plan', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.plan) acc.querySelector('#ggAccPlan').textContent = 'тариф: ' + (NAMES[d.plan] || d.plan);
      })
      .catch(function () {});
  });
})();

/* ── переходы без перезагрузки: панель стоит, меняется содержимое ──
   Как у Buffer. Работает только на страницах с общим каркасом
   (.wrap), не на «Столе» и «Цели» — там своя жизнь. */
(function softNav() {
  var CONTENT = '.wrap';
  if (!document.querySelector(CONTENT)) return;                 /* не тот каркас */
  if (location.pathname === '/app' || location.pathname.indexOf('/app/strategy') === 0) return;

  function isInternal(a) {
    if (!a || !a.getAttribute) return false;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '/' || href.charAt(1) === '/') return false;
    if (a.target || a.hasAttribute('download') || a.hasAttribute('data-no-spa')) return false;
    var clean = href.split('?')[0];
    /* «Стол» и «Цель» живут на своём каркасе — их грузим обычно */
    if (clean === '/app' || clean.indexOf('/app/strategy') === 0) return false;
    if (clean.indexOf('/login') === 0 || clean.indexOf('/logout') === 0) return false;
    return true;
  }

  var busy = false;
  async function ggNavTo(url, push) {
    if (busy) return;
    busy = true;
    document.documentElement.classList.add('gg-nav-busy');
    try {
      var res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('fail');
      var html = await res.text();
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fresh = doc.querySelector(CONTENT);
      var old = document.querySelector(CONTENT);
      if (!fresh || !old) throw new Error('no wrap');

      /* убрать скрипты прошлой страницы, чтобы не копились */
      document.querySelectorAll('script[data-gg-page]').forEach(function (s) { s.remove(); });

      old.replaceWith(document.importNode(fresh, true));

      if (doc.title) document.title = doc.title;

      /* пере-выполнить инлайн-скрипты новой страницы */
      doc.querySelectorAll('script:not([src])').forEach(function (src) {
        var code = src.textContent || '';
        if (!code.trim()) return;
        /* в своей области: иначе повторные const/let ломают страницу */
        try {
          new Function(code)();
        } catch (err) {
          var el = document.createElement('script');
          el.setAttribute('data-gg-page', '1');
          el.textContent = code;
          document.body.appendChild(el);
        }
      });

      if (push) history.pushState({ gg: 1 }, '', url);
      window.scrollTo(0, 0);

      /* подсветить пункт меню */
      var path = location.pathname;
      document.querySelectorAll('.gg-rail-nav a, .sidebar .nav a').forEach(function (a) {
        var h = a.getAttribute('href') || '';
        a.classList.toggle('is-on', h === path || (h !== '/' && path.indexOf(h) === 0 && h !== '/app'));
      });
    } catch (e) {
      location.href = url;                       /* тихий откат к обычной загрузке */
    } finally {
      busy = false;
      document.documentElement.classList.remove('gg-nav-busy');
    }
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!isInternal(a)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      ggNavTo(a.getAttribute('href'), true);
    });
    window.addEventListener('popstate', function () { ggNavTo(location.pathname + location.search, false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
