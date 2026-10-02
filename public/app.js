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
function showError(text) { goalError.textContent = text; goalError.hidden = !text; }
function clearError() { showError(''); }

function paintMode() {
  const label = mode.ai === 'live' ? 'живой' : mode.ai === 'demo' ? 'демо' : 'без ключа';
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

  const tools = el('div', 'post-tools');
  tools.appendChild(el('span', 'post-no', 'Пост № ' + p.id));
  tools.appendChild(imgChip(p.image_status));
  tools.appendChild(el('span', 'spacer'));

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
      postsStatus.textContent = e.message;
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
      postsStatus.textContent = e.message;
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
      postsStatus.textContent = e.message;
      btnPub.textContent = oldLabel;
      btnPub.disabled = false;
    }
  });

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
      postsStatus.textContent = e.message;
      btnDel.disabled = false;
    }
  });

  tools.appendChild(btnSave); tools.appendChild(btnRegen); tools.appendChild(btnImg); tools.appendChild(btnSay); tools.appendChild(btnPub); tools.appendChild(btnDel);

  card.appendChild(imgWrap);
  card.appendChild(body);
  card.appendChild(tools);
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
  stopAllPolling();
  postsRoot.textContent = '';
  posts.forEach((p) => postsRoot.appendChild(renderPostCard(p)));
  posts.forEach((p) => { if (p.image_status === 'pending') pollImage(p.id); });
  updatePostsCount();
}

async function loadPosts(goalId) {
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
  } catch (e) { postsStatus.textContent = e.message; }
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
    postsStatus.textContent = e.message;
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
    const r = await fetch('/api/goals');
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
      body: JSON.stringify({ goal })
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
      err.textContent = e.message;
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
      err.textContent = e.message;
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

  btn.addEventListener('click', () => {
    if (listening) { rec && rec.stop(); return; }
    if (synth && synth.speaking) synth.cancel();
    rec = new SpeechRec();
    rec.lang = 'ru-RU';
    rec.interimResults = true;
    rec.continuous = false;
    const base = target.value ? target.value.trim() + ' ' : '';

    rec.onstart = () => {
      listening = true;
      btn.setAttribute('aria-pressed', 'true');
      btn.textContent = '⏹';
      if (hintEl) hintEl.textContent = 'Слушаю… говорите, я записываю. Нажмите ещё раз, чтобы закончить.';
    };
    rec.onresult = (ev) => {
      let finalText = '';
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      target.value = (base + finalText + interim).trim().slice(0, target.maxLength || 2000);
    };
    rec.onerror = (ev) => {
      listening = false;
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = '🎙';
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        if (hintEl) hintEl.textContent = 'Микрофон запрещён. Разреши доступ к микрофону в браузере и попробуй снова.';
      } else if (ev.error === 'no-speech') {
        if (hintEl) hintEl.textContent = 'Не услышал тебя. Нажми микрофон и скажи ещё раз.';
      } else {
        if (hintEl) hintEl.textContent = 'Голос не сработал (' + ev.error + '). Попробуй ещё раз или напиши.';
      }
    };
    rec.onend = () => {
      listening = false;
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = '🎙';
      if (hintEl && target.value.trim()) hintEl.textContent = 'Готово — проверь текст и нажми основную кнопку.';
    };
    try { rec.start(); }
    catch (e) { if (hintEl) hintEl.textContent = 'Голос занят другим процессом — подожди секунду и нажми снова.'; }
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
      body: JSON.stringify({ details })
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

/* старт */
refreshHealth();
refreshJournal();
