/* ============================================================
   GOOD Growth · настоящий разбор в дизайне Заи

   Берёт цель из базы и заполняет ЕЁ блоки:
     Обзор · Аудитория · Ритм · Темы · Каналы · Шаги · Журнал

   Шаги — путеводитель, а не турникет:
     · порядок свободный, ничего не заперто
     · 02 (ритм) и 04 (отклик) закрываются САМИ, когда работа
       действительно сделана
     · 01 и 03 — галочка вручную: проверить нельзя
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

  function goalId() {
    var q = new URLSearchParams(location.search);
    var g = q.get('goal');
    if (g && /^\d+$/.test(g)) return g;
    try { var s = sessionStorage.getItem('gg_last_goal'); if (s) return s; } catch (e) {}
    return null;
  }

  /* ── тексты для кнопок шагов ──────────────────────────────── */
  function textHeader(d) {
    var st = d.strategy || {};
    var ch = (st.channels || [])[0] || {};
    var t = (st.topics || [])[0] || {};
    return [
      'О чём канал: ' + (st.summary || '—'),
      'Для кого: ' + ((st.audience || {}).text || '—'),
      'Где публикуемся: ' + (ch.name || '—') + (ch.role ? ' — ' + ch.role : ''),
      'Первая тема: ' + (t.title || '—') + (t.angle ? ' — ' + t.angle : ''),
      '',
      'Возьми это как основу для шапки и описания. Своими словами — лучше.'
    ].join('\n');
  }

  function textInvite(d) {
    var st = d.strategy || {};
    var ch = (st.channels || [])[0] || {};
    var themes = (st.topics || []).map(function (t) { return t.title; }).filter(Boolean);
    return [
      'Привет! Я запускаю ' + (ch.name || 'канал') + ' про своё дело.',
      '',
      'О чём: ' + (st.summary || '—'),
      themes.length ? 'Темы: ' + themes.join(' · ') : '',
      '',
      'Мне важна первая обратная связь — загляни и скажи, о чём было бы интересно читать.',
      'Ссылка: (вставь ссылку на канал)'
    ].filter(Boolean).join('\n');
  }

  /* ── заполнение блоков ────────────────────────────────────── */
  function fill(d) {
    var st = d.strategy || {};
    var article = $('razbor');
    if (!article) return;

    var meta = article.querySelector('.sheet-head .meta');
    if (meta) {
      var dt = d.created_at ? new Date(String(d.created_at).replace(' ', 'T')) : null;
      var when = dt && !isNaN(dt) ? dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
      meta.textContent = 'разбор № ' + d.id + (when ? ' · ' + when : '') + (d.source === 'demo' ? ' · демо' : '');
    }

    var quote = article.querySelector('.goal-quote');
    if (quote) quote.innerHTML = '<b>Цель:</b> «' + esc(d.goal_text || d.goal || '') + '»';

    var line = article.querySelector('.strategy-line');
    if (line) line.textContent = st.summary || 'Коротко: ' + (d.goal_text || d.goal || '');

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

    var r = $('rhythm');
    if (r) {
      var rh = st.rhythm || {};
      var per = Number(rh.posting_per_week) > 0 ? Number(rh.posting_per_week) : 3;
      var big = r.querySelector('.big');
      if (big) big.innerHTML = esc(per) + ' <small>/ неделю</small>';
      var note = r.querySelector('.note');
      if (note) note.textContent = rh.plan || 'Ритм можно поменять в «Публикациях».';
      var days = r.querySelector('.days');
      if (days) days.innerHTML = '';
    }

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
    }

    var posts = $('postsSec');
    if (posts) {
      var card = posts.querySelector('.post-card');
      if (card) card.remove();
      var st2 = posts.querySelector('#postsStatus');
      if (st2 && !st2.textContent) {
        st2.textContent = 'Постов пока нет. Нажми «Создать контент» — и они появятся здесь.';
      }
    }

    fillDays();
    wireSteps(d);
  }

  function fillDays() {
    var r = $('rhythm'); if (!r) return;
    var days = r.querySelector('.days'); if (!days) return;
    fetch('/api/slots', { credentials: 'same-origin' })
      .then(function (x) { return x.ok ? x.json() : null; })
      .then(function (d) {
        var out = '', seen = {};
        if (d && d.slots && d.slots.length) {
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

  /* ── шаги: кнопки-действия + автозакрытие ─────────────────── */
  var ACTIONS = [
    { label: 'Шапка и описание', kind: 'text', make: textHeader },
    { label: 'Открыть панель', kind: 'link', href: '/app/schedule' },
    { label: 'Текст приглашения', kind: 'text', make: textInvite },
    { label: 'Открыть аналитику', kind: 'link', href: '/app/analytics' }
  ];

  function wireSteps(d) {
    var box = $('steps'); if (!box) return;
    var labels = [].slice.call(box.querySelectorAll('.step'));
    var inputs = [].slice.call(box.querySelectorAll('.step input[type=checkbox]'));
    var cnt = $('stepsCnt'), bar = $('stepsBar');
    if (!inputs.length) return;

    var gid = d && d.id ? String(d.id) : '';
    if (gid) document.body.dataset.goal = gid;

    function toggleText(label, text) {
      var old = label.querySelector('.step-text');
      if (old) { old.remove(); return; }
      var wrap = document.createElement('div');
      wrap.className = 'step-text';
      wrap.innerHTML = '<pre>' + esc(text) + '</pre>' +
        '<button type="button" class="step-copy">Скопировать</button>';
      label.appendChild(wrap);
      var cp = wrap.querySelector('.step-copy');
      cp.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        ta.remove();
        cp.textContent = 'Скопировано ✓';
        setTimeout(function () { cp.textContent = 'Скопировать'; }, 1800);
      });
    }

    labels.forEach(function (label, i) {
      var act = ACTIONS[i];
      if (!act || label.querySelector('.step-go')) return;
      var go = document.createElement('button');
      go.type = 'button';
      go.className = 'step-go';
      go.textContent = act.label;
      label.appendChild(go);

      go.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (act.kind === 'link') { location.href = act.href; return; }
        toggleText(label, act.make(d));
      });
    });

    function paint(list) {
      inputs.forEach(function (inp, n) { inp.checked = (list || []).indexOf(n) > -1; });
      labels.forEach(function (l, n) { l.classList.toggle('is-done', (list || []).indexOf(n) > -1); });
      var done = (list || []).length;
      if (cnt) cnt.textContent = done + ' / ' + inputs.length;
      if (bar) bar.style.width = (inputs.length ? Math.round(done / inputs.length * 100) : 0) + '%';
    }
    function current() {
      return inputs.map(function (x, n) { return x.checked ? n : -1; })
                   .filter(function (n) { return n > -1; });
    }
    function save(list) {
      if (!gid) return;
      fetch('/api/goals/' + gid + '/steps', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: list })
      }).catch(function () {});
    }

    inputs.forEach(function (input) {
      input.addEventListener('change', function () { var l = current(); paint(l); save(l); });
      var label = input.closest('label');
      if (label) {
        label.addEventListener('click', function (e) {
          if (e.target === input || e.target.closest('.step-go') || e.target.closest('.step-text')) return;
          e.preventDefault();
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change'));
        });
      }
    });

    if (!gid) { paint([]); return; }

    /* 1. что уже отмечено */
    fetch('/api/goals/' + gid + '/steps', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (res) { paint(res && Array.isArray(res.done) ? res.done : []); autoCheck(); })
      .catch(function () { paint([]); autoCheck(); });

    /* 2. что система видит сама: задан ритм → 02, есть 3 публикации → 04 */
    function autoCheck() {
      var jobs = [
        fetch('/api/slots', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (s) { return s && s.slots && s.slots.length ? 1 : -1; })
          .catch(function () { return -1; }),
        fetch('/api/analytics', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (a) {
            var pub = a && a.totals ? Number(a.totals.published) : 0;
            return pub >= 3 ? 3 : -1;
          })
          .catch(function () { return -1; })
      ];
      Promise.all(jobs).then(function (res) {
        var extra = res.filter(function (n) { return n > -1; });
        if (!extra.length) return;
        var already = current();
        var merged = already.slice();
        extra.forEach(function (n) { if (merged.indexOf(n) < 0) merged.push(n); });
        merged.sort();
        if (merged.length === already.length) return;
        paint(merged);
        save(merged);
        var note = document.createElement('p');
        note.className = 'steps-auto';
        note.textContent = 'Система увидела, что работа сделана — и закрыла шаг сама.';
        if (cnt && cnt.parentNode) cnt.parentNode.appendChild(note);
      });
    }
  }


  /* ── посты в дизайне Заи ────────────────────────────────────
     app.js рисует СВОЮ старую разметку — на её странице она
     выглядит голой. Перерисовываем карточки её классами. */
  /* ── время публикации ─────────────────────────────────────── */
  var DOW_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var MONTH_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) {                      /* для сервера: ГГГГ-ММ-ДД ЧЧ:ММ */
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function localInput(d) {                 /* для <input type=datetime-local> */
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
           'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function human(d) {
    return DOW_FULL[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH_GEN[d.getMonth()] +
           ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ближайшее свободное время из сетки слотов */
  function nextFreeSlot(slots, busy) {
    var now = Date.now();
    var list = (slots || []).map(function (x) {
      var t = String(x.time || x.time_hm || '10:00');
      var p = t.split(':');
      return { wd: Number(x.weekday), h: Number(p[0]) || 10, m: Number(p[1]) || 0 };
    }).filter(function (x) { return x.wd >= 0 && x.wd <= 6; })
      .sort(function (a, b) { return (a.h * 60 + a.m) - (b.h * 60 + b.m); });

    if (!list.length) {                    /* ритма нет — завтра в 10:00 */
      var d0 = new Date(); d0.setDate(d0.getDate() + 1); d0.setHours(10, 0, 0, 0);
      return { when: d0, fromRhythm: false };
    }
    for (var day = 0; day <= 21; day++) {
      var base = new Date(); base.setDate(base.getDate() + day);
      list.forEach(function (sl) {
        if (sl.wd !== base.getDay()) return;
        var cand = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sl.h, sl.m, 0, 0);
        if (cand.getTime() <= now + 5 * 60000) return;
        if (busy[stamp(cand)]) return;
        if (!nextFreeSlot.found) nextFreeSlot.found = { when: cand, fromRhythm: true };
      });
      if (nextFreeSlot.found) { var f = nextFreeSlot.found; nextFreeSlot.found = null; return f; }
    }
    var d1 = new Date(); d1.setDate(d1.getDate() + 1); d1.setHours(10, 0, 0, 0);
    return { when: d1, fromRhythm: false };
  }

  function schedChip(p) {
    if (!p.scheduled_at) return '';
    var raw = String(p.scheduled_at).replace(' ', 'T').slice(0, 16);
    var d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return '<span class="sched-chip">⏰ ' + esc(human(d)) + '</span>';
  }

  function postCard(p) {
    /* подложка в духе Заи есть всегда; картинка ложится сверху,
       а если файла нет — тихо исчезает, без битого значка */
    var pending = p.image_status === 'pending';
    var many = (window.__ggPending || 0) > 1;   /* много в работе — кольца не нужны */
    var img = (pending && !many ? imgStepsHtml(p.id, p.__elapsed || 0) : '') +
      '<div class="ground"></div><div class="flare"><i></i></div>' +
      (p.image_path
        ? '<img src="' + esc(p.image_path) + '" alt="" ' +
          'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" ' +
          'onerror="this.remove()">'
        : '');
    var tag = p.image_status === 'pending' ? 'рисуем…'
            : p.image_path ? 'картинка' : 'без картинки';
    var txt = String(p.text || p.body || '').trim();
    var lines = txt.split('\n');
    var title = (p.title || lines[0] || 'Пост').slice(0, 90);
    var rest = p.title ? txt : lines.slice(1).join(' ').trim();
    var state = p.published_at ? 'опубликован'
              : p.scheduled_at ? 'запланирован'
              : p.approved_at ? 'утверждён' : 'черновик';

    var actions = '';
    if (!p.image_path) {
      actions += '<button type="button" class="step-go" data-img="' + p.id + '">Картинка</button>';
    }
    actions += '<button type="button" class="step-go" data-copy="1">Скопировать текст</button>';
    if (p.published_at) {
      actions += '<span class="sched-note">уже вышел</span>';
    } else if (p.scheduled_at) {
      actions += '<button type="button" class="step-go" data-sched="' + p.id + '">Перенести</button>' +
                 '<button type="button" class="step-go ghost" data-unsched="' + p.id + '">Снять план</button>';
    } else {
      actions += '<button type="button" class="step-go gold" data-sched="' + p.id + '">Запланировать</button>';
    }

    return '<div class="post-card" data-gg="1" data-post-id="' + p.id + '">' +
      '<div class="post-media"><span class="tag-img">' + esc(tag) + '</span>' + img + '</div>' +
      '<div class="post-body">' +
        '<p class="meta">№ ' + p.id + ' · ' + esc(state) +
          (pending ? ' · <span class="drawing">● рисуется</span>' : '') +
          (p.scheduled_at ? ' · ' + schedChip(p) : '') + '</p>' +
        '<h4>' + esc(title) + '</h4>' +
        (rest ? '<p>' + esc(rest.slice(0, 400)) + '</p>' : '') +
        '<div class="post-actions">' + actions + '</div>' +
        '<div class="sched-slot"></div>' +
      '</div></div>';
  }

  /* маленькая панель: когда поставить */
  function openSched(card, p, goalId, slots, busy) {
    var box = card.querySelector('.sched-slot');
    if (!box) return;
    if (box.getAttribute('data-open') === '1') { box.innerHTML = ''; box.removeAttribute('data-open'); return; }
    box.setAttribute('data-open', '1');

    var cur = p.scheduled_at ? new Date(String(p.scheduled_at).replace(' ', 'T')) : null;
    var prop = nextFreeSlot(slots, busy);
    var d = (cur && !isNaN(cur.getTime())) ? cur : prop.when;
    var hint = prop.fromRhythm && !cur ? ' — из твоего ритма' : '';

    box.innerHTML =
      '<div class="sched-box">' +
        '<p class="sched-hint">' + esc(human(d)) + '<span>' + hint + '</span></p>' +
        '<input class="sched-when" type="datetime-local" value="' + localInput(d) + '">' +
        '<div class="sched-btns">' +
          '<button type="button" class="step-go gold" data-sched-go="' + p.id + '">Поставить</button>' +
          '<button type="button" class="step-go ghost" data-sched-cancel="1">Отмена</button>' +
        '</div>' +
        '<p class="sched-err"></p>' +
        '<p class="sched-note-line">Публикуем сами только в Telegram. ' +
          'Для VK нажми «Скопировать текст» и вставь вручную.</p>' +
      '</div>';

    var input = box.querySelector('.sched-when');
    var hintEl = box.querySelector('.sched-hint');
    input.addEventListener('change', function () {
      var v = new Date(input.value);
      if (!isNaN(v.getTime())) hintEl.innerHTML = esc(human(v)) + '<span></span>';
    });
    box.querySelector('[data-sched-cancel]').addEventListener('click', function () {
      box.innerHTML = ''; box.removeAttribute('data-open');
    });
    box.querySelector('[data-sched-go]').addEventListener('click', function () {
      var v = new Date(input.value);
      var err = box.querySelector('.sched-err');
      if (isNaN(v.getTime())) { err.textContent = 'Выбери дату и время.'; return; }
      var btn = this; btn.disabled = true; btn.textContent = 'Ставлю…';
      fetch('/api/posts/' + p.id + '/schedule', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ when: stamp(v) })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'Не получилось');
          renderPosts(goalId);
        })
        .catch(function (e) {
          err.textContent = e.message;
          btn.disabled = false; btn.textContent = 'Поставить';
        });
    });
  }

  function renderPosts(goalId) {
    var root = $('postsRoot'); if (!root || !goalId) return;
    Promise.all([
      fetch('/api/goals/' + goalId + '/posts', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/slots', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/schedule', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var d = res[0] || {};
      var slots = (res[1] && res[1].slots) || [];
      var busy = {};
      ((res[2] && res[2].scheduled) || []).forEach(function (it) {
        var w = String(it.scheduled_at || it.when || '').slice(0, 16);
        if (w) busy[w.replace('T', ' ')] = true;
      });

      var items = d.posts || [];
      var pend = items.filter(function (x) { return x.image_status === 'pending'; }).length;
      window.__ggPending = pend;
      var doneN = 0;
      items.forEach(function (x) { if (x.image_path) doneN++; });
      root.innerHTML = (pend > 1 ? imgLineHtml(pend, doneN) : '') + items.map(postCard).join('');

      var st = $('postsStatus');
      if (st) {
        var sched = items.filter(function (x) { return x.scheduled_at; }).length;
        st.textContent = items.length
          ? 'Готово: ' + items.length + ' постов' + (sched ? ' · в плане: ' + sched : '')
          : '';
      }

      root.querySelectorAll('[data-img]').forEach(function (b) {
        b.addEventListener('click', function () {
          b.disabled = true; b.textContent = 'рисуем…';
          fetch('/api/posts/' + b.getAttribute('data-img') + '/image', {
            method: 'POST', credentials: 'same-origin'
          }).then(function () { setTimeout(function () { renderPosts(goalId); }, 1500); })
            .catch(function () { b.disabled = false; b.textContent = 'Картинка'; });
        });
      });

      root.querySelectorAll('[data-sched]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-sched');
          var card = b.closest('.post-card');
          var post = items.filter(function (x) { return String(x.id) === String(id); })[0] || {};
          openSched(card, post, goalId, slots, busy);
        });
      });

      root.querySelectorAll('[data-unsched]').forEach(function (b) {
        b.addEventListener('click', function () {
          b.disabled = true;
          fetch('/api/posts/' + b.getAttribute('data-unsched') + '/schedule', {
            method: 'DELETE', credentials: 'same-origin'
          }).then(function () { renderPosts(goalId); })
            .catch(function () { b.disabled = false; });
        });
      });

      root.querySelectorAll('[data-poll]').forEach(function (el) {
        var pid = el.getAttribute('data-poll');
        var started = Date.now();
        (function tick() {
          setTimeout(function () {
            fetch('/api/posts/' + pid + '/image', { credentials: 'same-origin' })
              .then(function (r) { return r.ok ? r.json() : null; })
              .then(function (j) {
                if (j && (j.status === 'done' || j.status === 'error')) { renderPosts(goalId); return; }
                var sec = Math.round((Date.now() - started) / 1000);
                var lab = el.querySelector('.elapsed');
                if (lab) lab.textContent = sec + ' с';
                tick();
              })
              .catch(function () { tick(); });
          }, 3000);
        })();
      });

      root.querySelectorAll('[data-copy]').forEach(function (b) {
        b.addEventListener('click', function () {
          var card = b.closest('.post-card');
          var t = card ? card.querySelector('h4').textContent + '\n' + (card.querySelector('p:not(.meta)') || {}).textContent : '';
          var ta = document.createElement('textarea'); ta.value = t || '';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          ta.remove();
          b.textContent = 'Скопировано ✓';
          setTimeout(function () { b.textContent = 'Скопировать текст'; }, 1600);
        });
      });
    }).catch(function () {});
  }

  /* app.js дописывает свои карточки — заменяем их нашими */
  function watchPosts(goalId) {
    var root = $('postsRoot'); if (!root || !goalId) return;
    var busy = false;
    new MutationObserver(function () {
      if (busy) return;
      var bad = [].slice.call(root.children).some(function (c) { return !c.getAttribute('data-gg'); });
      if (!bad) return;
      busy = true;
      setTimeout(function () { renderPosts(goalId); busy = false; }, 250);
    }).observe(root, { childList: true });
  }

  /* ── журнал ───────────────────────────────────────────────── */
  function fillJournal(currentId) {
    var list = $('journalList');
    if (!list) return;
    fetch('/api/goals', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var items = (d && d.goals) || [];
        if (!items.length) {
          list.innerHTML = '<p class="hint" id="journalEmpty">Журнал пока пуст. Первый разбор появится здесь.</p>';
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

  /* ── пустое состояние ─────────────────────────────────────── */
  function empty(message) {
    var art = $('razbor');
    if (!art) return;
    art.querySelectorAll('.grid-2, .topics, .strategy-line').forEach(function (k) { k.hidden = true; });
    var head = art.querySelector('.sheet-head');
    if (head) {
      var line = document.createElement('p');
      line.className = 'strategy-line';
      line.textContent = message;
      head.insertAdjacentElement('afterend', line);
    }
  }

  /* ── запуск ───────────────────────────────────────────────── */
  function boot() {
    var id = goalId();
    if (!id) { empty('Разбора пока нет. Напиши цель выше — и он появится здесь.'); fillJournal(null); return; }
    fetch('/api/goals/' + id, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || (d.goal === undefined && d.goal_text === undefined)) {
          empty('Этот разбор не найден. Выбери другой в журнале.');
          fillJournal(null);
          return;
        }
        if (typeof d.strategy === 'string') {
          try { d.strategy = JSON.parse(d.strategy); } catch (e) { d.strategy = {}; }
        }
        fill(d);
        renderPosts(d.id);
        watchPosts(d.id);
        fillJournal(d.id);
        try { sessionStorage.setItem('gg_last_goal', String(d.id)); } catch (e) {}
        /* говорим остальным модулям, ЧЬЯ цель открыта: иначе «Создать контент» мёртв */
        try { document.dispatchEvent(new CustomEvent('gg:goal', { detail: { id: d.id } })); } catch (e) {}
        var gtext = d.goal_text || d.goal || '';
        if (gtext) document.title = 'Разбор № ' + d.id + ' · GOOD Growth';
      })
      .catch(function () {
        empty('Не удалось открыть разбор. Обнови страницу.');
        fillJournal(null);
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
