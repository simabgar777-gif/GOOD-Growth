/* ============================================================
   GOOD Growth · «Путь» — ведущий по продукту

   Пять шагов: Цель · Разбор · Ритм · Посты · Отклик.
   Состояния считаются ПО ЖИВЫМ ДАННЫМ, без ручных отметок.

   Цвет как навигация, а не украшение:
     пройдено  — зелёный узел с галочкой, тёплое свечение
     сейчас    — горящий оранжевый
     впереди   — тихая серая дорога
     красный в пути не используем (он для ошибок)

   Ничего не запирается. «0 из 5» — не приговор, а «с чего начать».
   ============================================================ */
(function () {
  'use strict';

  /* Пять шагов — пять цветов. От тепла к жизни: пятый зелёный. */
  var STEPS = [
    { n: '01', nm: 'Цель',   ex: 'одна фраза о деле',          c: '#F8961D' },
    { n: '02', nm: 'Разбор', ex: 'кому и о чём говорить',      c: '#E0574B' },
    { n: '03', nm: 'Ритм',   ex: 'сколько раз в неделю',       c: '#A96AB8' },
    { n: '04', nm: 'Посты',  ex: 'готовые тексты и картинки',  c: '#28A992' },
    { n: '05', nm: 'Отклик', ex: 'что сработало, а что нет',   c: '#4CB853' }
  ];

  function jget(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ── состояния по настоящим данным ───────────────────────── */
  function loadStates() {
    return Promise.all([
      jget('/api/analytics'),
      jget('/api/slots'),
      jget('/api/goals')
    ]).then(function (res) {
      var an = res[0] || {};
      var t = an.totals || {};
      var slots = (res[1] && res[1].slots) || [];
      var goals = (res[2] && res[2].goals) || [];

      var done = [
        Number(t.goals) > 0,
        false,                          /* разбор — проверим ниже */
        slots.length > 0,
        Number(t.posts) > 0,
        Number(t.published) > 0
      ];

      /* «Разбор» закрыт, если у свежей цели есть стратегия */
      if (!goals.length) return done;
      var id = goals[0].id;
      return jget('/api/goals/' + id).then(function (g) {
        if (g && g.strategy && typeof g.strategy === 'object') {
          var s = g.strategy;
          done[1] = !!(s.summary || (s.topics && s.topics.length) || (s.audience && s.audience.text));
        }
        return done;
      });
    });
  }

  function currentIndex(done) {
    for (var i = 0; i < done.length; i++) if (!done[i]) return i;
    return done.length;                /* всё пройдено */
  }

  /* ── лента на «Столе» ────────────────────────────────────── */
  function ribbon(done) {
    var cur = currentIndex(done);
    var wrap = document.createElement('section');
    wrap.className = 'ggpath';
    wrap.setAttribute('aria-label', 'Путь по продукту');

    var svgNS = 'http://www.w3.org/2000/svg';
    var head = document.createElement('div');
    head.className = 'ggpath-head';
    head.innerHTML = '<h2>Твой путь</h2><span class="ggpath-q">где ты сейчас?</span>' +
      '<span class="ggpath-cnt" id="ggPathCnt"></span>';
    wrap.appendChild(head);

    var box = document.createElement('div');
    box.className = 'ggpath-ribbon';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1240 300');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML =
      '<defs>' +
        '<linearGradient id="ggPathGrad" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="#F8961D"/>' +
          '<stop offset="25%" stop-color="#E0574B"/>' +
          '<stop offset="50%" stop-color="#A96AB8"/>' +
          '<stop offset="75%" stop-color="#28A992"/>' +
          '<stop offset="100%" stop-color="#4CB853"/>' +
        '</linearGradient>' +
        '<filter id="ggPathGlow" x="-60%" y="-60%" width="220%" height="220%">' +
          '<feGaussianBlur stdDeviation="9" result="b"/>' +
          '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '</filter>' +
      '</defs>' +
      '<path id="ggRoad" fill="none" stroke="rgba(255,255,255,.11)" stroke-width="12" stroke-linecap="round"/>' +
      '<path id="ggHalo" fill="none" stroke="url(#ggPathGrad)" stroke-width="30" stroke-linecap="round" opacity=".18" filter="url(#ggPathGlow)"/>' +
      '<path id="ggFill" fill="none" stroke="url(#ggPathGrad)" stroke-width="12" stroke-linecap="round"/>' +
      '<g id="ggNodes"></g>';
    box.appendChild(svg);
    wrap.appendChild(box);

    var legend = document.createElement('div');
    legend.className = 'ggpath-legend';
    STEPS.forEach(function (s, i) {
      var st = done[i] ? 'done' : (i === cur ? 'now' : '');
      var later = done[i] && i > cur;
      var d = document.createElement('div');
      d.className = 'ggpath-lg ' + st + (later ? ' later' : '');
      d.title = later ? 'уже есть, хотя предыдущий шаг не закрыт' : '';
      d.style.setProperty('--step', s.c);
      d.innerHTML = '<span class="n">' + s.n +
        (st === 'now' ? ' · сейчас' : st === 'done' ? ' · сделано' : '') + '</span>' +
        '<span class="nm">' + s.nm + '</span><span class="ex">' + s.ex + '</span>';
      legend.appendChild(d);
    });
    wrap.appendChild(legend);

    wrap.__ggDraw = function () { requestAnimationFrame(function () { drawRibbon(wrap, done, cur); }); };
    return wrap;
  }

  function drawRibbon(wrap, done, cur) {
    var D = 'M 90 90 C 420 90, 420 210, 620 210 S 830 250, 1150 250';
    ['ggRoad', 'ggHalo', 'ggFill'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute('d', D);
    });
    var p = document.getElementById('ggFill');
    var road = document.getElementById('ggRoad');
    if (!p || !road) return;
    var len = p.getTotalLength();

    /* цветом светим только пройденное + текущий */
    var passed = cur;                          /* сколько шагов пройдено */
    var frac = done.length > 1 ? (passed / (done.length - 1)) : 0;
    ['ggFill', 'ggHalo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.strokeDasharray = (len * frac) + ' ' + len;
    });

    var nodes = document.getElementById('ggNodes');
    nodes.innerHTML = '';
    STEPS.forEach(function (s, i) {
      var st = done[i] ? 'done' : (i === cur ? 'now' : '');
      var pt = p.getPointAtLength(len * (i / (STEPS.length - 1)));
      var col = s.c;                                  /* цвет = номер шага */
      var r = st === 'now' ? 15 : 11;
      var mk = function (tag, attrs, txt) {
        var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (txt != null) e.textContent = txt;
        nodes.appendChild(e);
        return e;
      };
      if (st === 'now') {
        mk('circle', { cx: pt.x, cy: pt.y, r: 32, fill: col, opacity: '.22', filter: 'url(#ggPathGlow)' });
      }
      mk('circle', { cx: pt.x, cy: pt.y, r: r + 5, fill: 'none', stroke: col,
        'stroke-width': 1.4, opacity: st ? '.55' : '.3' });
      mk('circle', { cx: pt.x, cy: pt.y, r: r,
        fill: st ? col : '#0E0F13', stroke: col, 'stroke-width': 2,
        opacity: st ? '1' : '.65' });
      mk('text', {
        x: pt.x, y: pt.y + 4, 'text-anchor': 'middle',
        'font-family': 'JetBrains Mono, monospace', 'font-size': '10.5',
        fill: st ? '#0B0703' : '#8A867D'
      }, st === 'done' ? '✓' : s.n);
    });

    var cnt = document.getElementById('ggPathCnt');
    if (cnt) {
      var n = done.filter(Boolean).length;
      var gap = done.indexOf(false);            /* первый несделанный */
      if (n === STEPS.length) {
        cnt.textContent = n + ' из ' + STEPS.length + ' · весь путь пройден';
      } else if (gap >= 0 && n > gap) {
        /* есть шаг позади пробела — так и говорим, без вранья */
        cnt.textContent = n + ' из ' + STEPS.length +
          ' · не хватает: ' + STEPS[gap].nm.toLowerCase();
      } else {
        cnt.textContent = n + ' из ' + STEPS.length +
          ' · дальше — ' + STEPS[Math.min(n, STEPS.length - 1)].nm.toLowerCase();
      }
    }
  }

  /* ── куда ставить ─────────────────────────────────────────── */
  function boot() {
    /* лента живёт ТОЛЬКО на «Столе». Привязка к адресу надёжнее,
       чем к классу или видимости блока: они появляются позже. */
    var here = location.pathname.replace(/\/+$/, '');
    if (here !== '/app') return;

    var desk = document.getElementById('deskSection');
    if (document.querySelector('.ggpath')) return;

    loadStates().then(function (done) {
      var w = ribbon(done);
      if (desk && desk.parentNode) desk.parentNode.insertBefore(w, desk);
      else {
        var hero = document.querySelector('.hero') || document.querySelector('.gg-band');
        if (hero && hero.parentNode) hero.parentNode.insertBefore(w, hero.nextSibling);
        else document.body.appendChild(w);
      }
      if (w.__ggDraw) w.__ggDraw();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* другим модулям может пригодиться */
  window.ggPathStates = loadStates;
})();
