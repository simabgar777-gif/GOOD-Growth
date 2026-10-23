'use strict';
/* GOOD Growth — Двери 1–2. Цель → разбор → посты с картинками. */

const $ = (id) => document.getElementById(id);
const form = $('askForm');
const goalEl = $('goal');
const goBtn = $('goBtn');
const statusLine = $('statusLine');
const goalError = $('goal-error');
const emptyState = $('emptyState');
const resultRoot = $('resultRoot');
const workshopSection = $('workshopSection');
const makeBtn = $('makeBtn');
const postsStatus = $('postsStatus');
const postsRoot = $('postsRoot');
const journalList = $('journalList');
const journalEmpty = $('journalEmpty');
const modeChip = $('modeChip');
const modeText = $('modeText');
const footMode = $('footMode');
const demoToggle = $('demoToggle');
const footerMeta = $('footMeta');

let mode = { ai: 'unknown' };
let currentGoalId = null;
let postCount = 1;
const pollTimers = new Map(); /* postId -> interval */

function setStatus(text) { statusLine.textContent = text || ''; }

/* Честный прогресс: примерное время + плавный бар. Работает в statusLine. */
let progressTimer = null;
function startHonestProgress(totalSec, whatText) {
  stopHonestProgress();
  const t0 = Date.now();
  const total = Math.max(5, totalSec) * 1000;
  const bar = whatText + ' ';
  progressTimer = setInterval(() => {
    const passed = Date.now() - t0;
    const p = Math.min(96, Math.round(passed / total * 100));
    const left = Math.max(1, Math.ceil((total - passed) / 1000));
    statusLine.textContent = bar + ' '.repeat(0) + p + '% · осталось ~' + left + ' с';
    let wrap = document.querySelector('.progress-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'progress-wrap';
      wrap.innerHTML = '<div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>' +
        '<span class="progress-label"></span>';
      statusLine.appendChild(wrap);
    }
    wrap.querySelector('.progress-fill').style.width = p + '%';
    wrap.querySelector('.progress-label').textContent = '~' + left + ' с';
  }, 500);
}
function stopHonestProgress() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  const wrap = document.querySelector('.progress-wrap');
  if (wrap) {
    wrap.querySelector('.progress-fill').style.width = '100%';
    setTimeout(() => wrap.remove(), 700);
  }
}
function setMsgHtml(node, text) {
  /* Orders 32+34: escape first, then /signup and /login become live links anywhere */
  node.innerHTML = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\/(signup|login)\b/g, '<a href="/$1" style="color:var(--accent,#1e7a56);font-weight:700;text-decoration:underline">/$1</a>');
}
function showError(text) {
  /* Order 32: /signup и /login в тексте ошибки — живые ссылки */
  setMsgHtml(goalError, text);
  goalError.hidden = !text;
}
function clearError() { showError(''); }

/* Order 34 / Door 6.1: effective role from /api/me drives workshop buttons.
   Design review: resolve role BEFORE first posts render (no flash, no lost edits). */
let myRole = 'guest'; /* code review: guests must not see role buttons; owner confirmed via /api/me */
let lastPostsArr = null;
let resolveRoleReady;
const roleReady = new Promise((res) => { resolveRoleReady = res; });
(async () => {
  try {
    const r = await fetch('/api/me');
    const d = await r.json();
    if (d && d.user && d.user.role) myRole = d.user.role;
    else if (d && d.user) myRole = 'owner';
  } catch (e) { /* guest or /api/me down - server still guards every write */ }
  resolveRoleReady();
  if (lastPostsArr && lastPostsArr.length) renderPosts(lastPostsArr);
})();

/* ================= Партнёрский режим: бренды (Приказ 22) ================= */
let brandState = { id: null, name: null, list: [] };

async function loadBrands() {
  try {
    const r = await fetch('/api/brands');
    brandState.list = await r.json();
  } catch (e) { brandState.list = []; }
  const saved = sessionStorage.getItem('gg_brand');
  if (saved) {
    const b = brandState.list.find((x) => String(x.id) === saved);
    if (b) { brandState.id = b.id; brandState.name = b.name; }
  }
  paintBrand();
}

function paintBrand() {
  const pill = document.getElementById('brandPill');
  if (!pill) return;
  if (!brandState.list.length) { pill.style.display = 'none'; return; }
  pill.style.display = '';
  const label = document.getElementById('brandLabel');
  label.textContent = brandState.id ? 'Бренд: ' + brandState.name : 'Мои бренды';
  const dd = document.getElementById('brandMenu');
  dd.innerHTML = '<button type="button" data-bid="" class="bmenu-item">— Все мои бренды —</button>' +
    brandState.list.map((b) =>
      '<button type="button" data-bid="' + b.id + '" class="bmenu-item' + (String(b.id) === String(brandState.id) ? ' cur' : '') + '">' +
      escBrand(b.name) + '</button>').join('');
}

