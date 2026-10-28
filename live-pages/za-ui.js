/* ============================================================
   GOOD Growth · оживляем дизайн Заи

   1. Вкладки разбора — якоря: клик ведёт к блоку, прокрутка
      подсвечивает текущий.
   2. «Первые шаги» — галочки «сделал / не сделал» + прогресс.
      Состояние живёт на устройстве (localStorage), потому что
      в базе для отметок пока нет места.
   3. Кнопки: сколько постов, поиск по журналу, «Прослушать».
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ── 1. ВКЛАДКИ-ЯКОРЯ ────────────────────────────────────── */
  (function subnav() {
    var nav = document.querySelector('.subnav');
    if (!nav) return;
    var links = all('a', nav);
    var targets = links.map(function (a) {
      var id = (a.getAttribute('href') || '').replace('#', '');
      return { a: a, el: id ? document.getElementById(id) : null };
    }).filter(function (t) { return t.el; });
    if (!targets.length) return;

    var top = document.querySelector('.topline');
    function offset() { return top ? top.getBoundingClientRect().height + 12 : 64; }

    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = (a.getAttribute('href') || '').replace('#', '');
        var el = id ? document.getElementById(id) : null;
        if (!el) return;
        e.preventDefault();
        var y = el.getBoundingClientRect().top + window.pageYOffset - offset();
        window.scrollTo({ top: y < 0 ? 0 : y, behavior: 'smooth' });
        mark(a);
      });
    });

    function mark(a) {
      links.forEach(function (x) { x.classList.toggle('on', x === a); });
    }

    function byScroll() {
      var lim = offset() + 40;
      var current = targets[0].a;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].el.getBoundingClientRect().top <= lim) current = targets[i].a;
      }
      mark(current);
    }
    var tick = null;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = setTimeout(function () { tick = null; byScroll(); }, 120);
    }, { passive: true });
  })();

  /* ── 2. ПЕРВЫЕ ШАГИ: галочки и прогресс ────────────────────
     Отметки хранятся В БАЗЕ (приказ Капитана, вариант A):
       GET  /api/goals/:id/steps
       POST /api/goals/:id/steps  { done: [0,2] }
     Пока разбора нет — копим на устройстве и один раз переносим. */
  (function steps() {
    var box = document.getElementById('steps');
    if (!box) return;
    var inputs = all('.step input[type=checkbox]', box);
    var cnt = document.getElementById('stepsCnt');
    var bar = document.getElementById('stepsBar');
    if (!inputs.length) return;

    var LOCAL = 'gg_steps:pending';

    function goalId() {
      var g = document.body.dataset.goal;
      return g ? String(g) : '';
    }
    function local() {
      try { return JSON.parse(localStorage.getItem(LOCAL) || '[]'); } catch (e) { return []; }
    }
    function setLocal(list) {
      try { localStorage.setItem(LOCAL, JSON.stringify(list)); } catch (e) {}
    }

    function paint(list) {
      inputs.forEach(function (i, n) { i.checked = (list || []).indexOf(n) > -1; });
      var done = (list || []).length;
      if (cnt) cnt.textContent = done + ' / ' + inputs.length;
      if (bar) bar.style.width = Math.round(done / inputs.length * 100) + '%';
    }
    function current() {
      return inputs.map(function (x, n) { return x.checked ? n : -1; })
                   .filter(function (n) { return n > -1; });
    }

    function loadFromServer(id) {
      return fetch('/api/goals/' + id + '/steps', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { return d && Array.isArray(d.done) ? d.done : null; })
        .catch(function () { return null; });
    }
    function saveToServer(id, list) {
      return fetch('/api/goals/' + id + '/steps', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: list })
      }).catch(function () {});
    }

    var timer = null;
    function changed() {
      var list = current();
      var id = goalId();
      paint(list);
      if (!id) { setLocal(list); return; }
      clearTimeout(timer);
      timer = setTimeout(function () { saveToServer(id, list); }, 300);
    }

    inputs.forEach(function (input) {
      input.addEventListener('change', changed);
      var label = input.closest('label');
      if (label) {
        label.addEventListener('click', function (e) {
          if (e.target === input) return;
          e.preventDefault();
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change'));
        });
      }
    });

    /* пришла цель: сначала показываем пусто, потом её отметки из базы */
    document.addEventListener('gg:goal', function () {
      var id = goalId();
      if (!id) return;
      loadFromServer(id).then(function (fromBase) {
        var pending = local();
        if ((fromBase === null || fromBase.length === 0) && pending.length) {
          /* переносим то, что наотмечали до появления разбора */
          saveToServer(id, pending).then(function () { setLocal([]); paint(pending); });
          return;
        }
        paint(fromBase || []);
      });
    });

    /* если цель уже известна на момент загрузки */
    if (goalId()) {
      loadFromServer(goalId()).then(function (l) { paint(l || []); });
    }
  })();

  /* ── 3. СКОЛЬКО ПОСТОВ ───────────────────────────────────── */
  (function count() {
    var box = document.querySelector('.count-switch');
    if (!box) return;
    var btns = all('button', box);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        try { localStorage.setItem('gg_post_count', b.textContent.trim()); } catch (e) {}
      });
    });
    var saved = null;
    try { saved = localStorage.getItem('gg_post_count'); } catch (e) {}
    if (saved) {
      var want = btns.filter(function (b) { return b.textContent.trim() === saved; })[0];
      if (want) btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === want)); });
    }
  })();

  /* ── 4. ПОИСК ПО ЖУРНАЛУ ─────────────────────────────────── */
  (function search() {
    var box = document.getElementById('journal');
    if (!box) return;
    var input = box.querySelector('input[type=search]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      all('.j-row', box).forEach(function (row) {
        var t = (row.textContent || '').toLowerCase();
        row.style.display = (!q || t.indexOf(q) > -1) ? '' : 'none';
      });
    });
  })();

  /* ── 5. ПРОСЛУШАТЬ РАЗБОР ────────────────────────────────── */
  (function listen() {
    var btn = document.getElementById('listenBtn');
    if (!btn || !('speechSynthesis' in window)) return;
    var label = document.getElementById('listenText');
    var icon = document.getElementById('listenIcon');
    var body = document.getElementById('razbor');
    var speaking = false;

    function stop() {
      speaking = false;
      window.speechSynthesis.cancel();
      if (label) label.textContent = 'Прослушать';
      btn.setAttribute('aria-pressed', 'false');
    }

    btn.addEventListener('click', function () {
      if (speaking) { stop(); return; }
      var src = body ? (body.querySelector('.strategy-line') || body) : null;
      var text = src ? (src.textContent || '').trim().slice(0, 1200) : '';
      if (!text) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.rate = 1;
      u.onend = stop;
      u.onerror = stop;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      speaking = true;
      if (label) label.textContent = 'Остановить';
      btn.setAttribute('aria-pressed', 'true');
    });
    window.addEventListener('beforeunload', stop);
  })();
})();
