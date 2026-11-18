/* GOOD Growth · правовые ссылки в подвале + баннер cookie.
   Работает без словаря: если язык ещё не готов — показывает русский текст. */
(function () {
  'use strict';

  function T(key, fallback) {
    try { return (window.ggT && window.ggT(key, fallback)) || fallback; } catch (e) { return fallback; }
  }

  var LINKS = [
    ['/privacy', 'legal.nav.privacy', 'Политика конфиденциальности'],
    ['/terms', 'legal.nav.terms', 'Соглашение'],
    ['/offer', 'legal.nav.offer', 'Оферта'],
    ['/cookies', 'legal.nav.cookies', 'Cookie']
  ];

  function style() {
    if (document.getElementById('gg-legal-css')) return;
    var st = document.createElement('style');
    st.id = 'gg-legal-css';
    st.textContent = [
      '.gg-legal-nav{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;',
      'padding:16px 0 0;margin-top:18px;border-top:1px solid rgba(236,226,206,.10)}',
      '.gg-legal-nav a{font-size:12px;color:var(--muted-2,#8A857C);text-decoration:none;',
      'border-bottom:1px dotted rgba(236,226,206,.25);padding-bottom:1px}',
      '.gg-legal-nav a:hover{color:var(--amber,#E8A54F);border-color:rgba(232,165,79,.5)}',
      '.gg-legal-tail{max-width:1120px;margin:0 auto;padding:0 28px 40px}',
      '.gg-cookie{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;',
      'width:min(720px,calc(100vw - 32px));background:rgba(16,17,20,.97);',
      'border:1px solid rgba(232,165,79,.34);border-radius:14px;padding:14px 16px;',
      'display:flex;gap:14px;align-items:center;flex-wrap:wrap;',
      'box-shadow:0 18px 40px rgba(0,0,0,.55);backdrop-filter:blur(8px)}',
      '.gg-cookie p{margin:0;flex:1 1 320px;font-size:13px;line-height:1.55;color:#CFC9BD}',
      '.gg-cookie a{color:#E8A54F;text-decoration:none;border-bottom:1px dotted rgba(232,165,79,.5)}',
      '.gg-cookie button{font:inherit;font-size:13px;padding:9px 16px;border-radius:10px;cursor:pointer;',
      'border:1px solid rgba(232,165,79,.55);background:rgba(232,165,79,.14);color:#F3C583}',
      '.gg-cookie button:hover{background:rgba(232,165,79,.22)}',
      '@media(max-width:560px){.gg-cookie{left:16px;right:16px;transform:none;width:auto}}'
    ].join('');
    document.head.appendChild(st);
  }

  function paintLegalLinks() {
    var old = document.querySelector('.gg-legal-nav');
    if (old) old.parentNode.removeChild(old);
    var nav = document.createElement('nav');
    nav.className = 'gg-legal-nav';
    nav.setAttribute('aria-label', T('footer.legal', 'Документы'));
    LINKS.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l[0];
      a.textContent = T(l[1], l[2]);
      nav.appendChild(a);
    });
    var foot = document.querySelector('footer');
    if (foot) { foot.appendChild(nav); return; }
    /* на страницах без подвала — тонкая строка в конце */
    var tail = document.querySelector('.gg-legal-tail');
    if (!tail) {
      tail = document.createElement('div');
      tail.className = 'gg-legal-tail';
      document.body.appendChild(tail);
    }
    tail.appendChild(nav);
  }

  function showCookie() {
    try { if (localStorage.getItem('gg_cookie_ok') === '1') return; } catch (e) { return; }
    if (document.querySelector('.gg-cookie')) return;
    var box = document.createElement('div');
    box.className = 'gg-cookie';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<p>' + T('cookie.text', 'Мы используем cookie, чтобы сайт работал: вход, язык, тема. Без рекламных трекеров.')
      + ' <a href="/cookies">' + T('cookie.more', 'Подробнее') + '</a></p>';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = T('cookie.accept', 'Принять');
    btn.addEventListener('click', function () {
      try { localStorage.setItem('gg_cookie_ok', '1'); } catch (e) {}
      box.remove();
    });
    box.appendChild(btn);
    document.body.appendChild(box);
  }

  function boot() {
    style();
    paintLegalLinks();
    showCookie();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('gg:i18n', function () {
    try { paintLegalLinks(); } catch (e) {}
    var old = document.querySelector('.gg-cookie');
    if (old) { old.remove(); showCookie(); }
  });
})();