function escBrand(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function selectBrand(id) {
  id = id === null || id === '' ? null : Number(id);
  const b = id ? brandState.list.find((x) => x.id === id) : null;
  brandState.id = b ? b.id : null;
  brandState.name = b ? b.name : null;
  if (brandState.id) sessionStorage.setItem('gg_brand', String(brandState.id));
  else sessionStorage.removeItem('gg_brand');
  paintBrand();
  refreshJournal();
}

document.addEventListener('click', (e) => {
  const pill = e.target.closest('#brandPill');
  const item = e.target.closest('.bmenu-item');
  if (item) {
    e.stopPropagation();
    document.getElementById('brandMenu').classList.remove('open');
    selectBrand(item.dataset.bid);
  } else if (pill) {
    document.getElementById('brandMenu').classList.toggle('open');
  } else {
    const menu = document.getElementById('brandMenu');
    if (menu) menu.classList.remove('open');
  }
});

async function loadGoalFromQuery(id) {
  try {
    const r = await fetch('/api/goals/' + id);
    if (!r.ok) return;
    const d = await r.json();
    if (d && d.goal_text !== undefined) {
      try { const el = document.getElementById('goal'); if (el) el.value = d.goal_text; } catch (e) {}
      try { showStrategy(d); } catch (e) {}
      try { sessionStorage.setItem('gg_last_goal', String(d.id)); } catch (e) {}
      try { location.replace('/app'); } catch (e) { location.hash = ''; }
    }
  } catch (e) {}
}

function paintMode() {
  const label = mode.ai === 'live' ? 'ИИ: живой' : mode.ai === 'demo' ? 'ИИ: демо' : 'ИИ: не подключён';
  modeText.textContent = label;
  modeChip.dataset.mode = mode.ai === 'live' ? 'live' : mode.ai === 'demo' ? 'demo' : 'unknown';
  footMode.textContent = label;
}

async function refreshHealth() {
  try {
    const r = await fetch('/api/health');
    mode = await r.json();
  } catch (e) { mode = { ai: 'unknown' }; }
  paintMode();
  demoToggle.textContent = mode.ai === 'demo' ? 'включить живой разбор' : 'включить демо-режим';
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ================= Дверь 1: разбор ================= */

function block(kickerText) {
  const b = el('div', 'block');
  if (kickerText) b.appendChild(el('p', 'block-kicker', kickerText));
  return b;
}

function chips(items) {
  const c = el('div', 'chips');
  items.forEach((t) => c.appendChild(el('span', 'chip', t)));
  return c;
}

function renderResult(data) {
  resultRoot.textContent = '';
  const s = data.strategy || {};
  currentGoalId = data.id;

  const head = el('div', 'result-head');
  head.appendChild(el('h2', null, 'Разбор цели'));
  const when = data.createdAt ? new Date(String(data.createdAt).replace(' ', 'T')) : new Date();
  head.appendChild(el('div', 'result-meta',
    (data.source === 'demo' ? 'демо-разбор' : 'живой разбор') + ' · ' +
    when.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ' · № ' + (data.id ?? '—')));
  resultRoot.appendChild(head);

  /* Дверь 3.2: озвучка разбора */
  const btnListen = el('button', 'btn btn-mini btn-listen', 'Прослушать');
  btnListen.type = 'button';
  btnListen.addEventListener('click', () => {
    const parts = [];
    if (s.summary) parts.push(s.summary);
    if (s.audience && s.audience.text) parts.push('Аудитория: ' + s.audience.text);
    if (s.rhythm && s.rhythm.plan) parts.push('Ритм: ' + s.rhythm.plan);
    speakText(parts.join('. '), btnListen);
  });
  head.appendChild(btnListen);

  if (s.summary) resultRoot.appendChild(el('p', 'summary', s.summary));
  if (data.goal) resultRoot.appendChild(el('p', 'goal-echo', 'Цель: «' + data.goal + '»'));

  const duo = el('div', 'duo');
  const audBlock = block('Аудитория');
  audBlock.appendChild(el('h3', null, (s.audience && s.audience.text) || '—'));
  if (s.audience && Array.isArray(s.audience.insights) && s.audience.insights.length) {
    const ul = el('ul', 'plain');
    s.audience.insights.forEach((i) => ul.appendChild(el('li', null, String(i))));
    audBlock.appendChild(ul);
  }
  duo.appendChild(audBlock);

  const rhy = s.rhythm || {};
  const rhyBlock = block('Ритм публикаций');
  const num = el('p', 'rhythm-num');
  num.appendChild(document.createTextNode(String(rhy.posting_per_week ?? '—')));
  num.appendChild(el('span', 'unit', ' / неделю'));
  rhyBlock.appendChild(num);
  rhyBlock.appendChild(el('p', 'rhythm-label', 'рекомендуемый темп'));
  if (rhy.plan) rhyBlock.appendChild(el('p', 'rhythm-plan', rhy.plan));
  duo.appendChild(rhyBlock);
  resultRoot.appendChild(duo);

  if (Array.isArray(s.topics) && s.topics.length) {
    const tb = block('Темы — ' + s.topics.length);
    s.topics.forEach((t, i) => {
      const row = el('div', 'topic');
      row.appendChild(el('div', 'topic-no', String(i + 1).padStart(2, '0')));
      const body = el('div');
      body.appendChild(el('h4', null, t.title || 'Тема'));
      if (t.angle) body.appendChild(el('p', 'angle', t.angle));
      if (Array.isArray(t.examples) && t.examples.length) body.appendChild(chips(t.examples));
      row.appendChild(body);
      tb.appendChild(row);
    });
    resultRoot.appendChild(tb);
  }

  if (Array.isArray(s.channels) && s.channels.length) {
    const cb = block('Каналы — ' + s.channels.length);
    s.channels.forEach((c) => {
      const row = el('div', 'channel');
      row.appendChild(el('div', 'cname', c.name || 'Канал'));
      const body = el('div');
      if (c.role) body.appendChild(el('p', 'crole', c.role));
      if (Array.isArray(c.format) && c.format.length) body.appendChild(chips(c.format));
      row.appendChild(body);
      cb.appendChild(row);
    });
    resultRoot.appendChild(cb);
  }

  if (Array.isArray(s.first_steps) && s.first_steps.length) {
    const sb = block('Первые шаги');
    s.first_steps.forEach((st, i) => {
      const row = el('div', 'step');
      row.appendChild(el('span', 'step-marker', 'Шаг ' + (i + 1)));
      const body = el('div');
      body.appendChild(el('p', 'stitle', st.step || 'Шаг'));
      if (st.detail) body.appendChild(el('p', 'sdetail', st.detail));
      row.appendChild(body);
      sb.appendChild(row);
    });
    resultRoot.appendChild(sb);
  }

  emptyState.hidden = true;
  resultRoot.hidden = false;
  workshopSection.hidden = false;
  resultRoot.scrollIntoView({ block: 'start', behavior: 'smooth' });
  loadPosts(data.id);
}

/* ================= Дверь 2: посты ================= */

function stopPolling(postId) {
  const t = pollTimers.get(postId);
  if (t) { clearInterval(t); pollTimers.delete(postId); }
}

function stopAllPolling() {
  for (const id of Array.from(pollTimers.keys())) stopPolling(id);
}

function imgChip(status) {
  const map = { pending: 'рисую…', done: 'картинка готова', error: 'не получилась', none: 'без картинки' };
  return el('span', 'img-status ' + status, map[status] || status);
}

function closeSchedPops() {
  document.querySelectorAll('.sched-pop.open').forEach((n) => n.remove());
}
document.addEventListener('click', (e) => {
  if (e.target.closest && (e.target.closest('.sched-pop') || e.target.closest('.btn'))) return;
  closeSchedPops();
});
function defaultSchedValue() {
  /* сейчас+1ч по МСК, локальное поле datetime (значение шлём как МСК) */
  const t = new Date(Date.now() + 3600 * 1000 + 3 * 3600 * 1000);
  return t.toISOString().slice(0, 16);
}
function renderPostCard(p) {
  const card = el('section', 'post-card');
  card.dataset.postId = p.id;

  /* картинка */
  let imgWrap;
  if (p.image_path && p.image_status === 'done') {
    imgWrap = el('img', 'post-img');
    imgWrap.src = p.image_path;
    imgWrap.alt = 'Картинка к посту: ' + p.title;
    imgWrap.loading = 'lazy';
  } else {
    if (p.image_status === 'pending') {
      imgWrap = el('div', 'post-img-ph pending');
      imgWrap.appendChild(buildDial(15));
    } else {
      imgWrap = el('div', 'post-img-ph');
      imgWrap.appendChild(el('span', null,
        p.image_status === 'error' ? 'Картинка не получилась — нажми «Картинка»' :
        'Картинку можно нарисовать кнопкой ниже'));
    }
    if (p.image_status === 'none') {
      const hint = el('span', 'visually-hidden', ' ');
      imgWrap.appendChild(hint);
    }
  }

  const body = el('div', 'post-body');
  const title = el('input', 'post-title-input');
  title.value = p.title; title.setAttribute('aria-label', 'Заголовок поста № ' + p.id); title.maxLength = 90;
  const text = el('textarea', 'post-body-textarea');
  text.value = p.body; text.setAttribute('aria-label', 'Текст поста № ' + p.id); text.maxLength = 500;
  const cta = el('input', 'post-cta-input');
  cta.value = p.cta || ''; cta.setAttribute('aria-label', 'Призыв к действию поста № ' + p.id); cta.maxLength = 120;
  body.appendChild(title); body.appendChild(text); body.appendChild(cta);

  /* O55: meta row — info only, separate container */
  const meta = el('div', 'post-meta');
  meta.appendChild(el('span', 'post-no', 'Пост № ' + p.id));
  meta.appendChild(imgChip(p.image_status));
  if (p.approved_at) meta.appendChild(el('span', 'approve-status', 'Утверждён'));
  const schedChip = el('span', 'sched-chip', '');
  const paintSchedChip = () => {
    schedChip.style.display = p.schedule_status ? '' : 'none';
    schedChip.className = 'sched-chip' + (p.schedule_status === 'failed' ? ' failed' : '');
    schedChip.textContent = p.schedule_status === 'scheduled' ? '⏰ ' + String(p.scheduled_at || '').slice(0, 16) + ' МСК'
      : p.schedule_status === 'failed' ? 'Сбой публикации' : '';
  };
  paintSchedChip();
  meta.appendChild(schedChip);

  /* O55: actions row — ALL buttons in one dedicated container, never floats up */
  const actions = el('div', 'post-actions');

  const btnSave = el('button', 'btn btn-mini', 'Сохранить'); btnSave.type = 'button';
  const btnRegen = el('button', 'btn btn-mini', 'Перегенерировать'); btnRegen.type = 'button';
  const btnImg = el('button', 'btn btn-mini', 'Картинка'); btnImg.type = 'button';
  const btnPub = el('button', 'btn btn-mini publish', p.published_at ? 'Опубликовано ✓' : 'Опубликовать'); btnPub.type = 'button';
  if (p.published_at) btnPub.disabled = true;
  const btnDel = el('button', 'btn btn-mini danger', 'Удалить'); btnDel.type = 'button';

  btnSave.addEventListener('click', async () => {
    btnSave.disabled = true;
    try {
      const r = await fetch('/api/posts/' + p.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.value, body: text.value, cta: cta.value })
      });
      if (!r.ok) throw new Error('Не получилось сохранить');
      const old = btnSave.textContent;
      btnSave.textContent = 'Сохранено ✓';
      setTimeout(() => { btnSave.textContent = old; }, 1600);
    } catch (e) {
      setMsgHtml(postsStatus, e.message);
    } finally { btnSave.disabled = false; }
  });

  btnRegen.addEventListener('click', async () => {
    btnRegen.disabled = true;
    postsStatus.textContent = 'Перегенерирую пост № ' + p.id + '…';
    try {
      const r = await fetch('/api/posts/' + p.id + '/regenerate', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Не получилось перегенерировать');
      replaceCard(data.post);
      startImage(data.post.id);
      postsStatus.textContent = 'Пост № ' + p.id + ' перегенерирован.';
    } catch (e) {
      setMsgHtml(postsStatus, e.message);
      btnRegen.disabled = false;
    }
  });

  btnImg.addEventListener('click', () => startImage(p.id));

  const btnSay = el('button', 'btn btn-mini btn-listen', 'Прослушать'); btnSay.type = 'button';
  btnSay.addEventListener('click', () => {
    speakText((p.title ? p.title + '. ' : '') + p.body, btnSay);
  });

  btnPub.addEventListener('click', async () => {
    if (btnPub.disabled) return;
    btnPub.disabled = true;
    const oldLabel = btnPub.textContent;
    btnPub.textContent = 'Отправляю…';
    try {
      /* сначала сохраняем свежие правки, чтобы в канал ушло то, что на экране */
      await fetch('/api/posts/' + p.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.value, body: text.value, cta: cta.value })
      });
      const r = await fetch('/api/posts/' + p.id + '/publish', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Публикация не прошла');
      btnPub.textContent = 'В канале ✓';
      postsStatus.textContent = 'Пост № ' + p.id + ' опубликован в «Ковчеге» (сообщение № ' + data.messageId + ').';
    } catch (e) {
      setMsgHtml(postsStatus, e.message);
      btnPub.textContent = oldLabel;
      btnPub.disabled = false;
    }
  });

  /* Order 70: «Запланировать» */
  const btnSched = el('button', 'btn btn-mini', p.schedule_status === 'scheduled' ? 'Перенести' : 'Запланировать'); btnSched.type = 'button';
  btnSched.title = 'Опубликовать автоматически в выбранное время (по Москве)';
  btnSched.addEventListener('click', () => {
    if (p.published_at) { setMsgHtml(postsStatus, 'Пост уже опубликован — планировать нечего.'); return; }
    closeSchedPops();
    const pop = el('div', 'sched-pop');
    pop.innerHTML = '<label for="sched-when-' + p.id + '">Когда опубликовать? (МСК)</label>' +
      '<input type="datetime-local" id="sched-when-' + p.id + '" value="' + defaultSchedValue() + '">' +
      '<div class="sched-err" role="alert"></div>' +
      '<div class="sched-row"><button type="button" class="qx">Отмена</button>' +
      (p.schedule_status ? '<button type="button" class="rm">Снять план</button>' : '') +
      '<button type="button" class="go">' + (p.schedule_status === 'scheduled' ? 'Перенести' : 'Запланировать') + '</button></div>';
    actions.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('open'));
    const inp = pop.querySelector('input');
    const err = pop.querySelector('.sched-err');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pop.querySelector('.go').click(); } });
    pop.querySelector('.qx').addEventListener('click', () => pop.remove());
    const rm = pop.querySelector('.rm');
    if (rm) rm.addEventListener('click', async () => {
      rm.disabled = true;
      try {
        const r = await fetch('/api/posts/' + p.id + '/schedule', { method: 'DELETE' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Не получилось снять план');
        p.schedule_status = null; p.scheduled_at = null;
        paintSchedChip(); btnSched.textContent = 'Запланировать';
        postsStatus.textContent = 'Пост № ' + p.id + ': план снят.';
        pop.remove();
      } catch (e) { err.textContent = e.message; rm.disabled = false; }
    });
    pop.querySelector('.go').addEventListener('click', async () => {
      const v = inp.value;
      if (!v) { err.textContent = 'Выбери дату и время.'; return; }
      const go = pop.querySelector('.go'); go.disabled = true;
      try {
        const r = await fetch('/api/posts/' + p.id + '/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ when: v })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Не получилось запланировать');
        p.schedule_status = 'scheduled'; p.scheduled_at = d.post && d.post.scheduled_at;
        paintSchedChip(); btnSched.textContent = 'Перенести';
        postsStatus.textContent = 'Пост № ' + p.id + ' запланирован на ' + String(p.scheduled_at || '').slice(0, 16) + ' МСК. Расписание: /app/schedule.';
        pop.remove();
      } catch (e) { err.textContent = e.message; go.disabled = false; }
    });
    inp.focus();
  });

  let btnApprove = null;
  if (myRole === 'approver' || myRole === 'owner') {
    btnApprove = el('button', 'btn btn-mini approve', p.approved_at ? 'Утверждён ✓' : 'Утвердить'); btnApprove.type = 'button';
    if (p.approved_at) btnApprove.disabled = true;
    btnApprove.addEventListener('click', async () => {
      btnApprove.disabled = true;
      try {
        const r = await fetch('/api/posts/' + p.id + '/approve', { method: 'POST' });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Не получилось утвердить');
        btnApprove.textContent = 'Утверждён ✓';
        if (!tools.querySelector('.approve-status')) {
          const chip = el('span', 'approve-status', 'Утверждён');
          const sp = tools.querySelector('.spacer');
          tools.insertBefore(chip, sp || null);
        }
        postsStatus.textContent = 'Пост № ' + p.id + ' утверждён.';
      } catch (e) { setMsgHtml(postsStatus, e.message); btnApprove.disabled = false; }
    });
  }

  let delArmed = false;
  btnDel.addEventListener('click', async () => {
    if (!delArmed) {
      delArmed = true;
      btnDel.textContent = 'Точно удалить?';
      setTimeout(() => { if (delArmed && card.isConnected) { delArmed = false; btnDel.textContent = 'Удалить'; } }, 4000);
      return;
    }
    btnDel.disabled = true;
    try {
      const r = await fetch('/api/posts/' + p.id, { method: 'DELETE' });
      if (!r.ok) throw new Error('Не получилось удалить');
      stopPolling(p.id);
      card.remove();
      updatePostsCount();
      postsStatus.textContent = 'Пост № ' + p.id + ' удалён.';
    } catch (e) {
      setMsgHtml(postsStatus, e.message);
      btnDel.disabled = false;
    }
  });

  const canPublish = (myRole === 'publisher' || myRole === 'owner');
  const canApprove = (myRole === 'approver' || myRole === 'owner');
  btnSave.title = 'Сохранить правки'; btnRegen.title = 'Написать пост заново'; btnImg.title = 'Нарисовать картинку'; btnSay.title = 'Прочитать пост вслух';
  if (btnApprove) btnApprove.title = 'Пометить пост согласованным — публикацию выполнит публикатор';
  if (canPublish) btnPub.title = 'Отправить пост в канал';
  btnDel.title = 'Удалить пост';
  actions.appendChild(btnRegen); actions.appendChild(btnImg); actions.appendChild(btnSay); actions.appendChild(btnSave);
  if (btnApprove) actions.appendChild(btnApprove);
  if (canPublish) actions.appendChild(btnPub);
  if (p.published_at) btnSched.disabled = true;
  actions.appendChild(btnSched);
  actions.appendChild(btnDel);

  card.appendChild(imgWrap);
  card.appendChild(body);
  card.appendChild(meta);
  card.appendChild(actions);
  return card;
}

