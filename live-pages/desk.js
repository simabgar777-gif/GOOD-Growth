/* ============================================================
   GOOD Growth · СТОЛ v2 — вахтенный дашборд

   Отвечает на два вопроса: «что сейчас происходит» и «что мне
   сделать». Данные только настоящие: три API-источника.
   Если данные не пришли — показываем «—», а не выдуманные числа.
   ============================================================ */
(function () {
  'use strict';

  var desk = document.getElementById('deskSection');
  if (!desk) return;

  var path = (location.pathname || '/').replace(/\/+$/, '') || '/app';
  var isDesk = (path === '/app');
  document.body.classList.add(isDesk ? 'is-desk' : 'is-workshop');
  if (!isDesk) { desk.hidden = true; return; }
  desk.hidden = false;

  var T = function (k, d) { return (window.ggT ? window.ggT(k, d) : d); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function get(url) {
    return fetch(url, { headers: { 'Cache-Control': 'no-cache' }, credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function el(id) { return document.getElementById(id); }
  function setText(id, v) { var n = el(id); if (n) n.textContent = (v === null || v === undefined) ? '—' : String(v); }

  function lang() { return (window.ggLang && window.ggLang() === 'en') ? 'en-GB' : 'ru-RU'; }
  /* в базе даты расписания и публикации — московское время (UTC+3) */
  function parseMs(s) {
    if (!s) return NaN;
    var t = String(s).replace(' ', 'T');
    if (!/[Zz+]/.test(t)) t += 'Z';
    var ms = new Date(t).getTime();
    return isFinite(ms) ? ms - 3 * 3600 * 1000 : ms;
  }
  function mskNow() { return Date.now() + 3 * 3600 * 1000; }  /* МСК = UTC+3 */
  function mskParts(ms) {
    var d = new Date(ms + 3 * 3600 * 1000);
    return { d: d, hh: d.getUTCHours(), mm: d.getUTCMinutes(), wd: d.getUTCDay() };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var WD = function () {
    var a = T('clock.daysSun', 'Вс,Пн,Вт,Ср,Чт,Пт,Сб').split(',');
    return a.length === 7 ? a : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  };
  var MON = function () {
    var a = T('clock.months', 'янв,фев,мар,апр,мая,июн,июл,авг,сен,окт,ноя,дек').split(',');
    return a.length === 12 ? a : ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  };
  function dayMonth(ms) {
    var p = mskParts(ms);
    return p.d.getUTCDate() + ' ' + MON()[p.d.getUTCMonth()];
  }
  function humanWhen(ms) {
    var now = Date.now();
    var a = mskParts(now), b = mskParts(ms);
    var sameDay = a.d.getUTCFullYear() === b.d.getUTCFullYear() && a.d.getUTCMonth() === b.d.getUTCMonth() && a.d.getUTCDate() === b.d.getUTCDate();
    var time = pad(b.hh) + ':' + pad(b.mm);
    if (sameDay) return T('dash.today', 'сегодня') + ' ' + time;
    var tomorrow = mskParts(now + 86400000);
    if (tomorrow.d.getUTCDate() === b.d.getUTCDate() && tomorrow.d.getUTCMonth() === b.d.getUTCMonth()) {
      return T('dash.tomorrow', 'завтра') + ' ' + time;
    }
    return dayMonth(ms) + ' · ' + time;
  }

  /* ───────────── состояние строки ───────────── */
  function paintState(sched, posts) {
    var box = el('d2State');
    if (!box) return;
    var nowP = mskParts(Date.now());
    var queued = 0, next = null;
    (sched || []).forEach(function (p) {
      var ms = parseMs(p.scheduled_at);
      if (!isFinite(ms)) return;
      if (p.published_at) return;
      queued++;
      if (ms > Date.now() && (!next || ms < next)) next = ms;
    });
    var parts = [];
    parts.push('<span class="dot"></span>' + T('dash.now', 'Сейчас') + ' ' + pad(nowP.hh) + ':' + pad(nowP.mm) + ' ' + T('dash.msk', 'МСК'));
    parts.push('<i>·</i>' + queued + ' ' + T('dash.inQueue', 'в очереди'));
    parts.push('<i>·</i>' + (next ? T('dash.nextAt', 'следующий — ') + humanWhen(next) : T('dash.noneNext', 'следующий не назначен')));
    box.innerHTML = parts.join(' ');
  }

  /* ───────────── плитки ───────────── */
  function paintTiles(totals, posts, profile) {
    var published = totals ? Number(totals.published) || 0 : null;
    setText('d2Published', published);

    var week = 0, hasWeek = false;
    var weekAgo = Date.now() - 7 * 86400000;
    var drafts = 0, fallback = 0;
    (posts || []).forEach(function (p) {
      if (p.published_at) {
        hasWeek = true;
        if (parseMs(p.published_at) >= weekAgo) week++;
      } else if (!p.scheduled_at) {
        drafts++;
      }
      var eng = String(p.image_engine || '');
      if (p.image_path && eng === 'pollinations') fallback++;
    });
    var sub = el('d2PublishedSub');
    if (sub) {
      sub.innerHTML = published === null
        ? ''
        : (week > 0
            ? '<span class="up">+' + week + '</span> ' + T('dash.perWeek', 'за последнюю неделю')
            : T('dash.noNew', 'за неделю новых не было'));
    }
    setText('d2Drafts', (posts ? drafts : null));

    var used = profile && profile.usage_posts ? Number(profile.usage_posts.used) || 0 : null;
    var max = profile && profile.usage_posts ? Number(profile.usage_posts.max) : null;
    if (used === null || !max) {
      setText('d2Left', '—');
      var lm = el('d2LeftMax'); if (lm) lm.textContent = '';
    } else {
      setText('d2Left', Math.max(0, max - used));
      var lm2 = el('d2LeftMax'); if (lm2) lm2.textContent = T('dash.of', 'из') + ' ' + max;
    }
    var ps = el('d2PlanSub');
    if (ps) ps.textContent = profile && profile.plan ? T('dash.plan', 'по тарифу') + ' «' + (profile.plan.code || '') + '»' : '';
    paintAttention(drafts, fallback);
  }

  /* ───────────── требует внимания ───────────── */
  function paintAttention(drafts, fallback) {
    var blk = el('d2Attention'), rows = el('d2AttRows');
    if (!blk || !rows) return;
    var out = [];
    if (drafts > 0) {
      out.push('<div class="d2-att">' +
        '<span class="d2-tag">' + esc(T('dash.urgent', 'срочно')) + '</span>' +
        '<span class="tx">' + drafts + ' ' + esc(T('dash.draftLine', 'постов написаны, но без даты')) +
        '<small>' + esc(T('dash.draftHint', 'Пока у них нет времени — они не выйдут')) + '</small></span>' +
        '<a class="d2-go" href="/app/schedule">' + esc(T('dash.spread', 'Разложить по ритму')) + '</a></div>');
    }
    if (fallback > 0) {
      out.push('<div class="d2-att">' +
        '<span class="d2-tag q">' + esc(T('dash.usually', 'обычно')) + '</span>' +
        '<span class="tx">' + fallback + ' ' + esc(T('dash.fallbackLine', 'картинок нарисованы резервным движком')) +
        '<small>' + esc(T('dash.fallbackHint', 'С водяным знаком — можно перерисовать через fal')) + '</small></span>' +
        '<a class="d2-go" href="/admin">' + esc(T('dash.openEngines', 'Открыть движки')) + '</a></div>');
    }
    if (!out.length) { blk.hidden = true; rows.innerHTML = ''; return; }
    blk.hidden = false;
    rows.innerHTML = out.join('');
  }

  /* ───────────── ритм недели ───────────── */
  function paintWeek(rhythm) {
    var box = el('d2Week');
    if (!box) return;
    var slots = (rhythm && rhythm.slots) || [];
    var names = WD();
    var order = [1, 2, 3, 4, 5, 6, 0];           /* ПН..ВС */
    var html = [];
    order.forEach(function (wd) {
      var times = slots.filter(function (s) { return Number(s.weekday) === wd; })
                       .map(function (s) { return String(s.time || '').slice(0, 5); })
                       .filter(Boolean).sort();
      var label = names[wd];
      if (!times.length) {
        html.push('<div class="d2-day empty"><div class="d">' + esc(label) + '</div><div class="t">—</div></div>');
      } else {
        html.push('<div class="d2-day"><div class="d">' + esc(label) + '</div><div class="t">' + esc(times.join(' · ')) + '</div></div>');
      }
    });
    box.innerHTML = html.join('');
  }

  /* ───────────── следующий пост и очередь ───────────── */
  function paintNext(sched) {
    var box = el('d2Next');
    if (!box) return;
    var cand = (sched || []).filter(function (p) {
      return !p.published_at && isFinite(parseMs(p.scheduled_at)) && parseMs(p.scheduled_at) > Date.now();
    }).sort(function (a, b) { return parseMs(a.scheduled_at) - parseMs(b.scheduled_at); });
    if (!cand.length) {
      box.innerHTML = '<p class="d2-empty">' + esc(T('dash.nextEmpty', 'Пока ничего не запланировано.')) + '</p>';
      return;
    }
    var p = cand[0];
    var ms = parseMs(p.scheduled_at);
    box.innerHTML =
      '<div class="when">' + esc(humanWhen(ms)) + '</div>' +
      '<div class="ch">' + esc(p.published_channel || p.channel || T('dash.telegram', 'Telegram')) + '</div>' +
      '<div class="title">«' + esc(p.title || '—') + '»</div>' +
      '<div class="acts"><a class="d2-btn" href="/app/posts">' + esc(T('dash.open', 'Открыть')) + '</a>' +
      '<a class="d2-btn" href="/app/schedule">' + esc(T('dash.move', 'Перенести')) + '</a></div>';
  }

  function paintQueue(posts) {
    var box = el('d2Queue');
    if (!box) return;
    var rows = (posts || []).slice(0, 4);
    if (!rows.length) {
      box.innerHTML = '<p class="d2-empty">' + esc(T('dash.queueEmpty', 'Постов пока нет.')) + '</p>';
      return;
    }
    box.innerHTML = rows.map(function (p) {
      var cls = 'd2-qrow', status, meta = '—';
      if (p.published_at) { cls += ' pub'; status = T('dash.stPublished', 'опубликован'); meta = dayMonth(parseMs(p.published_at)); }
      else if (p.scheduled_at) { cls += ' plan'; status = T('dash.stPlanned', 'запланирован'); meta = humanWhen(parseMs(p.scheduled_at)); }
      else { status = T('dash.stDraft', 'черновик, без даты'); }
      return '<div class="' + cls + '"><span class="st"></span>' +
        '<span class="t">' + esc(p.title || '—') + '<small>' + esc(status) + '</small></span>' +
        '<span class="m">' + esc(meta) + '</span></div>';
    }).join('');
    var link = el('d2QueueLink');
    if (link && posts.length) link.textContent = T('dash.all', 'все') + ' ' + posts.length;
  }

  /* ───────────── запуск ───────────── */
  Promise.all([
    get('/api/analytics'),
    get('/api/posts'),
    get('/api/schedule'),
    get('/api/profile')
  ]).then(function (res) {
    var analytics = res[0], postsRes = res[1], schedRes = res[2], profile = res[3];
    var posts = (postsRes && postsRes.posts) || [];
    var sched = (schedRes && schedRes.scheduled) || [];
    paintState(sched, posts);
    paintTiles(analytics && analytics.totals, posts, profile);
    paintWeek(schedRes && schedRes.rhythm);
    paintNext(sched);
    paintQueue(posts);
  }).catch(function () {
    var b = el('d2State');
    if (b) b.textContent = T('dash.loadFail', 'Не удалось собрать состояние — обнови страницу.');
  });

  document.addEventListener('gg:i18n', function () {
    Promise.all([get('/api/analytics'), get('/api/posts'), get('/api/schedule'), get('/api/profile')])
      .then(function (res) {
        var posts = (res[1] && res[1].posts) || [];
        var sched = (res[2] && res[2].scheduled) || [];
        paintState(sched, posts);
        paintTiles(res[0] && res[0].totals, posts, res[3]);
        paintWeek(res[2] && res[2].rhythm);
        paintNext(sched);
        paintQueue(posts);
      }).catch(function () {});
  });
})();
