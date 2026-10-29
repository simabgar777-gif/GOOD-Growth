/* ============================================================
   GOOD Growth · настоящий разбор в дизайне Заи

   Берёт цель из базы и заполняет ЕЁ блоки:
     Обзор · Аудитория · Ритм · Темы · Каналы · Шаги · Журнал

   Никаких демо-данных: если разбора нет — показываем пустое
   состояние, а не чужие примеры.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  /* ── 1. какую цель показывать ─────────────────────────────── */
  function goalId() {
    var q = new URLSearchParams(location.search);
    var g = q.get('goal');
    if (g && /^\d+$/.test(g)) return g;
    try { var s = sessionStorage.getItem('gg_last_goal'); if (s) return s; } catch (e) {}
    return null;
  }

  /* ── 2. заполнение блоков ─────────────────────────────────── */
  function fill(d) {
    var st = d.strategy || {};
    var article = $('razbor');
    if (!article) return;

    /* шапка: № и дата */
    var meta = article.querySelector('.sheet-head .meta');
    if (meta) {
      var dt = d.created_at ? new Date(String(d.created_at).replace(' ', 'T')) : null;
      var when = dt && !isNaN(dt) ? dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
      meta.textContent = 'разбор № ' + d.id + (when ? ' · ' + when : '') + (d.source === 'demo' ? ' · демо' : '');
    }

    /* цитата цели */
    var quote = article.querySelector('.goal-quote');
    if (quote) quote.innerHTML = '<b>Цель:</b> «' + esc(d.goal_text || d.goal || '') + '»';

    /* обзор */
    var line = article.querySelector('.strategy-line');
    if (line) line.textContent = st.summary || 'Коротко: ' + (d.goal || '');

    /* аудитория */
    var aud = $('audience');
    if (aud) {
      var a = st.audience || {};
      var h3 = aud.querySelector('h3');
      if (h3) h3.textContent = a.text || 'Уточним аудиторию после первых публикаций.';
      var ul = aud.querySelector('ul');
      if (ul) {
        ul.innerHTML = (a.insights || []).filter(Boolean)
          .map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
        ul.hidden = !(a.insights || []).length;
      }
    }

    /* ритм */
    var r = $('rhythm');
    if (r) {
      var rh = st.rhythm || {};
      var per = Number(rh.posting_per_week) > 0 ? Number(rh.posting_per_week) : 3;
      var big = r.querySelector('.big');
      if (big) big.innerHTML = esc(per) + ' <small>/ неделю</small>';
      var note = r.querySelector('.note');
      if (note) note.textContent = rh.plan || 'Ритм можно поменять в «Публикациях».';
      var days = r.querySelector('.days');
      if (days) days.innerHTML = '';                 /* заполним из сетки слотов */
    }

    /* темы */
    var topics = st.topics || [];
    var tp = $('topics');
    if (tp) {
      var head = tp.querySelector('.sec-lbl');
      var lbl = head ? head.querySelector('.lbl') : null;
      if (lbl) lbl.textContent = 'темы — ' + topics.length;
      var th3 = head ? head.querySelector('h3') : null;
      if (th3) th3.textContent = 'Темы, на которых держим контент';
      tp.querySelectorAll('.topic').forEach(function (n) { n.remove(); });
      topics.forEach(function (t, i) {
        var div = document.createElement('div');
        div.className = 'topic';
        div.innerHTML =
          '<span class="no">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<div><h4>' + esc(t.title || 'Тема') + '</h4>' +
          '<p class="desc">' + esc(t.angle || '') + '</p>' +
          '<div class="idea-chips">' +
            (t.examples || []).filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') +
          '</div></div>';
        tp.appendChild(div);
      });
    }

    /* каналы */
    var chans = st.channels || [];
    var ch = $('chans');
    if (ch) {
      var head2 = ch.querySelector('.sec-lbl');
      if (head2) {
        var l2 = head2.querySelector('.lbl');
        if (l2) l2.textContent = 'каналы — ' + chans.length;
        var h3b = head2.querySelector('h3');
        if (h3b) h3b.textContent = 'Публикуемся там, где живёт аудитория';
      }
      var box = ch.querySelector('.channels');
      if (box) {
        box.innerHTML = chans.map(function (c, i) {
          var fm = (c.format || []).filter(Boolean).join(' · ');
          return '<div class="channel">' +
            '<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24">' +
            '<circle cx="12" cy="12" r="8.4"/><path d="M8 13.6c1.3-2.6 2.6-3.8 4-3.8s2.7 1.2 4 3.8"/>' +
            '</svg></span><div><b>' + esc(c.name || 'Канал') + '</b><p>' +
            esc(c.role || '') + (fm ? ' Форматы: ' + esc(fm) : '') + '</p></div>' +
            '<span class="tag">' + (i === 0 ? 'основной' : 'доп.') + '</span></div>';
        }).join('');
      }
    }

    /* шаги */
    var steps = st.first_steps || [];
    var sp = $('steps');
    if (sp) {
      var head3 = sp.querySelector('.sec-lbl');
      if (head3) {
        var l3 = head3.querySelector('.lbl');
        if (l3) l3.textContent = 'первые шаги';
      }
      var list = sp.querySelector('.steps');
      if (list) {
        list.innerHTML = steps.map(function (s, i) {
          return '<label class="step"><input type="checkbox" />' +
            '<span class="s-no">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<span><b>' + esc(s.step || '') + '</b><p>' + esc(s.detail || '') + '</p></span></label>';
        }).join('');
      }
      /* отметки и прогресс — заново, после перерисовки */
      wireSteps(d.id);
    }

    /* посты: демо-карточку убираем, ставим честную пустоту */
    var posts = $('postsSec');
    if (posts) {
      var card = posts.querySelector('.post-card');
      if (card) card.remove();
      var st2 = posts.querySelector('#postsStatus');
      if (st2 && !st2.textContent) {
        st2.textContent = 'Постов пока нет. Нажми «Создать контент» — и они появятся здесь.';
      }
    }

    /* сетка дней в ритме — из слотов */
    fillDays(perOf(st));
  }

  function perOf(st) { return (st && st.rhythm && Number(st.rhythm.posting_per_week)) || 3; }

  function fillDays(per) {
    var r = $('rhythm'); if (!r) return;
    var days = r.querySelector('.days'); if (!days) return;
    fetch('/api/slots', { credentials: 'same-origin' })
      .then(function (x) { return x.ok ? x.json() : null; })
      .then(function (d) {
        var out = '';
        if (d && d.slots && d.slots.length) {
          var seen = {};
          d.slots.forEach(function (s) {
            var nm = DOW[(Number(s.weekday) + 1) % 7];
            if (seen[nm]) return;
            seen[nm] = 1;
            out += '<span class="day hot">' + nm + '</span>';
          });
        }
        days.innerHTML = out;
        days.hidden = !out;
      })
      .catch(function () { days.innerHTML = ''; });
  }

  