function replaceCard(post) {
  const old = postsRoot.querySelector('[data-post-id="' + post.id + '"]');
  const fresh = renderPostCard(post);
  if (old) old.replaceWith(fresh);
  else postsRoot.appendChild(fresh);
}

function updatePostsCount() {
  const n = postsRoot.querySelectorAll('.post-card').length;
  if (n === 0) postsStatus.textContent = 'Постов нет — нажми «Создать контент».';
}

function renderPosts(posts) {
  lastPostsArr = posts;
  stopAllPolling();
  postsRoot.textContent = '';
  posts.forEach((p) => postsRoot.appendChild(renderPostCard(p)));
  posts.forEach((p) => { if (p.image_status === 'pending') pollImage(p.id); });
  updatePostsCount();
  if (myRole === 'creator') {
    const h = document.getElementById('workshopHint');
    if (h && h.dataset.roleNote !== '1') { h.textContent += ' Публикацию выполняет публикатор после утверждения.'; h.dataset.roleNote = '1'; }
  }
}

async function loadPosts(goalId) {
  await roleReady;
  try {
    const r = await fetch('/api/goals/' + goalId + '/posts');
    const data = await r.json();
    renderPosts(data.posts || []);
  } catch (e) { postsRoot.textContent = ''; }
}

/* Стоп картинок и очистка очереди (вызывается сервером из health при перегрузе) */
window.addEventListener('beforeunload', stopAllPolling);

