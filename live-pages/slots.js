/* ============================================================
   GOOD Growth · панель ритма и сетка слотов

   Одна панель, три состояния:
     ask   — «сколько раз в неделю?»
     grid  — какие дни и часы (можно править)
     line  — свёрнута в строку «Ритм: 3 в неделю · Вт Чт Сб · изменить»

   Добавление Боцмана: «изменить» открывает там, где человек
   остановился, а не с чистого листа.
   ============================================================ */
(function () {
  'use strict';

  var panel = document.getElementById('rhythmPanel');
  if (!panel) return;

  var DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var SPREAD = [1, 3, 5, 0, 2, 4, 6];          /* Вт, Чт, Сб, Пн, Ср, Пт, Вс */
  var TIMES = ['09:00', '13:00', '19:00'];

  var state = { perWeek: null, tz: 'Europe/Moscow', slots: [] };
  var mode = 'ask';                              /* ask | grid | line */
  var lastMode = 'ask';                          /* чтобы «изменить» вернуло туда же */

  var elAsk = panel.querySelector('.rt-ask');
  var elGrid = panel.querySelector('.rt-grid');
  var elLine = panel.querySelector('.rt-line');
  var elWeek = panel.querySelector('.rt-week');
  var elSum = panel.querySelector('.rt-sum');

  function $(s, r) { return (r || panel).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }

  function paint() {
    elAsk.hidden = mode !== 'ask';
    elGrid.hidden = mode !== 'grid';
    elLine.hidden = mode !== 'line';
    panel.setAttribute('data-state', mode);
    if (mode !== 'ask') lastMode = mode;
  }

  /* ── собрать сетку по числу ───────────────────────────────── */
  function defaultGrid(n) {
    var out = [], count = Math.max(0, Math.min(70, Number(n) || 0));
    for (var i = 0; i < count; i++) {
      var day = SPREAD[i % 7];
      /* часы чередуются: утро, день, вечер — чтобы лента не была однообразной */
      var t = TIMES[(i + Math.floor(i / 7)) % TIMES.length];
      out.push({ weekday: day, time: t });
    }
    return out.sort(function (a, b) {
      return a.weekday - b.weekday || a.time.localeCompare(b.time);
    });
  }

  function perWeekNow() {
    return state.slots.length;
  }

  function renderWeek() {
    var byDay = {};
    state.slots.forEach(function (s) {
      (byDay[s.weekday] = byDay[s.weekday] || []).push(s.time);
    });
    var html = '';
    DAYS.forEach(function (name, wd) {
      var times = (byDay[wd] || []).sort();
      html += '<div class="rt-day' + (times.length ? ' on' : '') + '">';
      html += '<p class="d">' + name + '</p>';
      times.forEach(function (t) {
        html += '<span class="rt-time">' + esc(t) +
                '<button type="button" data-del="' + wd + '|' + esc(t) + '" title="убрать">×</button></span>';
      });
      html += '<button type="button" class="rt-add" data-add="' + wd + '">+ время</button></div>';
    });
    elWeek.innerHTML = html;
    var perWeek = perWeekNow();
    elSum.innerHTML = '<b>' + perWeek + '</b> ' + plural(perWeek, 'слот', 'слота', 'слотов') +
                      ' в неделю · <b>' + perWeek * 4 + ' в месяц</b>';
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  /* ── состояния ────────────────────────────────────────────── */
  function showAsk() { mode = 'ask'; paint(); }

  function showGrid(slots) {
    if (slots) state.slots = slots;
    mode = 'grid';
    renderWeek();
    paint();
  }

  function showLine() {
    mode = 'line';
    var days = [], times = [];
    state.slots.forEach(function (s) {
      var d = DAYS[s.weekday];
      if (days.indexOf(d) === -1) days.push(d);
      if (times.indexOf(s.time) === -1) times.push(s.time);
    });
    var perWeek = perWeekNow();
    elLine.innerHTML =
      '<span class="rt-dot"></span>' +
      '<b>Ритм: ' + perWeek + ' ' + plural(perWeek, 'раз', 'раза', 'раз') + ' в неделю</b>' +
      (days.length ? '<span>' + days.join(' · ') + '</span>' : '') +
      (times.length ? '<span class="rt-times">' + times.sort().join(' · ') + '</span>' : '') +
      '<a class="rt-edit" role="button" tabindex="0">изменить</a>';
    paint();
  }

  /* ── загрузка ─────────────────────────────────────────────── */
  fetch('/api/slots', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && Array.isArray(d.slots) && d.slots.length) {
        state.perWeek = d.perWeek;
        state.tz = d.tz || state.tz;
        state.slots = d.slots;
        showLine();
      } else {
        showAsk();
      }
    })
    .catch(function () { showAsk(); });

  /* ── клики ────────────────────────────────────────────────── */
  panel.addEventListener('click', function (e) {
    var t = e.target;

    /* выбор ритма */
    var opt = t.closest && t.closest('.rt-opt');
    if (opt) {
      var n = opt.getAttribute('data-n');
      if (n === 'own') {
        var v = window.prompt('Сколько раз в неделю? (1–70)', String(state.slots.length || 3));
        if (v === null) return;
        var num = parseInt(v, 10);
        if (!num || num < 1 || num > 70) { alert('Нужно число от 1 до 70.'); return; }
        n = num;
      }
      panel.querySelectorAll('.rt-opt').forEach(function (o) { o.classList.remove('on'); });
      opt.classList.add('on');
      showGrid(defaultGrid(Number(n)));
      return;
    }

    /* убрать время */
    var del = t.closest && t.closest('[data-del]');
    if (del) {
      var parts = del.getAttribute('data-del').split('|');
      state.slots = state.slots.filter(function (s) {
        return !(s.weekday === Number(parts[0]) && s.time === parts[1]);
      });
      renderWeek();
      return;
    }

    /* добавить время */
    var add = t.closest && t.closest('[data-add]');
    if (add) {
      var wd = Number(add.getAttribute('data-add'));
      var used = state.slots.filter(function (s) { return s.weekday === wd; }).map(function (s) { return s.time; });
      var free = TIMES.filter(function (x) { return used.indexOf(x) === -1; })[0];
      var v2 = window.prompt('Во сколько? (ЧЧ:ММ)', free || '09:00');
      if (v2 === null) return;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v2)) { alert('Время в виде 09:00'); return; }
      state.slots.push({ weekday: wd, time: v2 });
      state.slots.sort(function (a, b) { return a.weekday - b.weekday || a.time.localeCompare(b.time); });
      renderWeek();
      return;
    }

    /* сохранить */
    if (t.closest && t.closest('[data-save]')) {
      var btn = t.closest('[data-save]');
      btn.disabled = true;
      fetch('/api/slots', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perWeek: perWeekNow(), tz: state.tz, slots: state.slots })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) {
          state.perWeek = d.perWeek;
          state.slots = d.slots || [];
          showLine();
        })
        .catch(function () { alert('Не сохранилось. Попробуем ещё раз?'); })
        .then(function () { btn.disabled = false; });
      return;
    }

    /* изменить / отмена */
    if (t.closest && t.closest('.rt-edit')) { showGrid(); return; }
    if (t.closest && t.closest('[data-cancel]')) {
      if (state.slots.length) showLine(); else showAsk();
      return;
    }
    if (t.closest && t.closest('[data-back]')) { showAsk(); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var ed = document.activeElement;
    if (ed && ed.classList && ed.classList.contains('rt-edit')) { e.preventDefault(); showGrid(); }
  });

  paint();
})();
