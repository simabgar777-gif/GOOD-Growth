/* ============================================================
   GOOD Growth · СТОЛ (приказ: вход = кабинет, не верстак)

   `/app`         — Стол: что происходит, какой шаг, что ждёт, что было
   `/app/strategy`— Мастерская: цель → разбор → посты → журнал

   Отдельный файл, чтобы не трогать app.js. Никаких выдуманных чисел:
   если данные не пришли — показываем «—».
   ============================================================ */
(function () {
  'use strict';

  var desk = document.getElementById('deskSection');
  if (!desk) return;

  var path = (location.pathname || '/').replace(/\/+$/, '') || '/app';
  var isDesk = (path === '/app');

  // показ: Стол или Мастерская — только классом, чтобы не спорить с app.js
  document.body.classList.add(isDesk ? 'is-desk' : 'is-workshop');
  if (!isDesk) { desk.hidden = true; return; }
  desk.hidden = false;

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
  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  var NUM = { goals: null, posts: null, published: null, channels: null };

  function setNum(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = (v === null || v === undefined) ? '—' : String(v);
  }

  /* ---------- 1. Сегодня: три настоящих числа ---------- */
  get('/api/analytics').then(function (d) {
    var t = d && d.totals;
    if (!t) { setNum('deskGoals', null); setNum('deskPosts', null); setNum('deskPublished', null); return; }
    NUM.goals = Number(t.goals) || 0;
    NUM.posts = Number(t.posts) || 0;
    NUM.published = Number(t.published) || 0;
    NUM.channels = Number(t.channels) || 0;
    setNum('deskGoals', NUM.goals);
    setNum('deskPosts', NUM.posts);
    setNum('deskPublished', NUM.published);
    step();
    wait();
  });

  /* ---------- 2. С чего начать: ОДИН шаг ---------- */
  function step() {
    var a = document.getElementById('deskStep');
    var t = document.getElementById('deskStepTitle');
    var h = document.getElementById('deskStepHint');
    if (!a || !t || !h) return;
    var goals = NUM.goals, posts = NUM.posts, pub = NUM.published, ch = NUM.channels;
    if (goals === null) {                      // данных нет — зовём с самого начала
      t.textContent = 'Задать цель'; h.textContent = 'С этого начинается всё'; a.href = '/app/strategy'; return;
    }
    if (goals === 0) {
      t.textContent = 'Задать цель'; h.textContent = 'Одна фраза — и система разложит её на план'; a.href = '/app/strategy'; return;
    }
    if (posts === 0) {
      t.textContent = 'Создать первые посты'; h.textContent = 'Цель есть — теперь контент'; a.href = '/app/strategy'; return;
    }
    if (posts - pub > 0) {
      t.textContent = 'Запланировать ' + (posts - pub) + ' ' + plural(posts - pub, 'пост', 'поста', 'постов');
      h.textContent = 'Они уже написаны — осталось выбрать время'; a.href = '/app/schedule'; return;
    }
    t.textContent = 'Посмотреть, что вышло';
    h.textContent = 'Всё опубликовано — самое время разобрать'; a.href = '/app/analytics';
  }

  /* ---------- 3. Что ждёт ---------- */
  function wait() {
    var box = document.getElementById('deskWait');
    var blk = document.getElementById('deskWaitBlk');
    if (!box || !blk) return;
    var rows = [];
    var notOut = (NUM.posts || 0) - (NUM.published || 0);
    if (notOut > 0) {
      rows.push(row(notOut + ' ' + plural(notOut, 'пост', 'поста', 'постов') + ' ещё не вышли',
                    'Написаны, но без даты', '/app/schedule', 'Запланировать'));
    }
    if ((NUM.channels || 0) === 0) {
      rows.push(row('Ни одного канала', 'Публиковать некуда — подключи первый', '/app/channels', 'Подключить'));
    }
    if (!rows.length) { blk.hidden = true; return; }
    blk.hidden = false;
    box.innerHTML = rows.join('');
  }

  function row(title, hint, href, action) {
    return '<div class="desk-row"><div class="desk-row-t">' + esc(title) + '</div>' +
           '<div class="desk-row-h">' + esc(hint) + '</div>' +
           '<a class="desk-row-go" href="' + esc(href) + '">' + esc(action) + ' →</a></div>';
  }

  /* ---------- 4. Последнее: три строки журнала ---------- */
  get('/api/goals').then(function (d) {
    var box = document.getElementById('deskLast');
    if (!box) return;
    var items = (d && d.goals) || [];
    if (!items.length) {
      box.innerHTML = '<p class="desk-empty">Пока пусто. Первая цель появится здесь — и её можно будет открыть в любой момент.</p>';
      return;
    }
    box.innerHTML = items.slice(0, 3).map(function (g) {
      return '<a class="desk-last" href="/app/strategy">' +
             '<span class="desk-last-d">' + esc(fmtDate(g.created_at)) + '</span>' +
             '<span class="desk-last-t">' + esc(g.goal_text || '') + '</span>' +
             '<span class="desk-last-go">Открыть</span></a>';
    }).join('');
  });

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
})();