async function startImage(postId) {
  try {
    const r = await fetch('/api/posts/' + postId + '/image', { method: 'POST' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Не получилось запустить рисование');
    const card = postsRoot.querySelector('[data-post-id="' + postId + '"]');
    if (card) {
      const oldImg = card.querySelector('.post-img, .post-img-ph');
      if (oldImg) {
        const ph = el('div', 'post-img-ph pending');
        ph.appendChild(buildDial(15));
        oldImg.replaceWith(ph);
      }
      const chip = card.querySelector('.img-status');
      if (chip) { chip.className = 'img-status pending'; chip.textContent = 'рисую…'; }
    }
    pollImage(postId);
    const ahead = data.queueAhead > 1 ? ' · в очереди ещё ' + (data.queueAhead - 1) : '';
    postsStatus.textContent = 'Картинка для поста № ' + postId + ': ~15 секунд' + ahead;
  } catch (e) { setMsgHtml(postsStatus, e.message); }
}

function pollImage(postId) {
  stopPolling(postId);
  let tries = 0;
  const t = setInterval(async () => {
    tries++;
    if (tries > 60) { stopPolling(postId); return; }
    try {
      const r = await fetch('/api/posts/' + postId + '/image');
      const data = await r.json();
      if (!r.ok) return;
      if (data.status === 'done' || data.status === 'error') {
        stopPolling(postId);
        await refreshPostCard(postId);
        stopAllPollingIfDone();
      }
    } catch (e) { /* попробуем ещё */ }
  }, 2500);
  pollTimers.set(postId, t);
}

async function refreshPostCard(postId) {
  try {
    /* Дверь 8: используем /image-эндпоинт (он реально существует и отдаёт статус) */
    const r = await fetch('/api/posts/' + postId + '/image');
    if (!r.ok) return;
    const data = await r.json();
    const st = data.status;
    const card = postsRoot.querySelector('[data-post-id="' + postId + '"]');
    if (!card) return;
    const oldImg = card.querySelector('.post-img, .post-img-ph');
    if (oldImg && st === 'done' && data.imagePath) {
      const img = el('img', 'post-img');
      img.src = data.imagePath;
      img.alt = 'Картинка к посту № ' + postId;
      oldImg.replaceWith(img);
    } else if (oldImg && st === 'error') {
      const ph = el('div', 'post-img-ph');
      ph.appendChild(el('span', null, 'Картинка не получилась — нажми «Картинка»'));
      oldImg.replaceWith(ph);
    }
    const chip = card.querySelector('.img-status');
    if (chip) {
      chip.className = 'img-status ' + st;
      const map = { pending: 'рисую…', done: 'картинка готова', error: 'не получилась', none: 'без картинки' };
      chip.textContent = map[st] || st;
    }
    if (st === 'done' || st === 'error') stopPolling(postId);
  } catch (e) { /* не критично */ }
}

function stopAllPollingIfDone() {
  if (pollTimers.size === 0) {
    updatePostsCount();
  }
}

/* создать контент */
makeBtn.addEventListener('click', async () => {
  if (!currentGoalId) return;
  makeBtn.disabled = true;
  if (mode.ai === 'demo') postsStatus.textContent = 'Пишу ' + postCount + ' постов (демо)…';
  else startHonestProgress(Math.max(20, postCount * 8), 'Разум пишет ' + postCount + ' постов…');
  try {
    const r = await fetch('/api/goals/' + currentGoalId + '/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: postCount })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Не получилось создать посты');
    const fresh = data.posts;
    fresh.forEach((p) => postsRoot.appendChild(renderPostCard(p)));
    postsStatus.textContent = 'Готово: ' + fresh.length + ' постов.';
    stopHonestProgress();
    for (const p of fresh) {
      await startImage(p.id);
    }
  } catch (e) {
    setMsgHtml(postsStatus, e.message);
  } finally {
    makeBtn.disabled = false;
  }
});

/* счётчик постов */
document.querySelectorAll('.count-btn').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.count-btn').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    postCount = Number(b.dataset.count);
  });
});

