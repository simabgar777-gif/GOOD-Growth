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

  /* ?goal= запоминаем В МОМЕНТ загрузки скрипта: app.js успевает
     убрать его из адреса через history.replaceState, и тогда мы
     видели пустоту и писали «разбора пока нет» при живом разборе */
  var BOOT_GOAL = (function () {
    try { return new URLSearchParams(location.search).get('goal'); } catch (e) { return null; }
  })();

  function goalId() {
    if (BOOT_GOAL && /^\d+$/.test(BOOT_GOAL)) return BOOT_GOAL;
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
      window.__ggMeta = 'разбор № ' + d.id + (when ? ' · ' + when : '') + (d.source === 'demo' ? ' · демо' : '');
      meta.textContent = window.__ggMeta;
    }

    /* каналы стратегии — нужны, чтобы честно сказать про VK,
       но только если VK у человека правда есть */
    try {
      window.__ggChannels = (st.channels || []).map(function (c) { return String(c.name || '').toLowerCase(); });
    } catch (e) { window.__ggChannels = []; }

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

  /* если в стратегии есть VK — говорим об этом у поста; если нет — молчим */
  function vkNote() {
    var ch = window.__ggChannels || [];
    var hasVK = ch.some(function (c) { return c.indexOf('vk') > -1 || c.indexOf('вконтакт') > -1; });
    if (!hasVK) return '';
    return 'В Telegram публикуем по времени сами. Для VK скопируй текст — вставишь вручную.';
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

    /* главные действия: их немного */
    var main = '';
    if (!p.image_path) {
      main += '<button type="button" class="step-go" data-img="' + p.id + '">Картинка</button>';
    }
    if (p.published_at) {
      main += '<span class="sched-note">уже вышел</span>';
    } else if (p.scheduled_at) {
      main += '<button type="button" class="step-go" data-sched="' + p.id + '">Перенести</button>' +
              '<button type="button" class="step-go ghost" data-unsched="' + p.id + '">Снять план</button>';
    } else {
      main += '<button type="button" class="step-go gold" data-sched="' + p.id + '">Запланировать</button>';
    }
    if (!p.published_at) {
      main += '<button type="button" class="step-go" data-publish="' + p.id + '">Опубликовать</button>';
    }
    main += '<button type="button" class="step-go" data-preview="' + p.id + '">Как в Telegram</button>';

    /* тихие действия — второй строкой, чтобы не спорили с главными */
    var more = '<button type="button" class="mini" data-edit="' + p.id + '">Редактировать</button>' +
      '<button type="button" class="mini" data-copy="1">Скопировать</button>' +
      '<button type="button" class="mini" data-listen="' + p.id + '">Прослушать</button>' +
      '<button type="button" class="mini" data-regen="' + p.id + '">Перегенерировать</button>' +
      '<button type="button" class="mini danger" data-del="' + p.id + '">Удалить</button>';

    var actions = main;

    return '<div class="post-card" data-gg="1" data-post-id="' + p.id + '">' +
      '<div class="post-work">' +
      '<div class="post-media"><span class="tag-img">' + esc(tag) + '</span>' + img + '</div>' +
      '<div class="post-body">' +
        '<p class="meta">№ ' + p.id + ' · ' + esc(state) +
          (pending ? ' · <span class="drawing">● рисуется</span>' : '') +
          (p.scheduled_at ? ' · ' + schedChip(p) : '') + '</p>' +
        '<h4>' + esc(title) + '</h4>' +
        (rest ? '<p>' + esc(rest.slice(0, 400)) + '</p>' : '') +
        '<div class="post-actions">' + actions + '</div>' +
        '<div class="post-mini">' + more + '</div>' +
        '<div class="sched-slot"></div>' +
      '</div></div>' +
      '<aside class="post-prev" data-prev="' + p.id + '"></aside>' +
      '</div>';
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
        (vkNote() ? '<p class="sched-note-line">' + vkNote() + '</p>' : '') +
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


  /* ── показ поста так, как он выйдет в канале ────────────────
     Buffer-приём: человек видит ленту, а не форму. */
  function channelName() {
    var ch = window.__ggChannels || [];
    for (var i = 0; i < ch.length; i++) {
      if (String(ch[i]).indexOf('telegram') > -1) return 'Telegram';
    }
    return 'канал';
  }

  function openPreview(post) {
    var old = document.getElementById('ggprev');
    if (old) old.remove();

    var when = 'только что';
    if (post.scheduled_at) {
      var dd = new Date(String(post.scheduled_at).replace(' ', 'T'));
      if (!isNaN(dd.getTime())) when = human(dd);
    }
    var txt = String(post.text || post.body || '').trim();
    var title = post.title || '';
    var img = post.image_path
      ? '<img class="prev-img" src="' + esc(post.image_path) + '" alt="" onerror="this.remove()">'
      : '<div class="prev-img ph">картинка появится здесь</div>';

    var box = document.createElement('div');
    box.id = 'ggprev';
    box.className = 'ggprev';
    box.innerHTML =
      '<div class="prev-wrap" role="dialog" aria-label="Как это будет выглядеть">' +
        '<div class="prev-top">' +
          '<span class="prev-ch">' + esc(channelName()) + '</span>' +
          '<button type="button" class="prev-x" aria-label="Закрыть">✕</button>' +
        '</div>' +
        '<div class="prev-phone">' +
          '<div class="prev-head">' +
            '<span class="prev-ava">' +
              '<svg viewBox="238 162 74 101" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M256 193 244 180 244 252" stroke="#F8961D"/><path d="M306 168 263 209" stroke="#28A992"/>' +
              '<path d="M287 216 245 257" stroke="#E01F27"/><path d="M293 227 306.5 244 306.5 176" stroke="#4CB853"/></svg>' +
            '</span>' +
            '<span class="prev-name"><b>Мой канал</b><em>подписчики увидят так</em></span>' +
          '</div>' +
          '<div class="prev-post">' +
            img +
            (title ? '<p class="prev-title">' + esc(title) + '</p>' : '') +
            (txt ? '<p class="prev-txt">' + esc(txt.slice(0, 600)) + '</p>' : '') +
            '<div class="prev-foot"><span>' + esc(when) + '</span><span>👁 0</span></div>' +
          '</div>' +
        '</div>' +
        '<p class="prev-note">Так пост увидят в ' + esc(channelName()) + '. Длину и переносы проверь здесь.</p>' +
      '</div>';

    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('prev-x')) box.remove();
    });
    document.addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { box.remove(); document.removeEventListener('keydown', esc2); }
    });
  }


  /* ── показ поста в ленте выбранной сети (приём Buffer) ────── */
  var NETPREV = [
    { k: 'tg', nm: 'Telegram',  r: '16 / 9',  lim: 4096 },
    { k: 'vk', nm: 'VK',        r: '4 / 3',   lim: 4096 },
    { k: 'ig', nm: 'Instagram', r: '1 / 1',   lim: 2200 },
    { k: 'fb', nm: 'Facebook',  r: '1.91 / 1', lim: 63206 },
    { k: 'in', nm: 'LinkedIn',  r: '1.91 / 1', lim: 3000 }
  ];

  function previewHtml(p, key) {
    var net = NETPREV[0];
    NETPREV.forEach(function (n) { if (n.k === key) net = n; });
    var txt = String(p.text || p.body || '');
    var over = txt.length > net.lim;
    var media = p.image_path
      ? '<img class="pv-img" style="aspect-ratio:' + net.r + '" src="' + esc(p.image_path) +
        '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="pv-img ph" style="aspect-ratio:' + net.r + '">картинка появится здесь</div>';
    var chips = NETPREV.map(function (n) {
      return '<button type="button" class="pv-chip' + (n.k === net.k ? ' on' : '') +
        '" data-net="' + n.k + '">' + n.nm + '</button>';
    }).join('');
    return '<div class="pv-chips">' + chips + '</div>' +
      '<div class="pv-box">' + media +
        (p.title ? '<b class="pv-t">' + esc(String(p.title).slice(0, 90)) + '</b>' : '') +
        '<p class="pv-x">' + esc(txt.slice(0, 400)) + '</p>' +
        '<div class="pv-meta"><span>' + net.nm + ' · ' + net.r.replace(/ \/ /g, ':') + '</span>' +
        '<span class="' + (over ? 'over' : '') + '">' + txt.length + ' / ' + net.lim + ' знаков</span></div>' +
      '</div>';
  }

  function wirePreview(card, p) {
    var host = card.querySelector('.post-prev');
    if (!host) return;
    var cur = 'tg';
    function paint() { host.innerHTML = previewHtml(p, cur); }
    paint();
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-net]');
      if (!b) return;
      cur = b.getAttribute('data-net');
      paint();
    });
  }


  /* ── редактор поста: слева работа, справа живая лента ───────
     Образец — Buffer: видно и текст, и то, как его встретят. */
  var NETUI = {
    tg: { nm: 'Telegram',  r: '16 / 9',   lim: 4096,
          acts: '👁 0 · просмотры', place: 'Мой канал' },
    vk: { nm: 'VK',        r: '4 / 3',    lim: 4096,
          acts: '♡ Нравится   💬 Комментировать   ↗ Поделиться', place: 'Моя группа' },
    ig: { nm: 'Instagram', r: '1 / 1',    lim: 2200,
          acts: '♡  ·  💬  ·  ↗', place: 'my_brand' },
    fb: { nm: 'Facebook',  r: '1.91 / 1', lim: 63206,
          acts: '♡ Нравится   💬 Комментарий   ↗ Поделиться', place: 'Моя страница' },
    in: { nm: 'LinkedIn',  r: '1.91 / 1', lim: 3000,
          acts: '♡ Нравится   💬 Комментарий   ↗ Репост', place: 'Моя компания' }
  };

  function editorHtml(p) {
    var chips = Object.keys(NETUI).map(function (k) {
      return '<button type="button" class="pv-chip' + (k === 'tg' ? ' on' : '') +
        '" data-net="' + k + '">' + NETUI[k].nm + '</button>';
    }).join('');
    return '<div class="gg-e" id="ggEditor" role="dialog" aria-label="Пост">' +
      '<div class="ge-wrap">' +
        '<div class="ge-head">' +
          '<span class="ge-title">Пост № ' + p.id + '</span>' +
          '<button type="button" class="ge-x" aria-label="Закрыть">✕</button>' +
        '</div>' +
        '<div class="ge-body">' +
          '<div class="ge-left">' +
            '<label class="ge-lbl">Заголовок</label>' +
            '<input class="ge-title-in" id="geTitle" value="' + esc(p.title || '') + '">' +
            '<label class="ge-lbl">Текст</label>' +
            '<textarea class="ge-text" id="geText" rows="12">' + esc(p.text || p.body || '') + '</textarea>' +
            '<div class="ge-media">' +
              (p.image_path ? '<img src="' + esc(p.image_path) + '" alt="">' : '<div class="ge-ph">картинки нет</div>') +
              '<button type="button" class="mini" data-img="' + p.id + '">Нарисовать другую</button>' +
            '</div>' +
            '<div class="ge-acts">' +
              '<button type="button" class="step-go gold" data-ge-save="' + p.id + '">Сохранить</button>' +
              '<button type="button" class="step-go" data-ge-close="1">Отмена</button>' +
            '</div>' +
          '</div>' +
          '<div class="ge-right">' +
            '<div class="pv-chips">' + chips + '</div>' +
            '<div class="ge-feed" id="geFeed"></div>' +
          '</div>' +
        '</div>' +
      '</div></div>';
  }

  function feedHtml(p, k) {
    var net = NETUI[k];
    var txt = String(p.text || p.body || '');
    var over = txt.length > net.lim;
    var media = p.image_path
      ? '<img class="fd-img" style="aspect-ratio:' + net.r + '" src="' + esc(p.image_path) +
        '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="fd-img ph" style="aspect-ratio:' + net.r + '">картинка появится здесь</div>';
    return '<div class="fd-card">' +
      '<div class="fd-head">' +
        '<span class="fd-ava">' +
          '<svg viewBox="238 162 74 101" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M256 193 244 180 244 252" stroke="#F8961D"/><path d="M306 168 263 209" stroke="#28A992"/>' +
          '<path d="M287 216 245 257" stroke="#E01F27"/><path d="M293 227 306.5 244 306.5 176" stroke="#4CB853"/></svg>' +
        '</span>' +
        '<span class="fd-who"><b>' + esc(net.place) + '</b><em>только что · ' + net.nm + '</em></span>' +
      '</div>' +
      '<div class="fd-body">' +
        media +
        (p.title ? '<p class="fd-t">' + esc(p.title) + '</p>' : '') +
        '<p class="fd-x">' + esc(txt.slice(0, 600)) + '</p>' +
      '</div>' +
      '<div class="fd-acts"><span>' + net.acts + '</span></div>' +
      '<div class="fd-foot"><span>' + net.r.replace(/ \/ /g, ':') + '</span>' +
        '<span class="' + (over ? 'over' : '') + '">' + txt.length + ' / ' + net.lim + ' знаков</span></div>' +
      '</div>';
  }

  function openEditor(p, goalId) {
    var old = document.getElementById('ggEditor');
    if (old) old.remove();
    var holder = document.createElement('div');
    holder.innerHTML = editorHtml(p);
    var box = holder.firstChild;
    document.body.appendChild(box);

    var feed = box.querySelector('#geFeed');
    var curNet = 'tg';
    var draft = { id: p.id, title: p.title || '', text: p.text || p.body || '', image_path: p.image_path };

    function repaint() { feed.innerHTML = feedHtml(draft, curNet); }
    repaint();

    box.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-net]');
      if (chip) {
        curNet = chip.getAttribute('data-net');
        box.querySelectorAll('.pv-chip').forEach(function (c) {
          c.classList.toggle('on', c.getAttribute('data-net') === curNet);
        });
        repaint();
        return;
      }
      if (e.target === box || e.target.classList.contains('ge-x') || e.target.closest('[data-ge-close]')) {
        box.remove();
        return;
      }
      var img = e.target.closest('[data-img]');
      if (img) {
        img.disabled = true; img.textContent = 'Рисую…';
        fetch('/api/posts/' + draft.id + '/image', { method: 'POST', credentials: 'same-origin' })
          .then(function () { setTimeout(function () { renderPosts(goalId); box.remove(); }, 1200); })
          .catch(function () { img.disabled = false; img.textContent = 'Нарисовать другую'; });
        return;
      }
      var save = e.target.closest('[data-ge-save]');
      if (save) {
        save.disabled = true; save.textContent = 'Сохраняю…';
        var t = box.querySelector('#geTitle').value.trim();
        var x = box.querySelector('#geText').value.trim();
        fetch('/api/posts/' + draft.id, {
          method: 'PATCH', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, body: x })
        }).then(function (r) { if (!r.ok) throw new Error('Не сохранилось'); box.remove(); renderPosts(goalId); })
          .catch(function (err) {
            save.disabled = false; save.textContent = 'Сохранить';
            alert(err.message);
          });
      }
    });

    box.querySelector('#geTitle').addEventListener('input', function (e) {
      draft.title = e.target.value; repaint();
    });
    box.querySelector('#geText').addEventListener('input', function (e) {
      draft.text = e.target.value; repaint();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { box.remove(); document.removeEventListener('keydown', esc); }
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

      try { if (window.ggRefreshWizard) window.ggRefreshWizard(); } catch (e) {}
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

      root.querySelectorAll('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-edit');
          var post = items.filter(function (x) { return String(x.id) === String(id); })[0];
          if (post) openEditor(post, goalId);
        });
      });

      root.querySelectorAll('.post-card').forEach(function (card) {
        var pid = card.getAttribute('data-post-id');
        var post = items.filter(function (x) { return String(x.id) === String(pid); })[0];
        if (post) wirePreview(card, post);
      });

      root.querySelectorAll('[data-regen]').forEach(function (b) {
        b.addEventListener('click', function () {
          b.disabled = true; b.textContent = 'Пишу…';
          fetch('/api/posts/' + b.getAttribute('data-regen') + '/regenerate', {
            method: 'POST', credentials: 'same-origin'
          }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) {
              if (!res.ok) throw new Error((res.j && res.j.error) || 'Не получилось');
              setTimeout(function () { renderPosts(goalId); }, 600);
            })
            .catch(function (e) { b.disabled = false; b.textContent = 'Перегенерировать'; alert(e.message); });
        });
      });

      root.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.getAttribute('data-armed') !== '1') {
            b.setAttribute('data-armed', '1'); b.textContent = 'Точно удалить?';
            setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-armed'); b.textContent = 'Удалить'; } }, 4000);
            return;
          }
          b.disabled = true;
          fetch('/api/posts/' + b.getAttribute('data-del'), { method: 'DELETE', credentials: 'same-origin' })
            .then(function () { renderPosts(goalId); })
            .catch(function () { b.disabled = false; });
        });
      });

      root.querySelectorAll('[data-publish]').forEach(function (b) {
        b.addEventListener('click', function () {
          b.disabled = true; b.textContent = 'Отправляю…';
          fetch('/api/posts/' + b.getAttribute('data-publish') + '/publish', {
            method: 'POST', credentials: 'same-origin'
          }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) {
              if (!res.ok) throw new Error((res.j && res.j.error) || 'Не удалось отправить');
              renderPosts(goalId);
            })
            .catch(function (e) { b.disabled = false; b.textContent = 'Опубликовать'; alert(e.message); });
        });
      });

      root.querySelectorAll('[data-listen]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-listen');
          var post = items.filter(function (x) { return String(x.id) === String(id); })[0];
          if (!post || !window.speechSynthesis) return;
          window.speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(
            (post.title ? post.title + '. ' : '') + String(post.text || post.body || ''));
          u.lang = 'ru-RU'; u.rate = 0.95;
          window.speechSynthesis.speak(u);
          b.textContent = 'Читаю…';
          u.onend = function () { b.textContent = 'Прослушать'; };
        });
      });

      root.querySelectorAll('[data-preview]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-preview');
          var post = items.filter(function (x) { return String(x.id) === String(id); })[0];
          if (post) openPreview(post);
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
      /* чужие карточки (старая разметка app.js) убираем СРАЗУ,
         чтобы человек не видел два разных вида рядом */
      var bad = [].slice.call(root.children).filter(function (c) { return !c.getAttribute('data-gg'); });
      if (!bad.length) return;
      bad.forEach(function (c) { c.remove(); });
      if (busy) return;
      busy = true;
      setTimeout(function () { renderPosts(goalId); busy = false; }, 300);
      setTimeout(function () { renderPosts(goalId); }, 1400);
    }).observe(root, { childList: true });
  }

  /* ── посты созданы: показать их человеку ───────────────────
     кнопка стоит внизу, а посты появляются выше — без прокрутки
     кажется, что ничего не произошло. */
  document.addEventListener('gg:posts-created', function (e) {
    var n = (e && e.detail && e.detail.count) || 0;
    setTimeout(function () {
      var root = $('postsRoot');
      if (!root) return;
      var card = root.querySelector('.post-card');
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('gg-flash');
      setTimeout(function () { card.classList.remove('gg-flash'); }, 2200);
      var st = $('postsStatus');
      if (st && !st.textContent) st.textContent = 'Готово: ' + n + ' постов.';
    }, 500);
  });

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


  /* ══ ВЕДУЩИЙ НА СТРАНИЦЕ «ЦЕЛЬ» ═════════════════════════════
     Большая вертикальная тропа слева. Стоит на месте, справа
     меняется содержимое. Человека ведут за руку: шаг 1, 2, 3…
     Семь старых вкладок сведены к пяти шагам пути. */
  var WIZ = [
    { nm: 'Цель',   ex: 'одна фраза о деле',   c: '#F8961D' },
    { nm: 'Разбор', ex: 'кому и о чём',        c: '#E0574B' },
    { nm: 'Ритм',   ex: 'сколько раз в неделю', c: '#A96AB8' },
    { nm: 'Посты',  ex: 'тексты и картинки',   c: '#28A992' },
    { nm: 'Отклик', ex: 'что сработало',       c: '#4CB853' }
  ];

  /* короткое объяснение: что это за этап — для человека, не для отчёта */
  var EXPLAIN = [
    'одна фраза о деле — из неё родится всё остальное',
    'кому и о чём говорить: аудитория, темы, каналы',
    'сколько раз в неделю и в какие дни выходит пост',
    'готовые тексты и картинки — их можно публиковать',
    'что сработало, а что стоит поменять'
  ];

  var SECTIONS = {
    1: ['#askForm'],
    2: ['.sheet-head', '.goal-quote', '.strategy-line', '#audience', '#steps'],
    3: ['.sheet-head', '#rhythm'],
    4: ['.sheet-head', '#topics', '#chans', '#postsSec'],
    5: ['.sheet-head']
  };
  var ALL = ['.hero', '#askForm', '.sheet-head', '.goal-quote', '.strategy-line',
             '#audience', '#rhythm', '#topics', '#chans', '#steps', '#postsSec'];


  /* ── шапка шага: цветной номер, название и объяснение ─────── */
  function ensureStepHead() {
    var main = document.getElementById('goalPage');
    if (!main) return null;
    var h = document.getElementById('ggStepHead');
    if (h) return h;
    h = document.createElement('div');
    h.id = 'ggStepHead';
    h.className = 'gghead';
    /* всегда в самом верху содержимого: иначе на шаге «Цель»
       она оказывалась ниже большого заголовка и тропа уезжала вниз */
    var nav = document.querySelector('.ggstep');
    if (nav && nav.parentNode === main) nav.insertAdjacentElement('afterend', h);
    else main.insertBefore(h, main.firstChild);
    return h;
  }


  /* тропа начинается ровно там же, где шапка шага —
     иначе первый пункт «Цель» висит ниже содержимого */
  function alignTrail() {
    if (!WIZ_NAV) return;
    if (window.innerWidth <= 1100) { WIZ_NAV.style.top = ''; return; }
    var head = document.getElementById('ggStepHead');
    if (!head) return;
    /* первый пункт тропы — по середине шапки шага */
    var hr = head.getBoundingClientRect();
    var firstItem = WIZ_NAV.querySelector('.ggstep-i');
    var ih = firstItem ? firstItem.getBoundingClientRect().height : 60;
    var top = Math.round(hr.top + hr.height / 2 - ih / 2);
    WIZ_NAV.style.top = Math.max(64, top) + 'px';
  }
  window.addEventListener('resize', function () { alignTrail(); });

  function paintStepHead(n, meta) {
    var h = ensureStepHead();
    if (!h) return;
    var i = n - 1;
    var w = WIZ[i] || WIZ[0];
    h.style.setProperty('--step', w.c);
    h.innerHTML =
      '<div class="gghead-badge"><span class="num">' + ('0' + n) + '</span></div>' +
      '<div class="gghead-tx">' +
        '<h1>' + w.nm + '</h1>' +
        '<p>' + (EXPLAIN[i] || '') + '</p>' +
        /* на шаге «Цель» разбора ещё нет — мета ему не нужна */
        (meta && n > 1 ? '<span class="gghead-meta">' + esc(meta) + '</span>' : '') +
      '</div>';
  }

  function makeTrail() {
    var t = document.createElement('nav');
    t.className = 'ggstep';
    t.setAttribute('aria-label', 'Путь по разбору');
    return t;
  }

  /* маяк стоит ВПЕРЕДИ того шага, где человек стоит:
     на «Цели» светится «Разбор», на «Ритме» — «Посты» */
  function lightIndex() {
    return CUR_STEP < WIZ.length ? CUR_STEP : -1;
  }

  function paintTrail(nav, done, cur) {
    nav.innerHTML = WIZ.map(function (s, i) {
      var st = done[i] ? (i === cur ? 'done now' : 'done') : (i === cur ? 'now' : '');
      if (i === CUR_STEP - 1) st += ' is-on';   /* «ты здесь» — сразу в разметке */
      return '<button type="button" class="ggstep-i ' + st + '" data-step="' + (i + 1) + '"' +
        ' style="--step:' + s.c + '"' + (i === cur ? ' aria-current="step"' : '') + '>' +
        '<i class="dot"></i>' +
        '<span class="tx"><b>' + s.nm + '</b><em>' + s.ex + '</em></span>' +
        '<span class="n">' + ('0' + (i + 1)) + '</span>' +
        '</button>';
    }).join('');
  }


  /* ── «Дальше»: закончил шаг — система ведёт на следующий ──── */
  var NEXT_TEXT = [
    { done: 'Цель записана',      go: 'Разбор',  why: 'кому и о чём говорить' },
    { done: 'Разбор готов',       go: 'Ритм',    why: 'сколько раз в неделю' },
    { done: 'Ритм задан',         go: 'Посты',   why: 'тексты и картинки' },
    { done: 'Посты созданы',      go: 'Отклик',  why: 'что сработало' },
    { done: 'Путь пройден',       go: null,      why: '' }
  ];


  /* что именно делать, если шаг ещё открыт — без загадок */
  var OPEN_HINT = [
    { tx: 'Шаг 1 открыт: напиши цель в поле выше и нажми «Разобрать цель».',
      label: null },
    { tx: 'Шаг 2 откроется сам, когда разбор будет готов.',
      label: null },
    { tx: 'Шаг 3 открыт: поставь дни и время — когда выходят посты.',
      label: 'Задать ритм', href: '/app/schedule' },
    { tx: 'Шаг 4 открыт: создай посты и поставь им время.',
      label: 'Создать контент', anchor: '#postsSec' },
    { tx: 'Шаг 5 откроется, когда выйдет первый пост.',
      label: 'Открыть аналитику', href: '/app/analytics' }
  ];

  function paintNext(host, step, done) {
    if (!host) return;
    var i = step - 1;
    var finished = done[i];
    var t = NEXT_TEXT[i] || {};
    if (!finished) {
      var oh = OPEN_HINT[i] || {};
      var btn = '';
      if (oh.label && oh.href) btn = '<a class="gg-next-go" href="' + oh.href + '">' + oh.label + ' →</a>';
      else if (oh.label && oh.anchor) btn = '<a class="gg-next-go" href="' + oh.anchor + '">' + oh.label + ' →</a>';
      host.innerHTML = '<div class="gg-next quiet">' +
        '<span class="gg-next-tx">' + (oh.tx || 'Шаг ещё открыт.') + '</span>' + btn +
        '</div>';
      return;
    }
    if (!t.go) {
      host.innerHTML = '<div class="gg-next done-all">' +
        '<span class="gg-next-tx">Весь путь пройден. Дальше — только расти.</span>' +
        '<a class="gg-next-go" href="/app/analytics">Открыть отклик →</a></div>';
      return;
    }
    host.innerHTML = '<div class="gg-next">' +
      '<span class="gg-check">✓</span>' +
      '<span class="gg-next-tx"><b>' + t.done + '.</b> Дальше — ' + t.go + ': ' + t.why + '.</span>' +
      '<button type="button" class="gg-next-go" data-next="' + (step + 1) + '">Продолжить →</button>' +
      '</div>';
    var b = host.querySelector('[data-next]');
    if (b) b.addEventListener('click', function () { showStep(Number(b.getAttribute('data-next'))); });
  }

  var WIZ_NAV = null;
  var CUR_STEP = 1;
  var CUR_DONE = [false, false, false, false, false];

  function showStep(n) {
    CUR_STEP = n;
    var article = $('razbor');
    /* прячем всё */
    ALL.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.classList.add('gg-hide'); });
    });
    /* показываем нужное */
    (SECTIONS[n] || []).forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.classList.remove('gg-hide'); });
    });
    /* пятый шаг: живой блок отклика */
    var pane = document.getElementById('ggOutreach');
    if (n === 5) {
      if (!pane) {
        pane = document.createElement('div');
        pane.id = 'ggOutreach';
        pane.className = 'gg-outreach';
        pane.innerHTML = '<h3>Отклик</h3>' +
          '<p>Здесь будет видно, что сработало. Пока показываем то, что знаем точно.</p>' +
          '<a class="gg-outreach-go" href="/app/analytics">Открыть аналитику →</a>';
        if (article && article.parentNode) article.parentNode.insertBefore(pane, article.nextSibling);
      }
      pane.classList.remove('gg-hide');
    } else if (pane) {
      pane.classList.add('gg-hide');
    }
    document.querySelectorAll('.ggstep-i').forEach(function (b) {
      b.classList.toggle('is-on', Number(b.getAttribute('data-step')) === n);
    });
    if (WIZ_NAV) {
      paintTrail(WIZ_NAV, CUR_DONE, lightIndex());
      WIZ_NAV.querySelectorAll('[data-step]').forEach(function (b) {
        b.addEventListener('click', function () { showStep(Number(b.getAttribute('data-step'))); });
        b.classList.toggle('is-on', Number(b.getAttribute('data-step')) === n);
      });
    }
    paintStepHead(n, window.__ggMeta || '');
    alignTrail();
    paintNext(document.getElementById('ggNext'), n, CUR_DONE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildWizard() {
    try {
    var main = document.getElementById('goalPage');
    if (!main || document.querySelector('.ggstep')) return;

    var oldNav = main.querySelector('.subnav');
    if (oldNav) oldNav.remove();          /* семь вкладок больше не нужны */

    main.classList.add('gg-wizard');
    var nav = makeTrail();
    WIZ_NAV = nav;
    main.insertBefore(nav, main.firstChild);

    if (!document.getElementById('ggNext')) {
      var host = document.createElement('div');
      host.id = 'ggNext';
      host.className = 'gg-next-host';
      var article = document.getElementById('razbor');
      if (article && article.parentNode) article.parentNode.insertBefore(host, article.nextSibling);
      else main.appendChild(host);
    }

    var done = [false, false, false, false, false];
    var cur = 0;

    function refresh() {
      var load = (window.ggPathState && window.ggPathState.load)
        ? window.ggPathState.load()
        : Promise.resolve({ status: 'error' });
      load.then(function (res) {
        if (res && res.status === 'ok') {
          done = res.done;
          cur = done.indexOf(false);
          if (cur < 0) cur = done.length - 1;
        }
        CUR_DONE = done;
        paintTrail(nav, done, lightIndex());
        paintNext(document.getElementById('ggNext'), CUR_STEP, done);
        nav.querySelectorAll('[data-step]').forEach(function (b) {
          b.addEventListener('click', function () { showStep(Number(b.getAttribute('data-step'))); });
        });
      }).catch(function () { paintTrail(nav, done, cur); });
    }
    window.ggRefreshWizard = refresh;
    refresh();
    showStep(1);
    } catch (e) { console.warn('buildWizard', e); }
  }

  /* ── запуск ───────────────────────────────────────────────── */
  function boot() {
    /* тропа стоит ВСЕГДА — даже когда разбора ещё нет.
       Иначе человек без цели не видит, куда идти. */
    try { buildWizard(); } catch (e) { console.warn('wizard', e); }

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
        /* ведущий строится первым: если заполнение где-то споткнётся,
           тропа всё равно встанет */
        try { buildWizard(); } catch (e) { console.warn('wizard', e); }
        try { fill(d); } catch (e) { console.warn('fill', e); }
        try { buildWizard(); } catch (e) {}
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
        try { buildWizard(); } catch (e) {}
        fillJournal(null);
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
