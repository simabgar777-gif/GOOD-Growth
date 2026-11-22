/* GOOD Growth · «скелетон» загрузки.
   Тёплые контуры будущих карточек и медный блик.
   Работает так: страница объявляет window.GG_SKELETON = { targets:[{sel,kind,count}] }
   Скрипт рисует заглушки, прячет настоящий контейнер и снимает всё,
   как только в контейнере появляется содержимое (или через 8 секунд). */
(function () {
  'use strict';
  var cfg = window.GG_SKELETON;
  if (!cfg || !cfg.targets || !cfg.targets.length) return;

  var CSS = [
    '@keyframes sk-sweep{0%{transform:translateX(-100%)}55%{transform:translateX(100%)}100%{transform:translateX(100%)}}',
    '.sk{position:relative;overflow:hidden;border-radius:12px;',
    'background:linear-gradient(180deg,rgba(236,226,206,.055),rgba(236,226,206,.03));',
    'border:1px solid rgba(236,226,206,.06)}',
    '.sk::after{content:"";position:absolute;inset:0;',
    'background:linear-gradient(100deg,transparent 20%,rgba(232,165,79,.10) 45%,transparent 70%);',
    'transform:translateX(-100%);animation:sk-sweep 2.6s cubic-bezier(.4,0,.6,1) infinite}',
    '.gg-sk{display:block}',
    '.gg-sk-line{height:10px;border-radius:6px;margin:8px 0}',
    '.gg-sk-row{display:flex;gap:14px;align-items:center;margin:12px 0}',
    '.gg-sk-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}',
    '.gg-sk-card{height:180px}',
    '.gg-sk-card.tall{height:230px}',
    '.gg-sk-tile{height:96px;flex:1}',
    '.gg-sk-big{height:160px;margin:14px 0}',
    '.gg-sk-table .gg-sk-line{margin:14px 0}',
    '@media(prefers-reduced-motion:reduce){.sk::after{animation:none;opacity:.35}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('gg-sk-css')) return;
    var st = document.createElement('style');
    st.id = 'gg-sk-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function p(x) { return '<div class="' + x + '"></div>'; }

  function markup(kind, count) {
    var n = count || 6, i, out = [];
    if (kind === 'cards') {
      out.push('<div class="gg-sk">');
      out.push(p('sk gg-sk-line') .replace('gg-sk-line', 'gg-sk-line'));
      out.push('<div class="gg-sk-cards">');
      for (i = 0; i < n; i++) out.push('<div class="sk gg-sk-card"></div>');
      out.push('</div></div>');
    } else if (kind === 'list') {
      out.push('<div class="gg-sk">');
      for (i = 0; i < n; i++) {
        out.push('<div class="gg-sk-row"><div class="sk" style="width:52px;height:52px;border-radius:12px"></div>' +
          '<div style="flex:1"><div class="sk gg-sk-line" style="width:60%"></div>' +
          '<div class="sk gg-sk-line" style="width:35%"></div></div>' +
          '<div class="sk" style="width:74px;height:26px;border-radius:8px"></div></div>');
      }
      out.push('</div>');
    } else if (kind === 'tiles') {
      out.push('<div class="gg-sk" style="display:flex;gap:16px">');
      for (i = 0; i < (count || 4); i++) out.push('<div class="sk gg-sk-tile"></div>');
      out.push('</div>');
    } else if (kind === 'table') {
      out.push('<div class="gg-sk gg-sk-table">');
      out.push(p('sk gg-sk-big'));
      for (i = 0; i < (count || 5); i++) out.push('<div class="sk gg-sk-line" style="width:' + (95 - i * 7) + '%"></div>');
      out.push('</div>');
    }
    return out.join('');
  }

  var done = false;
  var observers = [];

  function finish() {
    if (done) return;
    done = true;
    observers.forEach(function (o) { try { o.disconnect(); } catch (e) {} });
    var nodes = document.querySelectorAll('.gg-sk');
    for (var i = 0; i < nodes.length; i++) nodes[i].parentNode.removeChild(nodes[i]);
    setTimeout(function () {
      var hidden = document.querySelectorAll('[data-sk-hidden]');
      for (var k = 0; k < hidden.length; k++) {
        hidden[k].style.visibility = '';
        hidden[k].removeAttribute('data-sk-hidden');
      }
    }, 90);
    document.documentElement.classList.remove('skel-loading');
  }
  window.ggSkeletonDone = finish;

  injectCSS();
  cfg.targets.forEach(function (t) {
    var el = document.querySelector(t.sel);
    if (!el) return;
    /* страница уже всё нарисовала (синхронно) — скелетон не нужен */
    if (el.childElementCount > 0) return;
    var holder = document.createElement('div');
    holder.innerHTML = markup(t.kind, t.count);
    while (holder.firstChild) el.parentNode.insertBefore(holder.firstChild, el);
    el.style.visibility = 'hidden';
    el.setAttribute('data-sk-hidden', '1');

    var CARDY = 'article, .pcard, .scard, .post-card, .tcard, .brand-row, .chan-card, .j-row, .row';
    function filled() {
      try {
        if (el.querySelector(CARDY)) return true;      /* появилась хотя бы одна настоящая карточка */
        if (el.querySelector('.empty')) return true;    /* или честное «пусто» */
        return el.children.length >= 2;                 /* либо несколько блоков */
      } catch (e) { return true; }
    }
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { if (filled()) finish(); });
      mo.observe(el, { childList: true, subtree: true });
      observers.push(mo);
    }
  });
  document.documentElement.classList.add('skel-loading');
  setTimeout(finish, 8000);
})();