/* ================= журнал ================= */

async function refreshJournal() {
  try {
    const r = await fetch('/api/goals' + (brandState.id ? '?brand=' + brandState.id : ''));
    const data = await r.json();
    const items = data.goals || [];
    journalList.querySelectorAll('.jrow').forEach((n) => n.remove());
    journalEmpty.hidden = items.length > 0;
    items.forEach((g) => {
      const row = el('button', 'jrow');
      row.type = 'button';
      const d = new Date(String(g.created_at || '').replace(' ', 'T'));
      row.appendChild(el('span', 'jdate',
        (isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
        ' · ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))));
      const text = el('span', 'jtext', '# ' + g.id + ' · ' + g.goal_text);
      if (g.source === 'demo') text.appendChild(el('span', 'jsrc', ' · демо'));
      row.appendChild(text);
      /* O52: delete goal (owner only, confirm first) */
      if (myRole === 'owner') {
        const del = el('button', 'jdel', 'Удалить');
        del.type = 'button';
        del.title = 'Удалить цель № ' + g.id;
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!del.dataset.armed) {
            del.dataset.armed = '1';
            del.textContent = 'Точно удалить?';
            del.classList.add('armed');
            setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = 'Удалить'; del.classList.remove('armed'); } }, 4000);
            return;
          }
          del.disabled = true;
          try {
            const r = await fetch('/api/goals/' + g.id, { method: 'DELETE' });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || 'Не удалось удалить');
            if (Number(currentGoalId) === Number(g.id)) { currentGoalId = null; resultRoot.innerHTML = ''; }
            refreshJournal();
          } catch (err) { del.disabled = false; delete del.dataset.armed; del.textContent = 'Удалить'; alert(err.message); }
        });
        row.appendChild(del);
      }
      row.addEventListener('click', () => loadGoal(g.id));
      journalList.appendChild(row);
    });
  } catch (e) { /* журнал не критичен */ }
}

