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

  /* ── 2. ПЕРВЫЕ ШАГИ: галочки и прогресс ──────────────────── */
  (function steps() {
    var box = document.getElementById('steps');
    if (!box) return;
    var inputs = all('.step input[type=checkbox]', box);
    var cnt = document.getElementById('stepsCnt');
    var bar = document.getElementById('stepsBar');
    if (!inputs.length) return;

    /* ключ: какой разбор открыт. Пока — общий, позже привяжем к цели. */
    var KEY = 'gg_steps:' + (location.pathname + '|' + (document.body.dataset.goal || 'current'));

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
    }
    function save(list) {
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    }

    function paint() {
      var done = inputs.filter(function (i) { return i.checked; }).length;
      if (cnt) cnt.textContent = done + ' / ' + inputs.length;
      if (bar) bar.style.width = Math.round(done / inputs.length * 100) + '%';
    }

    var saved = load();
    inputs.forEach(function (input, i) {
      input.checked = !!saved[i];
      input.addEventListener('change', function () {
        var list = inputs.map(function (x) { return x.checked; });
        save(list);
        paint();
      });
      /* клик по всей строке — тоже отметка (удобно на телефоне) */
      var label = input.closest('label');
      if (label) {
        label.addEventListener('click', function (e) {
          if (e.target === input) return;      /* браузер сам переключит */
          e.preventDefault();
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change'));
        });
      }
    });
    paint();
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
