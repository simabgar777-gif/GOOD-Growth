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

  /* ── состояние берём из ОБЩЕГО источника (rail.js) ─────────
     он различает «не знаем», «не вошёл», «ошибка» и данные —
     чтобы лента никогда не показывала ложный «0 из 5». */
  function loadStates(force) {
    if (window.ggPathState && window.ggPathState.load) return window.ggPathState.load(force);
    /* модуль состояния создаёт rail.js; он может подняться на мгновение позже.
       Ждём его коротко — но честно: если не появился, это ошибка, а не нули. */
    return new Promise(function (resolve) {
      var tries = 0;
      (function wait() {
        if (window.ggPathState && window.ggPathState.load) return resolve(window.ggPathState.load(force));
        if (++tries > 40) return resolve({ status: 'error' });
        setTimeout(wait, 25);
      })();
    });
  }

  /* что предложить, когда шаг стал «следующим» */
  var ACTIONS = [
    { label: 'Написать цель',   href: '/app/strategy' },
    { label: 'Разобрать цель',  href: '/app/strategy' },
    { label: 'Задать ритм',     href: '/app/schedule' },
    { label: 'Создать контент', anchor: '#postsSec' },
    { label: 'Открыть отклик',  href: '/app/analytics' }
  ];

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
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
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
    /* маяк светит туда, куда идти СЕЙЧАС: на первый несделанный шаг */
    var nxt = (cur < STEPS.length && !done[cur]) ? cur : -1;

    STEPS.forEach(function (s, i) {
      var st = done[i] ? 'done' : (i === cur ? 'now' : '');
      if (i === nxt) st += ' next';
      var later = done[i] && i > cur;
      var d = document.createElement('div');
      d.className = 'ggpath-lg ' + st + (later ? ' later' : '');
      if (later) d.title = 'уже есть, хотя предыдущий шаг не закрыт';
      d.style.setProperty('--step', s.c);

      var tail = '';
      if (i === nxt && ACTIONS[i]) {
        var a = ACTIONS[i];
        tail = a.anchor
          ? '<a class="ggpath-go" href="' + a.anchor + '">' + a.label + ' →</a>'
          : '<a class="ggpath-go" href="' + a.href + '">' + a.label + ' →</a>';
      }

      d.innerHTML = '<span class="n">' + s.n +
        (st.indexOf('now') > -1 ? ' · сейчас' : st.indexOf('done') > -1 ? ' · сделано' : ' · дальше') + '</span>' +
        '<span class="nm">' + s.nm + '</span><span class="ex">' + s.ex + '</span>' + tail;
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
      var isNext = (i === cur);
      var r = isNext ? 16 : (st === 'now' ? 13 : 10);
      var mk = function (tag, attrs, txt) {
        var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (txt != null) e.textContent = txt;
        nodes.appendChild(e);
        return e;
      };
      if (isNext) {
        /* маяк: самый яркий узел экрана */
        mk('circle', { cx: pt.x, cy: pt.y, r: 40, fill: col, opacity: '.34', filter: 'url(#ggPathGlow)' });
        mk('circle', { cx: pt.x, cy: pt.y, r: 26, fill: col, opacity: '.22' });
      } else if (st === 'now') {
        mk('circle', { cx: pt.x, cy: pt.y, r: 26, fill: col, opacity: '.16', filter: 'url(#ggPathGlow)' });
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

    /* волна — только если впереди есть шаг */
    if (cur < STEPS.length && !done[cur]) startWave(p, len, cur);

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

  /* ── волна света: раз в 9 секунд идёт к следующему шагу ─────
     Медленно, вперёд, не зацикливается и уважает «меньше движения». */
  function startWave(p, len, cur) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var nodes = document.getElementById('ggNodes');
    if (!nodes) return;

    var NS = 'http://www.w3.org/2000/svg';
    var dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '4.5');
    dot.setAttribute('fill', '#FFF3DC');
    dot.setAttribute('opacity', '0');
    dot.setAttribute('filter', 'url(#ggPathGlow)');
    nodes.appendChild(dot);

    var steps = STEPS.length - 1;
    var from = Math.max(0, cur - 1) / steps, to = cur / steps;
    var t0 = null, phase = 'wait', waitStart = performance.now();

    function frame(now) {
      if (phase === 'wait') {
        if (now - waitStart >= 6200) { phase = 'run'; t0 = now; }
      } else {
        var k = (now - t0) / 2600;
        if (k >= 1) { phase = 'wait'; waitStart = now; dot.setAttribute('opacity', '0'); }
        else {
          var t = from + (to - from) * k;
          var pt = p.getPointAtLength(len * t);
          dot.setAttribute('cx', pt.x);
          dot.setAttribute('cy', pt.y);
          dot.setAttribute('opacity', String(Math.sin(Math.PI * k) * 0.95));
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── куда ставить ─────────────────────────────────────────── */
  function boot() {
    var here = location.pathname.replace(/\/+$/, '');
    if (here !== '/app') return;               /* лента живёт только на «Столе» */
    if (document.querySelector('.ggpath')) return;

    var desk = document.getElementById('deskSection');
    if (!desk || !desk.parentNode) return;

    /* скелетон: сразу место, без прыжков контента */
    var holder = document.createElement('section');
    holder.className = 'ggpath ggpath-loading';
    holder.setAttribute('aria-label', 'Путь по продукту');
    holder.innerHTML = '<div class="ggpath-head"><h2>Твой путь</h2>' +
      '<span class="ggpath-q">где ты сейчас?</span></div>' +
      '<div class="ggpath-skel">смотрим, где ты…</div>';
    desk.parentNode.insertBefore(holder, desk);

    loadStates().then(function (res) {
      holder.remove();
      if (res.status === 'auth') return showNote('Войди — и увидишь свой путь.', '/login', 'Войти');
      if (res.status === 'error') return showNote('Не удалось загрузить путь. Это не «0 из 5» — просто не ответил сервер.', null, null, true);
      var w = ribbon(res.done);
      desk.parentNode.insertBefore(w, desk);
      if (w.__ggDraw) w.__ggDraw();
    });

    function showNote(text, href, label, retry) {
      var box = document.createElement('section');
      box.className = 'ggpath ggpath-note';
      box.setAttribute('aria-label', 'Путь по продукту');
      box.innerHTML = '<div class="ggpath-head"><h2>Твой путь</h2></div>' +
        '<p class="ggpath-msg">' + text + '</p>' +
        (href ? '<a class="ggpath-act" href="' + href + '">' + label + '</a>' : '') +
        (retry ? '<button type="button" class="ggpath-act" data-path-retry>Повторить</button>' : '');
      desk.parentNode.insertBefore(box, desk);
      var b = box.querySelector('[data-path-retry]');
      if (b) b.addEventListener('click', function () {
        box.remove();
        if (window.ggPathState) window.ggPathState.invalidate();
        boot();
      });
      return box;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* другим модулям может пригодиться */
  window.ggPathStates = loadStates;
})();