async function loadGoal(id) {
  setStatus('Открываю разбор № ' + id + '…');
  try {
    const r = await fetch('/api/goals/' + id);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Не получилось открыть запись');
    renderResult({ id: data.id, goal: data.goal, source: data.source, createdAt: data.created_at, strategy: data.strategy });
    setStatus('');
  } catch (e) {
    setStatus('');
    showError(e.message);
  }
}

/* ================= отправка цели ================= */

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  stopAllPolling();
  const goal = goalEl.value.trim();
  if (goal.length < 5) {
    showError('Опиши цель хотя бы в нескольких словах — одного предложения достаточно.');
    goalEl.focus();
    return;
  }
  goBtn.disabled = true;
  if (mode.ai === 'demo') setStatus('Собираю разбор (демо-режим, локально)…');
  else startHonestProgress(30, 'Разум думает…');
  try {
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, brand_id: brandState.id })
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data.error || 'Не получилось разобрать цель') + (data.hint ? ' ' + data.hint : ''));
    renderResult(data);
    stopHonestProgress();
    setStatus('Готово. Теперь можно создать посты.');
    postsStatus.textContent = '';
    refreshJournal();
  } catch (err) {
    setStatus('');
    showError(err.message);
  } finally {
    goBtn.disabled = false;
  }
});

/* ================= демо/живой ================= */

demoToggle.addEventListener('click', async () => {
  const enable = mode.ai !== 'demo';
  try {
    const r = await fetch('/api/demo-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enable })
    });
    if (!r.ok) throw new Error('Не получилось переключить режим');
    await refreshHealth();
/* Order 26: plan badge in topbar */
(async () => {
  try {
    const r = await fetch('/api/plan');
    if (!r.ok) return;
    const d = await r.json();
    const names = { start: 'Старт', growth: 'Рост', pro: 'Про', agency: 'Агентство', unlimited: 'Безлимит' };
    const pill = document.getElementById('brandPill');
    if (!pill) return;
    const span = document.createElement('a');
    span.id = 'planBadge';
    span.href = '/pricing';
    span.title = 'Тарифы';
    span.style.cssText = 'font:600 12px/1 inherit;letter-spacing:.02em;padding:8px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--hair);color:var(--muted);text-decoration:none;white-space:nowrap';
    span.textContent = 'Ваш тариф: ' + (names[d.plan] || 'Старт');
    pill.parentNode.insertBefore(span, pill);
  } catch (e) {}
})();
    setStatus(enable ? 'Демо-режим включён: разбор и посты собираются локально, без DeepSeek.' : 'Демо-режим выключен.');
  } catch (e) { showError(e.message); }
});

/* ================= ключ DeepSeek с экрана ================= */

function ensureKeyDialog() {
  let box = document.getElementById('keyBox');
  if (box) return box;
  box = el('div', 'key-box');
  box.id = 'keyBox';
  box.innerHTML =
    '<label class="key-label" for="keyInput">Ключ DeepSeek (виден только на этом компьютере)</label>' +
    '<div class="key-row"><input id="keyInput" class="key-input" type="password" ' +
    'placeholder="sk-..." autocomplete="off" spellcheck="false" />' +
    '<button type="button" class="btn btn-primary" id="keySave">Принять ключ</button></div>' +
    '<p class="key-note">Ключ сохраняется в файл .env рядом с сервером и больше никуда не отправляется. ' +
    'Получить ключ: platform.deepseek.com → API Keys → Create new API key.</p>' +
    '<p class="key-error" id="keyError" role="alert" hidden></p>';
  footerMeta.appendChild(box);
  const input = box.querySelector('#keyInput');
  const err = box.querySelector('#keyError');
  box.querySelector('#keySave').addEventListener('click', async () => {
    err.hidden = true;
    const key = input.value.trim();
    if (!key) { err.textContent = 'Вставь ключ в поле.'; err.hidden = false; return; }
    const btn = box.querySelector('#keySave');
    btn.disabled = true;
    try {
      const r = await fetch('/api/keys/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Не получилось сохранить ключ');
      box.remove();
      keyBtn.hidden = true;
      await refreshHealth();
      setStatus('Ключ принят: мозг и тексты теперь живые. Перегенерируй посты — почувствуй разницу.');
    } catch (e) {
      setMsgHtml(err, e.message);
      err.hidden = false;
    } finally { btn.disabled = false; }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); box.querySelector('#keySave').click(); }
  });
  input.focus();
  return box;
}

let keyBtn = el('button', 'linkish', 'вставить ключ');
keyBtn.type = 'button';
keyBtn.addEventListener('click', ensureKeyDialog);
footerMeta.appendChild(document.createTextNode(' · '));
footerMeta.appendChild(keyBtn);