/* ── галочки шагов: своя перевязка после перерисовки ─────────
   Модуль za-ui.js навешивался на старые (демо) шаги, поэтому
   после подстановки настоящих он уже не работал. */
function wireSteps(goalId) {
  var box = $('steps'); if (!box) return;
  var inputs = [].slice.call(box.querySelectorAll('.step input[type=checkbox]'));
  var cnt = $('stepsCnt'), bar = $('stepsBar');
  if (!inputs.length) return;

  if (goalId) document.body.dataset.goal = String(goalId);

  function paint(list) {
    inputs.forEach(function (i, n) { i.checked = (list || []).indexOf(n) > -1; });
    var done = (list || []).length;
    if (cnt) cnt.textContent = done + ' / ' + inputs.length;
    if (bar) bar.style.width = (inputs.length ? Math.round(done / inputs.length * 100) : 0) + '%';
  }
  function current() {
    return inputs.map(function (x, n) { return x.checked ? n : -1; })
                 .filter(function (n) { return n > -1; });
  }
  function save(list) {
    if (!goalId) return;
    fetch('/api/goals/' + goalId + '/steps', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: list })
    }).catch(function () {});
  }

  inputs.forEach(function (input) {
    input.addEventListener('change', function () {
      var list = current();
      paint(list);
      save(list);
    });
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

  if (!goalId) { paint([]); return; }
  fetch('/api/goals/' + goalId + '/steps', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { paint(d && Array.isArray(d.done) ? d.done : []); })
    .catch(function () { paint([]); });
}

/* ── 3. журнал: настоящие разборы ─────────────────────────── */
  function fillJournal(currentId) {
    var list = $('journalList');
    if (!list) return;
    fetch('/api/goals', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var items = (d && d.goals) || [];
        if (!items.length) {
          list.innerHTML = '<p class="hint">Журнал пока пуст. Первый разбор появится здесь.</p>';
          return;
        }
        list.innerHTML = items.slice(0, 30).map(function (g) {
          var dt = g.created_at ? new Date(String(g.created_at).replace(' ', 'T')) : null;
          var when = dt && !isNaN(dt)
            ? dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
              ' · ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : '';
          var cur = String(g.id) === String(currentId) ? ' is-open' : '';
          return '<div class="j-row' + cur + '" data-goal="' + g.id + '">' +
            '<span class="d">' + esc(when) + '</span>' +
            '<span class="n">№ ' + g.id + '</span>' +
            '<span class="t">' + esc(g.goal_text || g.goal || '') + '</span>' +
            '<span class="badges"><a class="j-open" href="/app/strategy?goal=' + g.id + '">Открыть</a></span></div>';
        }).join('');
        list.querySelectorAll('.j-row').forEach(function (row) {
          row.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') return;
            location.href = '/app/strategy?goal=' + row.getAttribute('data-goal');
          });
        });
      })
      .catch(function () {});
  }

  /* ── 4. пустое состояние ──────────────────────────────────── */
  function empty(message) {
    var art = $('razbor');
    if (!art) return;
    var kids = art.querySelectorAll('.grid-2, .topics, .strategy-line');
    kids.forEach(function (k) { k.hidden = true; });
    var head = art.querySelector('.sheet-head');
    if (head) {
      var line = document.createElement('p');
      line.className = 'strategy-line';
      line.textContent = message;
      head.insertAdjacentElement('afterend', line);
    }
  }

  /* ── 5. запуск ────────────────────────────────────────────── */
  function boot() {
    var id = goalId();
    if (!id) { empty('Разбора пока нет. Напиши цель выше — и он появится здесь.'); fillJournal(null); return; }
    fetch('/api/goals/' + id, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || d.goal_text === undefined) {
          empty('Этот разбор не найден. Выбери другой в журнале.');
          fillJournal(null);
          return;
        }
        if (typeof d.strategy === 'string') {
          try { d.strategy = JSON.parse(d.strategy); } catch (e) { d.strategy = {}; }
        }
        fill(d);
        fillJournal(d.id);
        try { sessionStorage.setItem('gg_last_goal', String(d.id)); } catch (e) {}
        /* заголовок вкладки — по цели */
        if (d.goal_text) document.title = 'Разбор № ' + d.id + ' · GOOD Growth';
      })
      .catch(function () {
        empty('Не удалось открыть разбор. Обнови страницу.');
        fillJournal(null);
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
