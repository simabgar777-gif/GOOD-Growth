'use strict';
/* GOOD Growth — unified header (Order 27) + auth state (Order 30). Light Astra palette. */
(function () {
  var path = location.pathname;
  var q = new URLSearchParams(location.search);
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var CSS = '#gg-header{font:15px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}' +
    '#gg-header{position:sticky;top:0;background:rgba(11,12,14,.88);border-bottom:1px solid rgba(255,255,255,.06);-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);z-index:70}' +
    '#gg-header .ggw{max-width:1120px;margin:0 auto;padding:0 18px;display:flex;align-items:center;gap:18px;height:58px}' +
    '#gg-header a.ggb{display:flex;align-items:center;gap:9px;font-weight:600;font-size:15.5px;color:#F4F4F5;text-decoration:none;letter-spacing:-.01em}' +
    '#gg-header .ggmark{width:26px;height:26px;border-radius:7px;background:linear-gradient(145deg,#F2BC73,#E8A54F 45%,#C97B3C);color:#1B1206;display:inline-flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:800;box-shadow:0 0 0 1px rgba(255,255,255,.10) inset,0 6px 18px -8px rgba(232,165,79,.7)}' +
    '#gg-header nav{display:flex;align-items:center;gap:4px;margin-left:6px;flex:1}' +
    '#gg-header nav a{color:#A1A1AA;text-decoration:none;font-size:13.5px;font-weight:500;padding:7px 12px;border-radius:8px;white-space:nowrap;transition:color 150ms linear,background-color 150ms linear}' +
    '#gg-header nav a:hover{background:rgba(255,255,255,.05);color:#F4F4F5}' +
    '#gg-header nav a.on{background:rgba(232,165,79,.10);color:#E8A54F}' +
    '#gg-header .ggcta{margin-left:auto;display:flex;align-items:center;gap:8px}' +
    '#gg-header .ggplan{font-size:12.5px;font-weight:600;color:#D6B183;background:rgba(232,165,79,.07);border:1px solid rgba(232,165,79,.22);padding:6px 12px;border-radius:999px;text-decoration:none;white-space:nowrap}' +
    '#gg-header .ggbtn{font-size:13.5px;font-weight:600;color:#1B1206;background:linear-gradient(180deg,#F0BC72,#E8A54F 55%,#DF9A48);border:1px solid rgba(255,255,255,.16);padding:8px 16px;border-radius:8px;text-decoration:none;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 10px 26px -10px rgba(232,165,79,.55);transition:transform 150ms cubic-bezier(.22,1,.36,1),background-color 150ms linear}' +
    '#gg-header .ggbtn:hover{background:linear-gradient(180deg,#F7C987,#EDAB5D 55%,#E8A54F);transform:translateY(-1px)}' +
    '#gg-header .ggghost{font-size:13.5px;font-weight:500;color:#A1A1AA;padding:8px 12px;border-radius:8px;text-decoration:none;transition:color 150ms linear}' +
    '#gg-header .ggghost:hover{color:#F4F4F5}' +
    '#gg-header .gguser{font-size:13.5px;font-weight:500;color:#E8A54F;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none}' +
    '#gg-header .ggout{font-size:13.5px;font-weight:500;color:#A1A1AA;background:rgba(255,255,255,.032);border:1px solid rgba(255,255,255,.10);cursor:pointer;padding:8px 12px;border-radius:8px;font-family:inherit;transition:color 150ms linear,border-color 150ms linear}' +
    '#gg-header .ggout:hover{color:#E88A6F;border-color:rgba(232,138,111,.35)}' +
    '#gg-header .ggauth{font-size:13.5px;font-weight:600;color:#1B1206;background:linear-gradient(180deg,#F0BC72,#E8A54F 55%,#DF9A48);border:1px solid rgba(255,255,255,.16);padding:8px 16px;border-radius:8px;text-decoration:none;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 10px 26px -10px rgba(232,165,79,.55);transition:transform 150ms cubic-bezier(.22,1,.36,1),background-color 150ms linear}' +
    '#gg-header .ggauth:hover{background:linear-gradient(180deg,#F7C987,#EDAB5D 55%,#E8A54F);transform:translateY(-1px)}' +
  '#gg-header .ggtheme{width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#C9C9D1;font-size:15px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin-left:6px;transition:border-color 150ms,color 150ms;flex:0 0 auto}' +
  '#gg-header .ggtheme:hover{border-color:rgba(232,165,79,.45);color:#F3C583}' +
  
    '#gg-header .ggburger{display:none;margin-left:auto;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.10);border-radius:8px;font-size:19px;line-height:1;cursor:pointer;color:#F4F4F5;padding:5px 18px}' +
    '@media(max-width:860px){' +
      '#gg-header .ggburger{display:block}' +
      '#gg-header nav{display:none;position:absolute;top:58px;left:0;right:0;background:rgba(11,12,14,.97);border-bottom:1px solid rgba(255,255,255,.06);flex-direction:column;align-items:stretch;padding:10px 14px 16px;gap:2px}' +
      '#gg-header nav.open{display:flex}' +
      '#gg-header nav a{padding:11px 12px;font-size:15px}' +
      '#gg-header .ggcta{display:none}' +
      '#gg-header .ggcta-m{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);margin-top:8px}' +
    '}' +
    '@media(min-width:861px){#gg-header .ggcta-m{display:none!important}}' +
    '#gg-invite-banner{font:14.5px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:rgba(232,165,79,.08);border-bottom:1px solid rgba(232,165,79,.20);color:#F4F4F5;padding:11px 18px;text-align:center}' +
    '#gg-invite-banner b{color:#F4F4F5}' +
    '#gg-invite-banner a{color:#E8A54F;font-weight:600;text-decoration:none;margin-left:6px}' +
    '#gg-invite-banner a:hover{text-decoration:underline}';
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  function A(href, label, cls) { return '<a href="' + href + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + label + '</a>'; }
  function on(pfx) {
    if (pfx === '/') return path === '/';
    return path === pfx || path.indexOf(pfx + '/') === 0 || path.indexOf(pfx + '?') === 0;
  }
  function mark(href) { return '<a class="ggb" href="' + href + '"><span class="ggmark">G</span>GOOD Growth</a>'; }
  function nav(links) { return '<nav>' + links.map(function (l) { return A(l[0], l[1], on(l[0]) && l[0] !== '#' ? 'on' : ''); }).join('') + '</nav>' + '<button class=\"ggtheme\" id=\"gg-theme-btn\" type=\"button\" aria-label=\"Сменить тему\" title=\"Тема: тёмная/светлая/системная\">☾</button>'; }
  var ROLE_RU = { creator: 'Создатель', approver: 'Утверждающий', publisher: 'Публикатор' };
  function renderInviteBanner(u) {
    if (!u || !u.pendingInvite || u.pendingInvite.accepted) return;
    if (document.getElementById('gg-invite-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'gg-invite-banner';
    var nm = u.name || u.email;
    var rl = ROLE_RU[u.pendingInvite.role] || u.pendingInvite.role;
    bar.innerHTML = '📨 <b>' + esc(nm) + '</b>, тебя ждут в команде GOOD Growth в роли «' + esc(rl) + '». ' +
      '<a href="/partner/team">Открыть мастерскую →</a>';
    var h = document.getElementById('gg-header');
    if (h && h.parentNode) h.parentNode.insertBefore(bar, h.nextSibling);
  }

  /* Order 30: auth guard — protected zones bounce guests to /login */
  var isProtected = (path === '/partner' || path.indexOf('/partner/') === 0 || (path === '/app' || path.indexOf('/app/') === 0)) && path !== '/app/onboard';
  var knownUser = null;
  try { knownUser = JSON.parse(sessionStorage.getItem('gg_user') || 'null'); } catch (e) {}
  if (isProtected && !knownUser) {
    try { sessionStorage.setItem('gg_after_login', location.pathname + location.search); } catch (e) {}
    location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
    return;
  }

  var brand = q.get('brand') || sessionStorage.getItem('gg_brand') || '';
  var inBrand = (path === '/app' || path.indexOf('/app/') === 0 || path.indexOf('/partner/channels') === 0 || path.indexOf('/partner/analytics') === 0) && !!brand;
  var isPartnerZone = path === '/partner' || path.indexOf('/partner/') === 0;

  function userCta(mobileCls) {
    var cls = mobileCls ? ' ' + mobileCls : '';
    if (knownUser) {
      var nm = knownUser.name || knownUser.email || '';
      return '<a class="gguser' + cls + '" href="/profile" title="Профиль" style="text-decoration:none">' + esc(nm) + '</a>' +
        '<button class="ggout' + cls + '" id="gg-logout" type="button">Выйти</button>';
    }
    if (path === '/login') return A('/signup', 'Начать бесплатно', 'ggauth' + cls);
    if (path === '/signup') return A('/login', 'Войти', 'ggghost' + cls);
    return A('/login', 'Войти', 'ggghost' + cls) + A('/signup', 'Начать бесплатно', 'ggauth' + cls);
  }

  var links, cta, logoHref;
  if (inBrand) {
    logoHref = '/partner';
    links = [
      ['/partner', '&larr; Бренды'],
      ['/partner/channels?brand=' + encodeURIComponent(brand), 'Каналы'],
      ['/partner/analytics?brand=' + encodeURIComponent(brand), 'Аналитика бренда'],
      ['/pricing', 'Тарифы']
    ];
    cta = '<a class="ggplan" id="gg-plan-badge" href="/app/billing">Ваш тариф…</a>' + A('/app?brand=' + encodeURIComponent(brand), 'Открыть мастерскую', 'ggbtn');
  } else if (isPartnerZone) {
    logoHref = '/partner';
    links = [
      ['/partner', 'Мои бренды'],
      ['/partner/analytics', 'Аналитика'],
      ['/partner/team', 'Команда'],
      ['/pricing', 'Тарифы']
    ];
    cta = '<a class="ggplan" id="gg-plan-badge" href="/app/billing">Ваш тариф…</a>' + A('/partner/profile', 'Профиль', 'ggghost');
  } else if (path === '/app' || path.indexOf('/app/') === 0) {
    logoHref = '/app';
    links = [
      ['/app', 'Мастерская'],
      ['/app/analytics', 'Аналитика'],
      ['/pricing', 'Тарифы']
    ];
    cta = '<a class="ggplan" id="gg-plan-badge" href="/app/billing">Ваш тариф…</a>' + A('/app/profile', 'Профиль', 'ggghost');
  } else {
    logoHref = '/';
    links = [
      ['/#process', 'Как работает'],
      ['/pricing', 'Тарифы'],
      ['/partner/info', 'Партнёрам']
    ];
    cta = userCta('');
  }

  var html = '<div class="ggw">' + mark(logoHref) +
    '<button class="ggburger" id="gg-burger" aria-label="Меню">☰</button>' + nav(links) +
    '<div class="ggcta">' + cta + '</div>' +
    '<div class="ggcta-m">' + userCta('ggcta-m-item') + '</div>' +
    '</div>';

  var host = document.getElementById('gg-header');
  if (!host) { host = document.createElement('div'); host.id = 'gg-header'; }
  host.appendChild(el(html));
  document.body.insertBefore(host, document.body.firstChild);
  if (window.console && console.warn) { var __ggLinks = host.querySelectorAll('a'); var __ggBad = []; __ggLinks.forEach(function(a){ var h = a.getAttribute('href') || ''; if (h && h.charAt(0) === '/' && !h.startsWith('/gg-header') && !a.textContent.trim().match(/^(Лендинг|Как работает|Тарифы|Партнёрам|Мастерская|Войти|Начать бесплатно|Профиль|Каналы|Выход|Бренды|Мои бренды|Аналитика|Аналитика бренда|Команда)$/)) __ggBad.push(h); }); if (__ggBad.length) console.warn('[gg-header] unusual links:', __ggBad.join(', ')); if (!document.getElementById('gg-header')) console.warn('[gg-header] host missing after init'); }
  var b = document.getElementById('gg-burger');
  if (b) b.addEventListener('click', function () {
    var n = host.querySelector('nav');
    if (n) n.classList.toggle('open');
  });

  /* Order 30: logout button */
  var out = document.getElementById('gg-logout');
  if (out) out.addEventListener('click', function () {
    out.disabled = true;
    fetch('/api/logout', { method: 'POST' }).catch(function () {}).then(function () {
      try { sessionStorage.removeItem('gg_user'); } catch (e) {}
      location.href = '/';
    });
  });

  /* Order 30: refresh user state from server (keeps header honest) */
  fetch('/api/me').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    var u = d && d.user;
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem('gg_user') || 'null'); } catch (e) {}
    if (!u && cached) { sessionStorage.removeItem('gg_user'); location.reload(); return; }
    if (u) {
      var changed = !cached || cached.email !== u.email || cached.name !== u.name;
      try { sessionStorage.setItem('gg_user', JSON.stringify(u)); } catch (e) {}
      if (changed && !cached) {
        var slot = document.getElementById('gg-logout') && document.getElementById('gg-logout').previousElementSibling;
        if (slot && slot.classList.contains('gguser')) slot.textContent = u.name || u.email;
      }
      renderInviteBanner(u);
    }
  }).catch(function () {});

  /* plan badge (only when rendered) */
  var badge = document.getElementById('gg-plan-badge');
  if (badge) {
    try {
      var c = sessionStorage.getItem('gg_plan_cache');
      if (c) { var j = JSON.parse(c); if (Date.now() - j.t < 60000) badge.textContent = 'Тариф: ' + j.n; }
    } catch (e) {}
    fetch('/api/plan').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.plan) return;
      var names = { start: 'Старт', growth: 'Рост', pro: 'Про', agency: 'Агентство', unlimited: 'Безлимит' };
      var n = names[d.plan] || 'Старт';
      badge.textContent = 'Тариф: ' + n;
      try { sessionStorage.setItem('gg_plan_cache', JSON.stringify({ t: Date.now(), n: n })); } catch (e) {}
    }).catch(function () {});
  }

  /* Order 75: theme toggle in header */
  setTimeout(function () {
    var host = document.getElementById('gg-header');
    if (!host) return;
    var b = host.querySelector('#gg-theme-btn') || document.getElementById('gg-theme-btn');
    if (!b) return;
    var MODES = ['dark', 'light', 'system'];
    var ICON = { dark: '☾', light: '☀', system: '◐' };
    function cur() {
      try { var v = localStorage.getItem('gg_theme'); return MODES.indexOf(v) > -1 ? v : 'dark'; } catch (e) { return 'dark'; }
    }
    function paint() { b.textContent = ICON[cur()]; }
    paint();
    b.addEventListener('click', function () {
      var next = MODES[(MODES.indexOf(cur()) + 1) % MODES.length];
      try { localStorage.setItem('gg_theme', next); } catch (e) {}
      if (window.ggTheme && typeof window.ggTheme.set === 'function') { window.ggTheme.set(next); }
      else {
        var d = document.documentElement;
        if (next === 'system') { d.removeAttribute('data-theme'); d.setAttribute('data-theme-src', 'system'); }
        else { d.setAttribute('data-theme', next); d.removeAttribute('data-theme-src'); }
      }
      paint();
    });
    window.addEventListener('gg-theme-changed', paint);
  }, 60);

})();