/* === ключ Pollinations (быстрые картинки, Дверь 4) === */
let pollinationsKeyBtn = el('button', 'linkish', 'быстрые картинки (ключ)');
pollinationsKeyBtn.type = 'button';
pollinationsKeyBtn.addEventListener('click', () => {
  let box = document.getElementById('pollenKeyBox');
  if (box) { box.remove(); return; }
  box = el('div', 'key-box');
  box.id = 'pollenKeyBox';
  box.innerHTML =
    '<label class="key-label" for="pollenKeyInput">Ключ Pollinations (секретный, sk_...)</label>' +
    '<div class="key-row"><input id="pollenKeyInput" class="key-input" type="password" ' +
    'placeholder="sk_..." autocomplete="off" spellcheck="false" />' +
    '<button type="button" class="btn btn-primary" id="pollenKeySave">Включить скорость</button></div>' +
    '<p class="key-note">Ключ берётся на enter.pollinations.ai (раздел API Keys). Сохраняется только в .env на этом компьютере. После вставки картинки пойдут за секунды, а все упавшие вернутся в очередь сами.</p>' +
    '<p class="key-error" id="pollenKeyError" role="alert" hidden></p>';
  footerMeta.appendChild(box);
  const input = box.querySelector('#pollenKeyInput');
  const err = box.querySelector('#pollenKeyError');
  box.querySelector('#pollenKeySave').addEventListener('click', async () => {
    err.hidden = true;
    const key = input.value.trim();
    if (!key) { err.textContent = 'Вставь ключ в поле.'; err.hidden = false; return; }
    const btn = box.querySelector('#pollenKeySave');
    btn.disabled = true;
    try {
      const r = await fetch('/api/keys/pollinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Не получилось сохранить ключ');
      box.remove();
      pollinationsKeyBtn.hidden = true;
      setStatus('Скорость включена! Картинки теперь за секунды, упавшие вернулись в очередь.');
    } catch (e) {
      setMsgHtml(err, e.message);
      err.hidden = false;
    } finally { btn.disabled = false; }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); box.querySelector('#pollenKeySave').click(); }
  });
  input.focus();
});
footerMeta.appendChild(document.createTextNode(' · '));
footerMeta.appendChild(pollinationsKeyBtn);

(async () => {
  try {
    const r = await fetch('/api/keys/pollinations/status');
    const data = await r.json();
    if (data.hasKey) pollinationsKeyBtn.hidden = true;
  } catch (e) { /* не критично */ }
})();

/* если ключ уже есть — кнопку не показываем */
(async () => {
  try {
    const r = await fetch('/api/keys/deepseek/status');
    const data = await r.json();
    if (data.hasKey) keyBtn.hidden = true;
  } catch (e) { /* сервер не отвечает — кнопка останется, не страшно */ }
})();

/* Золотой циферблат: дуга заполняется за ~15 с, в центре — остаток секунд */
function buildDial(totalSec) {
  const total = totalSec || 15;
  const wrap = document.createElement('div');
  wrap.className = 'dial';
  wrap.innerHTML =
    '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle class="dial-bg" cx="50" cy="50" r="45"></circle>' +
    '<circle class="dial-arc" cx="50" cy="50" r="45"></circle></svg>' +
    '<div class="dial-num">' + total + '</div>' +
    '<div class="dial-cap">рисую…</div>';
  const arc = wrap.querySelector('.dial-arc');
  const num = wrap.querySelector('.dial-num');
  const C = 283;
  let passed = 0;
  const timer = setInterval(() => {
    if (!wrap.isConnected) { clearInterval(timer); return; }
    passed++;
    const p = Math.min(0.96, passed / total);
    arc.style.strokeDashoffset = String(C * (1 - p));
    const left = Math.max(1, Math.ceil(total - passed));
    num.textContent = left <= 3 ? '···' : left;
  }, 1000);
  return wrap;
}

/* ================= Дверь 3.2: голос ================= */

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis || null;

function voiceSupported() { return !!SpeechRec; }
function ttsSupported() { return !!synth; }

/* Микрофон: нажал — говоришь, текст льётся в поле. Только по кнопке. */
function setupMic(btn, target, hintEl) {
  if (!voiceSupported()) {
    btn.hidden = true;
    if (hintEl) hintEl.textContent = 'Голос не поддерживается этим браузером — используй Chrome или Edge.';
    return;
  }
  let rec = null;
  let listening = false;
  let wantStop = false;
  let accumulated = ''; /* всё, что уже сказано — копилка, не теряется */

  function startSession() {
    rec = new SpeechRec();
    rec.lang = 'ru-RU';
    rec.interimResults = true;
    rec.continuous = true; /* слушает через паузы, пока сам не остановишь */

    rec.onresult = (ev) => {
      let finalText = '';
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      if (finalText) accumulated = (accumulated + ' ' + finalText).trim();
      const combined = (accumulated + ' ' + interim).trim();
      if (combined) target.value = combined.slice(0, target.maxLength || 2000);
    };

    /* Chrome сам останавливается после длинных пауз — тихо продолжаем сессию,
       копилка текста при этом НЕ сбрасывается */
    rec.onend = () => {
      if (wantStop) {
        listening = false;
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = btn.dataset.origIcon || '🆙';
        if (hintEl && accumulated.trim()) hintEl.textContent = 'Готово — всё сказанное осталось в поле. Проверь и нажми основную кнопку.';
      } else if (listening) {
        try { rec.start(); } catch (e) { /* мгновенный рестарт иногда бросает — не страшно */ }
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        wantStop = true; listening = false;
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = btn.dataset.origIcon || '🆙';
        if (hintEl) hintEl.textContent = 'Микрофон запрещён. Разреши доступ к микрофону в браузере и попробуй снова.';
      } else if (ev.error === 'no-speech') {
        /* тишина — это нормально; сессия перезапустится через onend, текст на месте */
      } else {
        if (hintEl) hintEl.textContent = 'Голос сбоит (' + ev.error + '), продолжаю. Твои слова сохранены.';
      }
    };

    rec.start();
  }

  btn.addEventListener('click', () => {
    if (listening) { wantStop = true; rec && rec.stop(); return; }
    if (synth && synth.speaking) synth.cancel();
    wantStop = false;
    listening = true;
    accumulated = ''; /* новая диктовка — новая копилка (старый текст в поле добавим ниже) */
    if (!btn.dataset.origIcon) btn.dataset.origIcon = btn.innerHTML;
    const existing = target.value.trim();
    if (existing) accumulated = existing; /* накапливаем и на уже написанном */
    btn.setAttribute('aria-pressed', 'true');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>';
    if (hintEl) hintEl.textContent = 'Слушаю… говори, делай паузы, пей кофе. Останов — той же кнопкой.';
    startSession();
  });
}

