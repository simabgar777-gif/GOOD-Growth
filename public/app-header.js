'use strict';
/* GOOD Growth — unified header (Order 27). Light Astra palette. */
(function () {
  var path = location.pathname;
  var q = new URLSearchParams(location.search);
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var CSS = '#gg-header{font:15px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}' +
    '#gg-header .ggw{max-width:1120px;margin:0 auto;padding:0 18px;display:flex;align-items:center;gap:18px;height:58px}' +
    '#gg-header{position:sticky;top:0;background:#f7f9f5;border-bottom:1px solid #e3e9de;position:relative;z-index:70}' +
    '#gg-header a.ggb{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16.5px;color:#1c2419;text-decoration:none;letter-spacing:.01em}' +
    '#gg-header .ggmark{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#3f9d63,#52d6c4);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:900}' +
    '#gg-header nav{display:flex;align-items:center;gap:4px;margin-left:6px;flex:1}' +
    '#gg-header nav a{color:#5c6b57;text-decoration:none;font-size:14px;font-weight:600;padding:7px 12px;border-radius:9px;white-space:nowrap}' +
    '#gg-header nav a:hover{background:#e9f0e6;color:#1c2419}' +
    '#gg-header nav a.on{background:#e2efe4;color:#2f7a4c}' +
    '#gg-header .ggcta{margin-left:auto;display:flex;align-items:center;gap:8px}' +
    '#gg-header .ggplan{font-size:12.5px;font-weight:700;color:#2f7a4c;background:#e2efe4;border:1px solid #cfe3d3;padding:6px 12px;border-radius:999px;text-decoration:none;white-space:nowrap}' +
    '#gg-header .ggbtn{font-size:13.5px;font-weight:700;color:#fff;background:#3f9d63;padding:8px 16px;border-radius:11px;text-decoration:none;white-space:nowrap}' +
    '#gg-header .ggbtn:hover{background:#2f7a4c}' +
    '#gg-header .ggghost{font-size:13.5px;font-weight:600;color:#5c6b57;padding:8px 12px;border-radius:11px;text-decoration:none;white-space:nowrap}' +
    '#gg-header .ggghost:hover{color:#1c2419}' +
    '#gg-header .ggburger{display:none;margin-left:auto;background:none;border:0;font-size:24px;line-height:1;cursor:pointer;color:#1c2419;padding:6px 10px}' +
    '@media(max-width:860px){' +
      '#gg-header .ggburger{display:block}' +
      '#gg-header nav{display:none;position:absolute;top:58px;left:0;right:0;background:#f7f9f5;border-bottom:1px solid #e3e9de;flex-direction:column;align-items:stretch;padding:10px 14px 16px;gap:2px}' +
      '#gg-header nav.open{display:flex}' +
      '#gg-header nav a{padding:11px 12px;font-size:15px}' +
      '#gg-header .ggcta{display:none}' +
      '#gg-header .ggcta-m{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid #e3e9de;margin-top:8px}' +
    '}' +
    '@media(min-width:861px){#gg-header .ggcta-m{display:none!important}}';
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  function A(href, label, cls) { return '<a href="' + href + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + label + '</a>'; }
  function on(pfx) {
    if (pfx === '/') return path === '/';
    return path === pfx || path.indexOf(pfx + '/') === 0 || path.indexOf(pfx + '?') === 0;
  }
  function mark(href) { return '<a class="ggb" href="' + href + '"><span class="ggmark">G</span>GOOD Growth</a>'; }
  function nav(links) { return '<nav>' + links.map(function (l) { return A(l[0], l[1], on(l[0]) && l[0] !== '#' ? 'on' : ''); }).join('') + '</nav>'; }

  var brand = q.get('brand') || sessionStorage.getItem('gg_brand') || '';
  var inBrand = (path === '/app' || path.indexOf('/app/') === 0 || path.indexOf('/partner/channels') === 0 || path.indexOf('/partner/analytics') === 0) && !!brand;
  var isPartnerZone = path === '/partner' || path.indexOf('/partner/') === 0;

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
    cta = A('/login', 'Войти', 'ggghost') + A('/app/onboard', 'Начать бесплатно', 'ggbtn');
  }

  var html = '<div class="ggw">' + mark(logoHref) +
    '<button class="ggburger" id="gg-burger" aria-label="Меню">☰</button>' + nav(links) +
    '<div class="ggcta">' + cta + '</div>' +
    '<div class="ggcta-m">' + cta + '</div>' +
    '</div>';

  var host = document.getElementById('gg-header');
  if (!host) { host = document.createElement('div'); host.id = 'gg-header'; }
  host.appendChild(el(html));
  document.body.insertBefore(host, document.body.firstChild);
  var b = document.getElementById('gg-burger');
  if (b) b.addEventListener('click', function () {
    var n = host.querySelector('nav');
    if (n) n.classList.toggle('open');
  });

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
})();