/* Озвучка: Прослушать / Остановить */
function speakText(text, btn) {
  if (!ttsSupported()) { btn.hidden = true; return; }
  if (synth.speaking) { synth.cancel(); btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Прослушать'; return; }
  const clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'ru-RU';
  const ru = synth.getVoices().find((v) => (v.lang || '').toLowerCase().startsWith('ru'));
  if (ru) u.voice = ru;
  u.rate = 1; u.pitch = 1;
  u.onend = () => { btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Прослушать'; };
  btn.setAttribute('aria-pressed', 'true');
  btn.textContent = 'Остановить';
  synth.speak(u);
}

setupMic($('micQuick'), goalEl, $('micQuickHint'));
setupMic($('micWarm'), $('d_what'), $('micWarmHint'));
setupMic($('micWhere'), $('d_where'), null);
setupMic($('micWho'), $('d_who'), null);
setupMic($('micWant'), $('d_want'), null);

/* ================= Дверь 3.1: тёплый вход ================= */

const warmForm = $('warmForm');
const warmBtn = $('warmBtn');
const warmStatus = $('warmStatus');
const modeSwap = $('modeSwap');
const quickForm = $('askForm');
const photoInput = $('d_photo');
const photoPreview = $('photoPreview');
const photoPreviewPh = $('photoPreviewPh');
const photoBtn = $('photoBtn');
const photoClear = $('photoClear');

function setWarmStatus(text) { warmStatus.textContent = text || ''; }

/* фото: локальный предпросмотр, файл живёт в памяти до отправки */
let warmPhotoFile = null;
photoBtn.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', () => {
  const f = photoInput.files && photoInput.files[0];
  if (!f) return;
  if (f.size > 5 * 1024 * 1024) { setWarmStatus('Фото слишком большое (до 5 МБ).'); return; }
  warmPhotoFile = f;
  photoPreview.src = URL.createObjectURL(f);
  photoPreview.hidden = false;
  photoPreviewPh.hidden = true;
  photoClear.hidden = false;
  setWarmStatus('');
});
photoClear.addEventListener('click', () => {
  warmPhotoFile = null;
  photoInput.value = '';
  photoPreview.hidden = true;
  photoPreviewPh.hidden = false;
  photoClear.hidden = true;
});

/* переключение тёплый/быстрый вход */
let quickMode = false;
modeSwap.addEventListener('click', () => {
  quickMode = !quickMode;
  warmForm.classList.toggle('quick-form-hidden', quickMode);
  quickForm.classList.toggle('quick-form-hidden', !quickMode);
  modeSwap.textContent = quickMode ? 'Рассказать о деле (пять вопросов)' : 'Написать цель одной фразой';
  $('warmIntro').hidden = quickMode;
  if (quickMode) goalEl.focus(); else $('d_what').focus();
});

/* отправка тёплой формы: детали -> /api/analyze (details) */
warmForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  stopAllPolling();
  const details = {
    what: $('d_what').value.trim(),
    where: $('d_where').value.trim(),
    who: $('d_who').value.trim(),
    want: $('d_want').value.trim()
  };
  if (!details.what) {
    showError('Начни с первого вопроса: что ты делаешь? Одной фразы достаточно.');
    $('d_what').focus();
    return;
  }
  warmBtn.disabled = true;
  if (mode.ai === 'demo') setWarmStatus('Думаю над твоим делом (демо)…');
  else startHonestProgress(30, 'Думаю над твоим делом…');
  try {
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details, brand_id: brandState.id })
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data.error || 'Не получилось разобрать') + (data.hint ? ' ' + data.hint : ''));
    /* фото в разборе не участвует пока — карточки и так построятся; пометим цель */
    renderResult(data);
    stopHonestProgress();
    setStatus('Готово. Теперь можно создать посты.');
    postsStatus.textContent = '';
    refreshJournal();
  } catch (err) {
    stopHonestProgress();
    showError(err.message);
  } finally {
    warmBtn.disabled = false;
    setWarmStatus('');
  }
});

/* при открытии быстрой формы старая логика остаётся: form submit -> /api/analyze {goal} */

/* Order 70: schedule popover styles (inject once) */
(function schedStyles() {
  if (document.getElementById('gg-sched-style')) return;
  const st = document.createElement('style');
  st.id = 'gg-sched-style';
  st.textContent = [
    '.sched-pop{position:absolute;bottom:calc(100% + 8px);right:0;background:var(--surface-2,#111216);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:14px;z-index:70;min-width:250px;box-shadow:0 14px 34px rgba(0,0,0,.45);display:none}',
    '.sched-pop.open{display:block}',
    '.sched-pop label{display:block;font-size:12px;color:#A1A1AA;margin-bottom:6px}',
    '.sched-pop input{font:inherit;font-size:13.5px;color:#F4F4F5;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:8px 10px;width:100%;outline:none;color-scheme:dark}',
    '.sched-pop input:focus{border-color:rgba(232,165,79,.5)}',
    '.sched-row{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}',
    '.sched-row button{font:inherit;font-size:12.5px;padding:7px 13px;border-radius:8px;cursor:pointer;background:rgba(255,255,255,.03);color:#C9C9D1;border:1px solid rgba(255,255,255,.14)}',
    '.sched-row button.go{background:linear-gradient(180deg,#F0BC72,#E8A54F 55%,#DF9A48);color:#1B1206;border-color:rgba(255,255,255,.16);font-weight:600}',
    '.sched-err{font-size:12px;color:#E88A6F;margin-top:8px;min-height:1em}',
    '.sched-chip{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;border:1px solid rgba(232,165,79,.35);color:#F3C583;background:rgba(232,165,79,.08)}',
    '.sched-chip.failed{border-color:rgba(232,105,79,.45);color:#E88A6F;background:rgba(232,105,79,.08)}',
    '.post-actions{position:relative}'
  ].join('\n');
  document.head.appendChild(st);
})();

/* старт */
refreshHealth();
loadBrands().then(() => {
  const qp0 = new URLSearchParams(location.search);
  const gq = qp0.get('goal');
  if (gq) { loadGoalFromQuery(gq); }
  const bq = qp0.get('brand');
  if (bq) selectBrand(bq);
});
refreshJournal();
