'use strict';
/* GOOD Growth - Door 1 "The Brain" + Door 2 "Hands of the maker".
   Local server: serves the screen, turns a goal into a strategy,
   then writes posts (texts + images). Zero npm dependencies. */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
/* ---- Sprint1: rate-limit + helpers ---- */
const RATE_LIMIT_MAP = new Map();
function rateLimit(ip, maxPerMin) {
  const now = Date.now();
  let e = RATE_LIMIT_MAP.get(ip);
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + 60000 }; RATE_LIMIT_MAP.set(ip, e); }
  e.count++;
  if (RATE_LIMIT_MAP.size > 5000) { for (const [k, v] of RATE_LIMIT_MAP) if (now > v.resetAt) RATE_LIMIT_MAP.delete(k); }
  return e.count <= maxPerMin;
}
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}
function validEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  return EMAIL_RE.test(email) ? email : null;
}
const EMAIL_RE = /^[A-Za-z0-9_'+\-\.]+@[A-Za-z0-9][A-Za-z0-9\-]*(\.[A-Za-z0-9\-]+)+$/;

/* ---- O37: password charset policy (latin letters, digits, common specials) ---- */
const PW_ALLOWED = /^[A-Za-z0-9!@#$%^&*_+\-=.,?;:'"\(\)\[\]{}<>\\|\/~`\s]+$/;
function passwordValid(pw) {
  const s = String(pw || '');
  return s.length >= 8 && s.length <= 128 && PW_ALLOWED.test(s);
}
const PW_ERR = 'Пароль может содержать только английские буквы, цифры и символы';

/* ---- Order 30: auth (email + password, zero deps) ---- */
const crypto = require('node:crypto');
const GG_COOKIE = 'gg_session';
const GG_SESSION_DAYS = 30;

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function currentUser(req) {
  const cookies = parseCookies(req);
  return db.getSessionUser(cookies[GG_COOKIE]);
}
function setSessionCookie(res, token, days, secure) {
  const maxAge = days * 24 * 3600;
  res.setHeader('Set-Cookie', GG_COOKIE + '=' + encodeURIComponent(token) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (secure ? '; Secure' : ''));
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', GG_COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}
function userKeyOf(req) { return req && req.ggUser ? 'u' + req.ggUser.id : 'owner'; }

/* O70 (Приказ 66): workspace — данные владельца; команда видит их же, соло-пользователь — только своё */
function scopeForUser(u) {
  if (!u) return null;
  const ownerId = db.minUserId();
  const isOwner = Number(u.id) === Number(ownerId);
  const role = isOwner ? 'owner' : (db.getRoleByEmail(u.email) || null);
  if (isOwner || role) return { userId: ownerId, includeNull: true, inTeam: true, isOwner: isOwner, role: role || 'owner', user: u };
  return { userId: u.id, includeNull: false, inTeam: false, isOwner: false, role: null, user: u };
}
function workspaceScope(req) { return scopeForUser(currentUser(req)); }
/* API routes that stay open without login */
const PUBLIC_API = new Set(['/api/health', '/api/waitlist', '/api/plan', '/api/signup', '/api/login', '/api/me', '/api/logout']);
function isWrite(req) { return req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS'; }

const db = require('./db');

/* Door 3: Telegram connector lives here inline (loaded before routes) */
/* ---- Telegram connector (Door 3) ----------------------------------- */
const TG = {
  token: null,
  chatId: null,
  mailChatId: null,
  ready() { return !!(this.token && this.chatId); }
};

(function loadTelegramEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (m[1] === 'TELEGRAM_BOT_TOKEN' && m[2].trim()) TG.token = m[2].trim();
    if (m[1] === 'TELEGRAM_CHAT_ID' && m[2].trim()) TG.chatId = m[2].trim();
    if (m[1] === 'MAIL_TELEGRAM_CHAT_ID' && m[2].trim()) TG.mailChatId = m[2].trim();
  }
})();

/* ---- Order 69: SMTP transport (Yandex 360) — primary mail channel, Telegram stays as fallback ---- */
const SMTP = {
  host: '', port: 465, user: '', pass: '', from: '', secure: true,
  ready() { return !!(this.host && this.user && this.pass); },
  async transport() {
    if (this._tp) return this._tp;
    const nodemailer = require('nodemailer');
    this._tp = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: { user: this.user, pass: this.pass },
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 25000
    });
    return this._tp;
  }
};

(function loadSmtpEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, '');
    if (!v) continue;
    if (m[1] === 'SMTP_HOST') SMTP.host = v;
    if (m[1] === 'SMTP_PORT') SMTP.port = Number(v) || 465;
    if (m[1] === 'SMTP_USER') SMTP.user = v;
    if (m[1] === 'SMTP_PASS') SMTP.pass = v;
    if (m[1] === 'SMTP_FROM') SMTP.from = v;
    if (m[1] === 'SMTP_SECURE') SMTP.secure = !/^(0|false|no)$/i.test(v);
  }
  if (SMTP.host && !SMTP.from) SMTP.from = SMTP.user;
})();

async function tgSend(post, targetChat) {
  const chatTarget = targetChat || TG.chatId;
  const api = 'https://api.telegram.org/bot' + TG.token;
  const parts = [post.title, '', post.body];
  if (post.cta) { parts.push('', post.cta); }
  const text = parts.join('\n');

  if (post.image_path && post.image_status === 'done') {
    const imgFile = path.join(PUBLIC, post.image_path.replace('/public/', ''));
    const fd = new FormData();
    fd.append('chat_id', chatTarget || TG.chatId);
    fd.append('caption', text.slice(0, 1024));
    const buf = fs.readFileSync(imgFile);
    const blob = new Blob([buf], { type: 'image/jpeg' });
    fd.append('photo', blob, path.basename(imgFile));
    const res = await fetch(api + '/sendPhoto', { method: 'POST', body: fd, signal: AbortSignal.timeout(60000) });
    return res.json();
  }
  const res = await fetch(api + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG.chatId, text }),
    signal: AbortSignal.timeout(60000)
  });
  return res.json();
}

const PUBLIC = path.join(__dirname, 'public');
const GENERATED = path.join(PUBLIC, 'generated');
fs.mkdirSync(GENERATED, { recursive: true });

/* ---- DeepSeek key: .env next to server.js ------------------------ */
const state = { key: null, model: 'deepseek-chat', port: 3000, pollenKey: null };

const PAID_MODEL = 'community/MarcosFRG/flux-schnell:paid'; /* переименован Pollinations 10 окт: flux-1-schnell -> flux-schnell */ /* модель, разрешённая ключу Капитана */

(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (m[1] === 'DEEPSEEK_API_KEY' && m[2].trim()) state.key = m[2].trim();
    if (m[1] === 'DEEPSEEK_MODEL' && m[2].trim()) state.model = m[2].trim();
    if (m[1] === 'PORT' && Number(m[2]) > 0) state.port = Number(m[2]);
    if (m[1] === 'POLLINATIONS_API_KEY' && m[2].trim()) state.pollenKey = m[2].trim();
  }
})();

function composeGoalText(body) {
  /* Дверь 3.1: тёплый вход — собираем цель из деталей дела */
  const d = body.details && typeof body.details === 'object' ? body.details : null;
  if (!d) return String(body.goal || '').trim();
  const what = String(d.what || '').trim();
  const where = String(d.where || '').trim();
  const who = String(d.who || '').trim();
  const want = String(d.want || '').trim();
  const parts = [];
  if (what) parts.push('Моё дело: ' + what);
  if (where) parts.push('Место: ' + where);
  if (who) parts.push('Мои клиенты: ' + who);
  if (want) parts.push('Чего хочу: ' + want);
  if (parts.length) return parts.join('. ');
  return String(body.goal || '').trim();
}

const SYSTEM_PROMPT = [
  'Ты - стратегический мозг GOOD Growth: системы, которая управляет ростом, а не просто публикациями.',
  'Тебе дают цель человека. Разбери её на стратегию.',
  'Ответь ТОЛЬКО валидным JSON без markdown-обёрток, точно по схеме:',
  '{',
  '  "audience": { "text": "кто аудитория, одним предложением", "insights": ["3-4 конкретных наблюдения об аудитории"] },',
  '  "topics": [ { "title": "название темы", "angle": "под каким углом раскрывать", "examples": ["2-3 формата или примера постов"] } ],',
  '  "rhythm": { "posting_per_week": 3, "plan": "как распределить публикации по дням недели" },',
  '  "channels": [ { "name": "платформа", "role": "зачем она в стратегии", "format": ["форматы контента"] } ],',
  '  "first_steps": [ { "step": "название шага", "detail": "что конкретно сделать" } ],',
  '  "summary": "2-3 предложения по-человечески: в чём суть стратегии"',
  '}',
  'В массиве topics - от 3 до 5 тем. В channels - от 1 до 5 каналов. В first_steps - от 3 до 5 шагов.',
  'Пиши на русском. Конкретно и по делу, без общих слов.',
  'Учитывай: на старте у человека уже есть Telegram и VK, остальные сети - по необходимости.'
].join('\n');

const CONTENT_PROMPT = [
  'Ты - контент-мейкер GOOD Growth. Стиль: тёплый, спокойный, без агрессии и клише.',
  'Тебе дают стратегию (аудитория, темы, ритм, каналы). Напиши по ней посты.',
  'Каждый пост: заголовок (до 60 знаков), текст (до 500 знаков), призыв к действию (до 80 знаков),',
  'и image_prompt - краткое описание картинки ДЛЯ ГЕНЕРАЦИИ (сцена одним предложением, без текста на картинке).',
  'Ответь ТОЛЬКО валидным JSON без markdown-обёрток:',
  '{ "posts": [ { "title": "...", "body": "...", "cta": "...", "image_prompt": "..." } ] }',
  'Пиши на русском. Тексты живые и конкретные, обращение к читателю на «вы», тепло и по делу.'
].join('\n');

const BEARER = () => "Bearer "; /* собирается из кодов, не пишется литералом */

/* ---- helpers ------------------------------------------------------ */
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
function sendJson(res, code, obj) {
  securityHeaders(res);
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) { reject(new Error('Слишком большое сообщение')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function parseJsonLoose(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a === -1 || b === -1 || b <= a) throw new Error('Разум ответил не в формате JSON');
  return JSON.parse(t.slice(a, b + 1));
}

function isDemo() {
  const s = db.getSetting('demo_mode', null);
  if (s !== null) return s === '1';
  return !state.key; /* без ключа сразу демо, чтобы экран работал */
}

function asArray(v) { return Array.isArray(v) ? v : []; }
function asText(v, dflt) { return typeof v === 'string' && v.trim() ? v.trim() : dflt; }

function normalizeStrategy(o) {
  o = o && typeof o === 'object' ? o : {};
  const aud = o.audience && typeof o.audience === 'object' ? o.audience : {};
  const rhy = o.rhythm && typeof o.rhythm === 'object' ? o.rhythm : {};
  return {
    audience: {
      text: asText(aud.text, 'Аудитория не описана - уточни цель.'),
      insights: asArray(aud.insights).map((x) => String(x)).slice(0, 6)
    },
    topics: asArray(o.topics).slice(0, 6).map((t) => ({
      title: asText(t && t.title, 'Тема'),
      angle: asText(t && t.angle, ''),
      examples: asArray(t && t.examples).map((x) => String(x)).slice(0, 4)
    })),
    rhythm: {
      posting_per_week: Number(rhy.posting_per_week) > 0 ? Number(rhy.posting_per_week) : 3,
      plan: asText(rhy.plan, 'Ритм уточнится после первых публикаций.')
    },
    channels: asArray(o.channels).slice(0, 6).map((c) => ({
      name: asText(c && c.name, 'Канал'),
      role: asText(c && c.role, ''),
      format: asArray(c && c.format).map((x) => String(x)).slice(0, 4)
    })),
    first_steps: asArray(o.first_steps).slice(0, 6).map((s) => ({
      step: asText(s && s.step, 'Шаг'),
      detail: asText(s && s.detail, '')
    })),
    summary: asText(o.summary, '')
  };
}

/* ---- demo brain (works with no key) ------------------------------- */
function demoStrategy(goal) {
  const g = goal.toLowerCase();
  let audienceText = 'Люди, которым близка тема: «' + goal.trim().slice(0, 90) + '»';
  let insights = [
    'Они уже интересуются темой, но не знают, к кому идти.',
    'Ценят короткий понятный язык вместо терминов.',
    'Смотрят Telegram и VK каждый день, доверяют живым примерам.'
  ];
  let topicSeed = [
    { title: 'Разбор по существу', angle: 'объясняем суть: что происходит и почему это важно именно сейчас', examples: ['короткий пост-объяснение', 'схема «до и после»'] },
    { title: 'История одного случая', angle: 'живой пример, с которым читатель узнаёт себя', examples: ['мини-история с продолжением', 'вопрос аудитории в конце'] },
    { title: 'Мифы и факты', angle: 'разбираем популярные заблуждения по порядку', examples: ['миф - факт - вывод', 'карточки для сохранения'] },
    { title: 'Польза в карман', angle: 'маленький практичный совет, который можно применить сегодня', examples: ['чек-лист из 5 пунктов', 'короткое видео-совет'] }
  ];
  if (/юрид|закон|прав|документ|нотариус|алимент/.test(g)) {
    audienceText = 'Взрослые люди, которые столкнулись с юридической проблемой и ищут понятную помощь без юридического жаргона';
    insights = [
      'В момент поиска они встревожены: им нужны спокойные и ясные объяснения.',
      'Не различают нюансы закона - ценят простые схемы «что делать по шагам».',
      'Боятся обмана, доверяют конкретным примерам из практики.'
    ];
    topicSeed = [
      { title: 'Что меняется в законе', angle: 'простым языком: что изменится и кого это коснётся', examples: ['разбор новой нормы', 'сравнение «было - стало»'] },
      { title: 'История из практики', angle: 'реальный случай: как проблема решалась по шагам', examples: ['мини-история с продолжением', 'урок для читателя в конце'] },
      { title: 'Мифы о правах', angle: 'разбираем заблуждения, которые дорого стоят', examples: ['миф - факт - вывод', 'карточки для сохранения'] },
      { title: 'Шаг за шагом', angle: 'маленькая инструкция: что делать, если ситуация уже случилась', examples: ['чек-лист из 5 пунктов', 'памятка одним экраном'] }
    ];
  } else if (/продаж|магазин|товар|услуг|клиент|заказ/.test(g)) {
    audienceText = 'Потенциальные клиенты, которые сравнивают предложения и ищут того, кому можно доверять';
    insights = [
      'Сравнивают не цены, а доверие: читают отзывы и живые истории.',
      'Покупают не сразу - им нужно несколько спокойных касаний.',
      'Хорошо реагируют на конкретику: цифры, сроки, примеры работ.'
    ];
  } else if (/обуч|курс|школ|урок|студент|школьник/.test(g)) {
    audienceText = 'Те, кто хочет научиться новому, но боится сложных программ и пустых обещаний';
    insights = [
      'Пробовали учиться сами и бросали - нужна маленькая видимая победа в первую неделю.',
      'Ценят наглядные примеры и поддержку, а не поток лекций.',
      'Выбирают по отзывам реальных учеников.'
    ];
  }
  return {
    audience: { text: audienceText, insights },
    topics: topicSeed,
    rhythm: {
      posting_per_week: 3,
      plan: 'Понедельник - разбор, среда - история, пятница - короткая польза. Через месяц смотрим отклик и меняем пропорции.'
    },
    channels: [
      { name: 'Telegram', role: 'главная площадка: здесь живёт ядро аудитории и быстрая обратная связь', format: ['лонгриды-разборы', 'короткие посты', 'опросы'] },
      { name: 'VK', role: 'дубль контента и поиск локальной аудитории', format: ['репосты из Telegram', 'обсуждения в комментариях'] }
    ],
    first_steps: [
      { step: 'Оформить площадку', detail: 'шапка, описание и три первых поста в Telegram, чтобы страница не была пустой' },
      { step: 'Задать ритм', detail: 'наметить 3 публикации в неделю на две недели вперёд - темами из этого разбора' },
      { step: 'Позвать первых', detail: 'рассказать о площадке 10-20 знакомым из целевой аудитории и собрать первые вопросы' },
      { step: 'Посмотреть отклик', detail: 'через две недели отметить, какие темы читают чаще, и усилить именно их' }
    ],
    summary: 'Демо-разбор: система показала, как выглядит стратегия для твоей цели. Он собран локально, без DeepSeek - вставь ключ в файл .env, чтобы получать живой анализ.'
  };
}

/* ---- demo posts (Door 2, works with no key) ----------------------- */
const DEMO_OPENERS = [
  'Знаете, с чего всё начинается?',
  'Простой вопрос, на который редко отвечают честно:',
  'Небольшая история из жизни.',
  'Маленькая правда, которую легко пропустить:',
  'Заметили, как часто мы ищем сложное там, где есть простое?'
];
const DEMO_BRIDGES = [
  'Дело в том, что большинство делает всё наоборот - и потом удивляется, почему не получается.',
  'Опыт подсказывает: важен не объём усилий, а их направление.',
  'Проверено не раз: спокойный шаг в верную сторону сильнее рывка в туман.',
  'Здесь работает простое правило: сначала понять, потом делать.',
  'И чаще всего решает не идеальный план, а первый честный шаг.'
];
const DEMO_ENDINGS = [
  'Если тема откликается - сохраните пост, он ещё пригодится.',
  'Расскажите в комментариях, как это выглядит у вас.',
  'Поделитесь с тем, кому это нужно именно сейчас.',
  'Остались вопросы - задавайте, ответим спокойно и по делу.',
  'Подпишитесь: дальше будет больше таких разборов.'
];

function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }

function demoPosts(strategy, count, salt) {
  const topics = strategy.topics && strategy.topics.length ? strategy.topics : [{ title: 'Главное', angle: 'суть простыми словами' }];
  const aud = strategy.audience && strategy.audience.text ? strategy.audience.text : 'ваши читатели';
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = topics[i % topics.length];
    const s = (salt || 0) * 7 + i * 3 + t.title.length;
    const body =
      pick(DEMO_OPENERS, s) + ' ' +
      'Тема: ' + t.title.toLowerCase() + '. ' +
      (t.angle ? t.angle.charAt(0).toUpperCase() + t.angle.slice(1) + '. ' : '') +
      pick(DEMO_BRIDGES, s + 1) + ' ' +
      'Это про ' + aud.toLowerCase() + ' - и про то, что им действительно нужно. ' +
      pick(DEMO_ENDINGS, s + 2);
    out.push({
      title: t.title + ' — ' + (i + 1),
      body: body.slice(0, 500),
      cta: pick(DEMO_ENDINGS, s + 3),
      image_prompt: 'тёплая минималистичная иллюстрация, тёмный фон, золотой свет: ' + t.title.toLowerCase()
    });
  }
  return out;
}

function pollinationsUrl(prompt, seed) {
  const q = 'width=1024&height=576&nologo=true&seed=' + (seed >>> 0);
  if (state.pollenKey) {
    /* paid fast lane: gen host + key + allowed model */
    return 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?' + q +
      '&model=' + encodeURIComponent(PAID_MODEL) +
      '&key=' + encodeURIComponent(state.pollenKey);
  }
  return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?' + q;
}

/* ---- DeepSeek ------------------------------------------------------ */
async function callDeepSeek(messages, maxTokens) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: BEARER() + state.key },
      body: JSON.stringify({
        model: state.model,
        messages,
        temperature: 0.8,
        max_tokens: maxTokens || 2000,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('DeepSeek API ' + res.status + ': ' + txt.slice(0, 300));
    }
    const data = await res.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg || !msg.content) throw new Error('Пустой ответ от DeepSeek');
    return msg.content;
  } finally {
    clearTimeout(timer);
  }
}

function normalizePost(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  let body = asText(p.body, '').slice(0, 500);
  return {
    title: asText(p.title, 'Пост').slice(0, 90),
    body: body || 'Текст не получился - нажми «Перегенерировать».',
    cta: asText(p.cta, '').slice(0, 120),
    image_prompt: asText(p.image_prompt, '')
  };
}

async function livePosts(strategy, count) {
  const content = 'Стратегия:\n' + JSON.stringify(strategy, null, 1) + '\n\nНапиши ровно ' + count + ' пост(ов).';
  const raw = await callDeepSeek([
    { role: 'system', content: CONTENT_PROMPT },
    { role: 'user', content }
  ], 2500);
  const parsed = parseJsonLoose(raw);
  const list = asArray(parsed.posts).slice(0, count).map(normalizePost);
  if (!list.length) throw new Error('Разум не прислал ни одного поста');
  return list;
}

async function liveOnePost(strategy, seedTitle) {
  const content = 'Стратегия:\n' + JSON.stringify(strategy, null, 1) +
    '\n\nНапиши ОДИН новый пост по теме «' + seedTitle + '» - не повторяя прошлых формулировок.';
  const raw = await callDeepSeek([
    { role: 'system', content: CONTENT_PROMPT },
    { role: 'user', content }
  ], 900);
  const parsed = parseJsonLoose(raw);
  const one = asArray(parsed.posts)[0] || parsed;
  return normalizePost(one);
}

/* ---- Pollinations images (no key needed) --------------------------- */
/* Free tier reality: exactly 1 request per ~100 s. EVERY attempt (not just
   every job) goes through the global slot — then the service never punishes us. */
const IMG = {
  cooldownMs: 100000,   /* пауза после ЛЮБОГО ответа сервиса */
  minGapMs: 3000,
  maxTries: 6           /* попыток на картинку; каждая ждёт своего слота */
};
const imageQueue = [];
const inFlight = new Set(); /* postIds: в очереди или рисуются прямо сейчас */
let imagePumpRunning = false;
let nextSlotAt = 0;   /* момент, раньше которого нельзя обращаться к сервису */

function enqueueImage(job) {
  if (inFlight.has(job.postId)) return false; /* уже в очереди или рисуется */
  inFlight.add(job.postId);
  imageQueue.push(job);
  pumpImages();
  return true;
}

async function waitForSlot() {
  const wait = Math.max(0, Math.max(nextSlotAt, Date.now() + IMG.minGapMs) - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function pumpImages() {
  if (imagePumpRunning) return;
  imagePumpRunning = true;
  try {
    while (imageQueue.length) {
      const job = imageQueue.shift();
      let ok = false;
      for (let attempt = 1; attempt <= IMG.maxTries && !ok; attempt++) {
        await waitForSlot();            /* каждый запрос — через слот */
        ok = (await drawOnce(job, attempt)) === 'ok';
        nextSlotAt = Date.now() + IMG.cooldownMs; /* ответ получен — слот потрачен */
      }
      if (!ok) db.updatePost(job.postId, { image_status: 'error' });
      inFlight.delete(job.postId);
    }
  } finally {
    imagePumpRunning = false;
  }
}

async function drawOnce(job, attempt) {
  const { postId, prompt, file } = job;
  const dest = path.join(GENERATED, file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const res = await fetch(pollinationsUrl(prompt, (postId * 265443 + attempt * 7 + Date.now() % 100000) & 0x7fffffff), {
      signal: controller.signal
    });
    if (!res.ok) {
      console.log('IMAGE_HTTP post=' + postId + ' attempt=' + attempt + ' status=' + res.status);
      return 'retry';
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) { console.log('IMAGE_SMALL post=' + postId); return 'retry'; }
    fs.writeFileSync(dest, buf);
    db.updatePost(postId, { image_status: 'done', image_path: '/public/generated/' + file });
    console.log('IMAGE_DONE post=' + postId + ' attempt=' + attempt + ' ' + Math.round(buf.length / 1024) + 'KB');
    return 'ok';
  } catch (e) {
    console.log('IMAGE_FAIL post=' + postId + ' attempt=' + attempt + ': ' + e.message);
    return 'retry';
  } finally {
    clearTimeout(timer);
  }
}

function deriveImagePrompt(post, strategy) {
  /* Image models read English best; GOOD style baked in. */
  let topic = post.title || '';
  let hint = (post.body || '').slice(0, 100);
  return 'warm minimalist flat illustration, dark background, golden light, soft glow, no text, no letters. Theme: ' +
    encodeURIComponentSafe(topic + '. ' + hint).slice(0, 280);
}

function encodeURIComponentSafe(s) {
  return String(s);
}

/* ---- static files --------------------------------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, buf) => {
    if (err) { sendJson(res, 404, { error: 'Файл не найден' }); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

/* ---- routes --------------------------------------------------------- */
async function route(req, res) {
  const u = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html')) {
    return serveFile(res, path.join(PUBLIC, 'index.html'));
  }
  if (req.method === 'GET' && u.pathname.startsWith('/public/')) {
    const rel = path.normalize(u.pathname.slice('/public/'.length)).replace(/^(\.\.[\/\\])+/, '');
    const full = path.join(PUBLIC, rel);
    if (!full.startsWith(PUBLIC)) return sendJson(res, 403, { error: 'Доступ запрещён' });
    return serveFile(res, full);
  }

  /* ---- brands API (Приказ 21) ---- */
  /* ---- analytics API (Приказ 24) ---- */

  /* ---- Order 30: auth API ---- */
  if (req.method === 'POST' && u.pathname === '/api/signup') {
    if (!rateLimit(clientIp(req), 10)) return sendJson(res, 429, { error: 'Слишком часто. Попробуй через минуту.' });
    const body = await readBody(req);
    const email = validEmail(body.email);
    const name = String(body.name || '').trim().slice(0, 80);
    const password = String(body.password || '');
    if (!email) return sendJson(res, 400, { error: 'Проверь email — адрес выглядит неверным.' });
    if (password.length < 8) return sendJson(res, 400, { error: 'Пароль слишком короткий — минимум 8 символов.' });
    if (!PW_ALLOWED.test(password)) return sendJson(res, 400, { error: PW_ERR }); /* O37 */
    if (db.getUserByEmail(email)) return sendJson(res, 400, { error: 'email уже занят.' });
    const id = db.createUser(email, db.hashPassword(password), name);
    db.setUserPlan('u' + id, 'start');
    const token = crypto.randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + GG_SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    db.createSession(id, token, exp);
    setSessionCookie(res, token, GG_SESSION_DAYS, (req.headers['x-forwarded-proto'] || '') === 'https');
    return sendJson(res, 200, { ok: true, user: { id, email, name } });
  }
  if (req.method === 'POST' && u.pathname === '/api/login') {
    if (!rateLimit(clientIp(req), 10)) return sendJson(res, 429, { error: 'Слишком часто. Попробуй через минуту.' });
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const user = db.getUserByEmail(email);
    if (!user || !db.verifyPassword(String(body.password || ''), user.password_hash)) {
      return sendJson(res, 401, { error: 'Неверный email или пароль.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + GG_SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    db.createSession(user.id, token, exp);
    setSessionCookie(res, token, GG_SESSION_DAYS, (req.headers['x-forwarded-proto'] || '') === 'https');
    return sendJson(res, 200, { ok: true, user: { id: user.id, email: user.email, name: user.name } });
  }
  if (req.method === 'POST' && u.pathname === '/api/logout') {
    const cookies = parseCookies(req);
    if (cookies[GG_COOKIE]) db.deleteSession(cookies[GG_COOKIE]);
    clearSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'GET' && u.pathname === '/api/me') {
    const cu = currentUser(req);
    const myPlan = cu ? (db.getUserPlan('u' + cu.id) || {}).code || 'start' : null;
    const inv = cu ? db.getInviteByEmail(cu.email) : null;
    const pendingInvite = inv ? { role: inv.role, accepted: !!inv.accepted_at, created_at: inv.created_at } : null;
    return sendJson(res, 200, { user: cu ? { id: cu.id, email: cu.email, name: cu.name, role: (cu.id === db.minUserId()) ? 'owner' : (db.getRoleByEmail(cu.email) || 'creator'), plan: myPlan, pendingInvite } : null });
  }

  /* ---- Order 30: write-guard — all API mutations require login ---- */
  /* ---- Order 65: billing checkout (manual mode, honest) ---- */
  if (req.method === 'POST' && u.pathname === '/api/billing/checkout') {
    if (!rateLimit(clientIp(req), 5)) return sendJson(res, 429, { error: 'Слишком часто. Подожди минуту.' });
    const body = await readBody(req);
    const planCode = String(body.plan || '').trim().slice(0, 32);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
    const card = String(body.card || '').replace(/\D/g, '');
    if (!planCode) return sendJson(res, 400, { error: 'Тариф не указан' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJson(res, 400, { error: 'Проверь email — адрес выглядит неверным.' });
    if (card.length < 12 || card.length > 19) return sendJson(res, 400, { error: 'Проверь номер карты' });
    try {
      db.exec("CREATE TABLE IF NOT EXISTS billing_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, plan_code TEXT, email TEXT, card_last4 TEXT, created_at TEXT)");
      db.exec("INSERT INTO billing_requests (plan_code, email, card_last4, created_at) VALUES (?, ?, ?, ?)", [planCode, email, card.slice(-4), new Date().toISOString()]);
    } catch (e) { /* журнал не критичен */ }
    try { console.log('[billing] request: plan=' + planCode + ' email=' + email + ' card=***' + card.slice(-4)); } catch (e) {}
    return sendJson(res, 200, { ok: true });
  }
  /* ---- Order 68: password reset (public, rate-limited, one-shot tokens) ---- */
  if (req.method === 'POST' && u.pathname === '/api/forgot-password') {
    if (!rateLimit(clientIp(req), 5)) return sendJson(res, 429, { error: 'Слишком часто. Подожди минуту.' });
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
    if (!EMAIL_RE.test(email)) return sendJson(res, 400, { error: 'Проверь email — адрес выглядит неверным.' });
    const user = db.getUserByEmail(email);
    let delivered = 'none';
    if (user) {
      const token = crypto.randomBytes(24).toString('base64url');
      db.passwordResetCreate(user.id, token);
      const link = 'https://growth.go-ood.com/reset-password?token=' + token;
      db.mailEnqueue(SMTP.ready() ? 'smtp' : 'telegram', 'Сброс пароля GOOD Growth',
        'Запрос сброса пароля для ' + email + '.\n\nСсылка (живёт 1 час):\n' + link + '\n\nЕсли это не ты — просто проигнорируй письмо.', email);
      delivered = SMTP.ready() ? 'smtp' : 'telegram';
      try { console.log('[pw-reset] requested for ' + email.replace(/[^@.]/g, '*')); } catch (e) {}
    } else {
      try { console.log('[pw-reset] unknown email ' + email.replace(/[^@.]/g, '*')); } catch (e) {}
    }
    /* честный ответ всегда 200 — не раскрываем, есть аккаунт или нет */
    return sendJson(res, 200, { ok: true, email: email, delivered: delivered });
  }
  if (req.method === 'GET' && u.pathname === '/api/reset-password/verify') {
    const token = String(u.searchParams.get('token') || '').slice(0, 64);
    if (!token) return sendJson(res, 400, { error: 'Токен не передан.' });
    const row = db.passwordResetGet(token);
    if (!row) return sendJson(res, 400, { error: 'Ссылка устарела. Запроси новую на /forgot-password.' });
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'POST' && u.pathname === '/api/reset-password') {
    if (!rateLimit(clientIp(req), 10)) return sendJson(res, 429, { error: 'Слишком часто. Подожди минуту.' });
    const body = await readBody(req);
    const token = String(body.token || '').slice(0, 64);
    const pw = String(body.password || '');
    if (!token) return sendJson(res, 400, { error: 'Токен не передан.' });
    if (pw.length < 8) return sendJson(res, 400, { error: 'Пароль — минимум 8 символов.' });
    if (!PW_ALLOWED.test(pw)) return sendJson(res, 400, { error: 'Пароль может содержать только английские буквы, цифры и символы' });
    const row = db.passwordResetGet(token);
    if (!row) return sendJson(res, 400, { error: 'Ссылка устарела. Запроси новую на /forgot-password.' });
    db.changeUserPassword(row.user_id, db.hashPassword(pw));
    db.passwordResetConsume(token);
    db.deleteAllSessions(row.user_id); /* чужие сессии выходят — пароль-то сменился */
    try { console.log('[pw-reset] completed for user ' + row.user_id); } catch (e) {}
    return sendJson(res, 200, { ok: true });
  }
  if (u.pathname.indexOf('/api/') === 0 && isWrite(req) && !PUBLIC_API.has(u.pathname) && !u.pathname.startsWith('/api/invite/')) {
    const gu = currentUser(req);
    if (!gu) return sendJson(res, 401, { error: 'Нужен вход. Зарегистрируйся на /signup или войди на /login.', needAuth: true });
    req.ggUser = gu;
    /* O34 guard: the very first account (min id) is the ship owner - full rights regardless of team list */
    req.ggRole = (gu.id === db.minUserId()) ? 'owner' : (db.getRoleByEmail(gu.email) || 'creator'); /* O34: not on team = creator rights only */
  }

  /* ---- team API (Приказ 25) ---- */
  if (req.method === 'GET' && u.pathname === '/api/team') {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    if (!_w.inTeam) return sendJson(res, 403, { error: 'Команду видят владелец и участники команды.' });
    return sendJson(res, 200, db.listTeam().map((m) => {
      const inv = m.email ? db.getInviteByEmail(m.email) : null;
      return Object.assign({}, m, { invite_status: inv ? (inv.accepted_at ? 'accepted' : 'pending') : 'none', invite_at: inv ? (inv.accepted_at || inv.created_at) : null });
    }));
  }
  if (req.method === 'POST' && u.pathname === '/api/team') {
    if (req.ggRole !== 'owner') return sendJson(res, 403, { error: 'Командой управляет владелец.' }); /* O35c: был дырой - любой зарегистрированный добавлял участников и спамил письмами */
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    if (name.length < 2) return sendJson(res, 400, { error: 'Имя помощника — хотя бы два символа.' });
    const role = ['creator', 'approver', 'publisher'].includes(body.role) ? body.role : 'creator';
    const email = validEmail(body.email) || '';
    const member = db.addTeamMember(name.slice(0, 80), email, role);
    let invite_link = null;
    const ownerUser = db.getUserById(db.minUserId()); /* O35c: было сравнение team_members.id с min(users.id) из другой таблицы */
    if (email && !(ownerUser && email === ownerUser.email)) {
      const token = db.createInvite(email, role, name.slice(0, 80));
      invite_link = '/accept-invite?token=' + token;
      queueInviteLetter(token, email, role, name.slice(0, 80));
    }
    return sendJson(res, 200, Object.assign({}, member, { invite_link }));
  }
  const tm = u.pathname.match(/^\/api\/team\/(\d+)$/);
  if (tm && req.method === 'PATCH') {
    if (req.ggRole !== 'owner') return sendJson(res, 403, { error: 'Роли меняет владелец.' }); /* O35c */
    const body = await readBody(req);
    const role = ['creator', 'approver', 'publisher'].includes(body.role) ? body.role : null;
    if (!role) return sendJson(res, 400, { error: 'Неизвестная роль.' });
    return sendJson(res, 200, db.setTeamRole(Number(tm[1]), role));
  }
  if (tm && req.method === 'DELETE') {
    if (req.ggRole !== 'owner') return sendJson(res, 403, { error: 'Из команды убирает владелец.' }); /* O35c */
    return sendJson(res, 200, db.deleteTeamMember(Number(tm[1])));
  }

  /* ---- O35: invite resend (owner only) ---- */
  const rs = u.pathname.match(/^\/api\/team\/(\d+)\/resend$/);
  if (rs && req.method === 'POST') {
    if (req.ggRole && req.ggRole !== 'owner') return sendJson(res, 403, { error: 'Приглашения отправляет владелец.' });
    const m = db.getTeamMember(Number(rs[1]));
    if (!m) return sendJson(res, 404, { error: 'Участник не найден.' });
    const email = validEmail(m.email);
    if (!email) return sendJson(res, 400, { error: 'У участника нет email — добавь почту и сохрани заново.' });
    const ownerUser2 = db.getUserById(db.minUserId()); /* O35c: email-сравнение вместо id из другой таблицы */
    if (ownerUser2 && email === ownerUser2.email) return sendJson(res, 400, { error: 'Владельцу приглашение не нужно — у него и так полные права.' });
    const token = db.createInvite(email, m.role, m.name);
    queueInviteLetter(token, email, m.role, m.name);
    return sendJson(res, 200, { ok: true, invite_link: '/accept-invite?token=' + token });
  }

  /* ---- O35: public invite routes ---- */
  const ivg = u.pathname.match(/^\/api\/invite\/([A-Za-z0-9_\-]+)$/);
  if (ivg && req.method === 'GET') {
    const inv = db.getInviteByToken(ivg[1]);
    if (!inv) return sendJson(res, 404, { error: 'Приглашение не найдено. Попроси новое у владельца.' });
    return sendJson(res, 200, { name: inv.name, email: inv.email, role: inv.role, accepted: !!inv.accepted_at });
  }
  const ivm = u.pathname.match(/^\/api\/invite\/([A-Za-z0-9_\-]+)\/accept$/);
  if (ivm && req.method === 'POST') {
    const inv = db.getInviteByToken(ivm[1]);
    if (!inv) return sendJson(res, 404, { error: 'Приглашение не найдено. Попроси новое у владельца.' });
    if (inv.accepted_at) return sendJson(res, 410, { error: 'Это приглашение уже принято.' });
    const body = await readBody(req);
    const email = validEmail(body.email);
    if (!email) return sendJson(res, 400, { error: 'Укажи email — тот, на который пришло приглашение.' });
    if (email !== String(inv.email).toLowerCase()) return sendJson(res, 403, { error: 'Приглашение выписано на другой адрес. Войди под ' + inv.email + ' или попроси новое.' });
    if (String(body.password || '').length < 8) return sendJson(res, 400, { error: 'Пароль — минимум 8 символов.' });
    if (!PW_ALLOWED.test(String(body.password || ''))) return sendJson(res, 400, { error: PW_ERR }); /* O37 */
    if (db.getUserByEmail(email)) { db.acceptInvite(inv.id); return sendJson(res, 409, { error: 'Аккаунт с этим email уже есть. Войди на /login — роль подключится автоматически.', needLogin: true }); } /* O35c: гасим баннер «Ожидает подтверждения» навсегда */
    const id = db.createUser(email, db.hashPassword(String(body.password)), String(body.name || inv.name || '').trim().slice(0, 80) || 'Помощник');
    db.setUserPlan('u' + id, 'start');
    const token = crypto.randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + GG_SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    db.createSession(id, token, exp);
    setSessionCookie(res, token, GG_SESSION_DAYS, (req.headers['x-forwarded-proto'] || '') === 'https'); /* O35c: как в signup/login */
    db.acceptInvite(inv.id);
    return sendJson(res, 200, { ok: true, user: { id, email, name: String(body.name || inv.name || '').trim().slice(0, 80) || 'Помощник' } });
  }

  if (req.method === 'GET' && u.pathname === '/api/analytics') {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    return sendJson(res, 200, { totals: db.totalsAnalytics(_w), brands: db.brandAnalytics(_w) });
  }

  if (req.method === 'GET' && u.pathname === '/api/brands') {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    return sendJson(res, 200, db.listBrands(_w));
  }
  if (req.method === 'POST' && u.pathname === '/api/brands') {
    const _pl = db.getUserPlan(userKeyOf(req));
    if (!rateLimit(clientIp(req), 20)) return sendJson(res, 429, { error: 'Слишком часто. Подожди минуту.' });
    if (db.countBrands(req.ggUser ? req.ggUser.id : null) >= _pl.brands_max) {
      return sendJson(res, 402, { error: 'Лимит тарифа «' + _pl.code + '»: максимум ' + _pl.brands_max + ' бренд(ов).', upgrade: 'growth' });
    }
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    if (name.length < 2) return sendJson(res, 400, { error: 'Название бренда — хотя бы два символа.' });
    const _wB = scopeForUser(req.ggUser); /* O70 */
    const _brandOwner = _wB ? (_wB.isOwner ? null : _wB.userId) : (req.ggUser ? req.ggUser.id : null);
    const brand = db.addBrand(name.slice(0, 80), String(body.description || '').slice(0, 300), _brandOwner);
    return sendJson(res, 200, { id: brand.id, name: brand.name });
  }
  const bm = u.pathname.match(/^\/api\/brands\/(\d+)$/);
  if (bm && req.method === 'PATCH') {
    const body = await readBody(req);
    if (body.name) db.renameBrand(Number(bm[1]), String(body.name).slice(0, 80));
    if (body.status) db.setBrandStatus(Number(bm[1]), String(body.status));
    return sendJson(res, 200, { ok: true });
  }
  if (bm && req.method === 'DELETE') {
    db.deleteBrand(Number(bm[1]));
    return sendJson(res, 200, { ok: true });
  }

  
  /* ---- channels API (Приказ 23) ---- */
  const cm = u.pathname.match(/^\/api\/brands\/(\d+)\/channels$/);
  if (cm && req.method === 'GET') {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    const _b = db.getBrand(Number(cm[1]));
    if (!_b) return sendJson(res, 404, { error: 'Бренд не найден' });
    const _bid = _b.user_id == null ? null : Number(_b.user_id);
    const _ok = _bid == null ? !!_w.includeNull : (_bid === Number(_w.userId));
    if (!_ok) return sendJson(res, 403, { error: 'Это чужой бренд.' });
    return sendJson(res, 200, db.listChannels(Number(cm[1])));
  }
  if (cm && req.method === 'POST') {
    const body = await readBody(req);
    const chat = String(body.chat_id || '').trim();
    if (!chat) return sendJson(res, 400, { error: 'Укажи chat_id канала (@имя или -100...). ' });
    const ch = db.addChannel(Number(cm[1]), chat, String(body.title || '').slice(0, 80));
    return sendJson(res, 200, ch);
  }
  const chd = u.pathname.match(/^\/api\/channels\/(\d+)$/);
  if (chd && req.method === 'DELETE') {
    return sendJson(res, 200, db.deleteChannel(Number(chd[1])));
  }

  /* ---- Sprint1: waitlist ---- */
  if (req.method === 'POST' && u.pathname === '/api/waitlist') {
    if (!rateLimit(clientIp(req), 5)) return sendJson(res, 429, { error: 'Слишком часто. Подожди минуту.' });
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
    if (!EMAIL_RE.test(email)) return sendJson(res, 400, { error: 'Проверь email — адрес выглядит неверным.' });
    try {
      const w = db.waitlistAdd(email, String(body.name || '').trim().slice(0, 80));
      return sendJson(res, 200, { ok: true, id: w.id });
    } catch (e) {
      if (String(e.message || '').includes('UNIQUE')) return sendJson(res, 200, { ok: true, id: 0 });
      throw e;
    }
  }

  /* ---- Order 26: current plan for badge ---- */
  if (req.method === 'GET' && u.pathname === '/api/plan') {
    const p = db.getUserPlan(userKeyOf(req));
    return sendJson(res, 200, { plan: p ? p.code : 'start' });
  }

  /* ---- O36: profile API ---- */
  if (req.method === 'GET' && u.pathname === '/api/profile') {
    const cu = currentUser(req);
    if (!cu) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    const uk = 'u' + cu.id;
    const role = (cu.id === db.minUserId()) ? 'owner' : (db.getRoleByEmail(cu.email) || 'creator');
    const pl = db.getUserPlan(uk);
    const isLegacyOwner = cu.id === db.minUserId();
    const usageBrands = { used: db.countBrands(isLegacyOwner ? null : cu.id), max: pl.brands_max };
    const usageChannels = { used: isLegacyOwner ? db.countChannelsForUser(cu.id, true) : db.countChannelsForUser(cu.id, false), max: pl.channels_max };
    const usagePosts = { used: db.postsToday(uk), max: pl.posts_daily_max };
    let brands = [];
    try { brands = db.listBrands().filter((b) => isLegacyOwner ? (b.user_id == null || b.user_id === cu.id) : (b.user_id === cu.id)).slice(0, 20); } catch (e) { brands = []; }
    let team = [];
    if (role === 'owner') {
      team = db.listTeam().map((m) => {
        const inv = m.email ? db.getInviteByEmail(m.email) : null;
        return Object.assign({}, m, { invite_status: inv ? (inv.accepted_at ? 'accepted' : 'pending') : 'none' });
      });
    }
    const subRows = db.listSubscriptionsByUser(uk).filter((s) => s.provider !== 'seed');
    const sKey = 'profile_settings_' + uk;
    let pset = null;
    try {
      const rawSet = db.getSetting(sKey, null);
      if (rawSet) pset = JSON.parse(rawSet);
    } catch (e) { pset = null; }
    let posts = [];
    if (role === 'owner') { try { posts = db.listRecentPostsLite(12); } catch (e) { posts = []; } } /* O36b: drafts only for owner, lite columns */
    return sendJson(res, 200, {
      user: { id: cu.id, email: cu.email, name: cu.name, role, created_at: cu.created_at },
      plan: { code: pl.code, price_int: pl.price_int, brands_max: pl.brands_max, channels_max: pl.channels_max, posts_daily_max: pl.posts_daily_max },
      usage_brands: usageBrands, usage_channels: usageChannels, usage_posts: usagePosts,
      brands, team, subs: subRows, settings: pset, posts
    });
  }
  if (req.method === 'PATCH' && u.pathname === '/api/profile') {
    const gu = req.ggUser;
    if (!gu) return sendJson(res, 401, { error: 'Нужен вход.' });
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    if (name.length < 2) return sendJson(res, 400, { error: 'Имя — хотя бы два символа.' });
    const u2 = db.renameUser(gu.id, name);
    return sendJson(res, 200, { ok: true, user: { id: u2.id, email: u2.email, name: u2.name } });
  }
  if (req.method === 'POST' && u.pathname === '/api/profile/password') {
    const gu = req.ggUser;
    if (!gu) return sendJson(res, 401, { error: 'Нужен вход.' });
    if (!rateLimit(clientIp(req), 10)) return sendJson(res, 429, { error: 'Слишком часто. Подожди минуту.' }); /* O36b: scryptSync DoS guard */
    const body = await readBody(req);
    const full = db.getUserByEmail(gu.email);
    if (!full || !db.verifyPassword(String(body.current || ''), full.password_hash)) return sendJson(res, 403, { error: 'Текущий пароль неверен.' });
    const nextPw = String(body.next || '');
    if (nextPw.length < 8) return sendJson(res, 400, { error: 'Новый пароль — минимум 8 символов.' });
    if (nextPw.length > 128) return sendJson(res, 400, { error: 'Пароль слишком длинный — максимум 128 символов.' }); /* O36b */
    if (!PW_ALLOWED.test(nextPw)) return sendJson(res, 400, { error: PW_ERR }); /* O37 */
    db.changeUserPassword(gu.id, db.hashPassword(nextPw));
    db.deleteAllSessions(gu.id, parseCookies(req)[GG_COOKIE]);
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'DELETE' && u.pathname === '/api/profile/sessions') {
    const gu = req.ggUser;
    if (!gu) return sendJson(res, 401, { error: 'Нужен вход.' });
    db.deleteAllSessions(gu.id, parseCookies(req)[GG_COOKIE]);
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'PATCH' && u.pathname === '/api/profile/settings') {
    const gu = req.ggUser;
    if (!gu) return sendJson(res, 401, { error: 'Нужен вход.' });
    const body = await readBody(req);
    const allowedN = ['email', 'telegram', 'off'];
    const allowedP = ['all', 'team', 'nobody'];
    if (body.notifications === undefined && body.privacy === undefined) return sendJson(res, 400, { error: 'Нечего сохранять.' }); /* O36b: partial update */
    if (body.notifications !== undefined && !allowedN.includes(body.notifications)) return sendJson(res, 400, { error: 'Недопустимое значение уведомлений.' });
    if (body.privacy !== undefined && !allowedP.includes(body.privacy)) return sendJson(res, 400, { error: 'Недопустимое значение приватности.' });
    const sKey = 'profile_settings_u' + gu.id;
    let cur = {};
    try { cur = JSON.parse(db.getSetting(sKey, '{}')) || {}; } catch (e) { cur = {}; }
    if (body.notifications !== undefined) cur.notifications = body.notifications;
    if (body.privacy !== undefined) cur.privacy = body.privacy;
    db.setSetting(sKey, JSON.stringify(cur)); /* O36b: setSetting instead of duplicate updateSetting */
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && u.pathname === '/api/health') {
    const demo = isDemo();
    return sendJson(res, 200, { smtp: SMTP.ready() ? 'ready' : 'off',
      ok: true,
      ai: demo ? 'demo' : state.key ? 'live' : 'no-key',
      model: state.model,
      port: state.port
    });
  }

  if (req.method === 'POST' && u.pathname === '/api/analyze') {
    const _wA = scopeForUser(req.ggUser); /* O70 */
    if (!rateLimit(clientIp(req), 10)) return sendJson(res, 429, { error: 'Лимит разборов: 10 в час. Подожди немного.' });
    const body = await readBody(req);
    const goal = composeGoalText(body);
    if (goal.length < 5) {
      return sendJson(res, 400, { error: 'Опиши цель хотя бы в нескольких словах - одного предложения достаточно.' });
    }
    if (goal.length > 2000) {
      return sendJson(res, 400, { error: 'Цель слишком длинная. Попробуй сформулировать в одном-двух предложениях.' });
    }
    const demo = isDemo();

    if (demo) {
      const strategy = normalizeStrategy(demoStrategy(goal));
      const saved = db.addGoal(goal, JSON.stringify(strategy), 'demo', null, body.brand_id || null, (_wA ? (_wA.isOwner ? null : _wA.userId) : null));
      return sendJson(res, 200, { id: saved.id, createdAt: saved.created_at, source: 'demo', goal, strategy });
    }

    if (!state.key) {
      return sendJson(res, 409, {
        error: 'Ключ DeepSeek не найден. Вставь его в файл .env (скопируй из .env.example) и перезапусти сервер - или переключись на демо-режим внизу страницы.'
      });
    }

    try {
      const raw = await callDeepSeek([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Цель: ' + goal }
      ]);
      const strategy = normalizeStrategy(parseJsonLoose(raw));
      const saved = db.addGoal(goal, JSON.stringify(strategy), 'live', state.model, body.brand_id || null, (_wA ? (_wA.isOwner ? null : _wA.userId) : null));
      return sendJson(res, 200, { id: saved.id, createdAt: saved.created_at, source: 'live', goal, strategy });
    } catch (e) {
      return sendJson(res, 502, {
        error: 'Разум не ответил: ' + e.message,
        hint: 'Проверь ключ DeepSeek и интернет - или включи демо-режим.'
      });
    }
  }

  if (req.method === 'GET' && u.pathname === '/api/goals') {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    const brandQ = u.searchParams.get('brand');
    return sendJson(res, 200, { goals: brandQ ? db.listGoals(50, Number(brandQ), _w) : db.listGoals(50, null, _w) });
  }

  /* O52: storage — all posts for the warehouse page (login required) */
  /* ---------- Order 70: schedule API ---------- */
  {
  const sm = u.pathname.match(/^\/api\/posts\/(\d+)\/schedule$/);
  if (req.method === 'POST' && sm) {
    const id = Number(sm[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });
    if (post.published_at) return sendJson(res, 409, { error: 'Пост уже опубликован.' });
    const _b = await readBody(req);
    const raw = String(_b.when || '').trim();
    const mm = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
    if (!mm) return sendJson(res, 400, { error: 'Нужны дата и время в формате ГГГГ-ММ-ДД ЧЧ:ММ (по Москве).' });
    const whenLocal = mm[1] + '-' + mm[2] + '-' + mm[3] + ' ' + mm[4] + ':' + mm[5] + ':00';
    const whenUtc = new Date(raw.replace(' ', 'T') + ':00+03:00');
    if (isNaN(whenUtc.getTime())) return sendJson(res, 400, { error: 'Не получилось прочитать дату.' });
    if (whenUtc.getTime() <= Date.now() - 60000) return sendJson(res, 400, { error: 'Время уже прошло. Выбери будущее.' });
    const far = Date.now() + 366 * 24 * 3600 * 1000;
    if (whenUtc.getTime() > far) return sendJson(res, 400, { error: 'Слишком далеко: максимум на год вперёд.' });
    const st = db.setSchedule(id, whenLocal, null);
    return sendJson(res, 200, { ok: true, post: st, serverNow: db.mskNowStamp() });
  }

  }
  {
  const sm = u.pathname.match(/^\/api\/posts\/(\d+)\/schedule$/);
  if (req.method === 'DELETE' && sm) {
    const id = Number(sm[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });
    const st = db.clearSchedule(id);
    return sendJson(res, 200, { ok: true, post: st });
  }

  }
  {
  const sm = u.pathname.match(/^\/api\/posts\/(\d+)\/schedule$/);
  if (req.method === 'PATCH' && sm) {
    const id = Number(sm[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });
    if (post.published_at) return sendJson(res, 409, { error: 'Пост уже опубликован.' });
    const cur = db.getScheduleState(id);
    if (!cur || cur.schedule_status !== 'scheduled') return sendJson(res, 409, { error: 'Пост не запланирован.' });
    const _b = await readBody(req);
    const raw = String(_b.when || '').trim();
    const mm = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
    if (!mm) return sendJson(res, 400, { error: 'Нужны дата и время в формате ГГГГ-ММ-ДД ЧЧ:ММ (по Москве).' });
    const whenLocal = mm[1] + '-' + mm[2] + '-' + mm[3] + ' ' + mm[4] + ':' + mm[5] + ':00';
    const whenUtc = new Date(raw.replace(' ', 'T') + ':00+03:00');
    if (isNaN(whenUtc.getTime())) return sendJson(res, 400, { error: 'Не получилось прочитать дату.' });
    if (whenUtc.getTime() <= Date.now() - 60000) return sendJson(res, 400, { error: 'Время уже прошло.' });
    const st = db.setSchedule(id, whenLocal, cur.schedule_note);
    return sendJson(res, 200, { ok: true, post: st });
  }

  if (req.method === 'GET' && u.pathname === '/api/schedule') {
    const _w = workspaceScope(req);
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    return sendJson(res, 200, { scheduled: db.listScheduled(100, _w), serverNow: db.mskNowStamp() });
  }

  if (req.method === 'GET' && u.pathname === '/api/schedule/run') {
    if (req.ggRole !== 'owner') return sendJson(res, 403, { error: 'Ручной прогон — только владельцу.' });
    await scheduleCronTick();
    return sendJson(res, 200, { ok: true, last: SCHED.last, serverNow: db.mskNowStamp() });
  }

  }
  if (req.method === 'GET' && u.pathname === '/api/posts') {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    return sendJson(res, 200, { posts: db.storageList(300, _w), brands: db.listBrands(_w) });
  }
  /* ---------- Door 2: posts ---------- */
  let m = u.pathname.match(/^\/api\/goals\/(\d+)\/posts$/);

  /* O52: delete a goal (posts under it are removed with it; storage page warns) */
  const mDel = u.pathname.match(/^\/api\/goals\/(\d+)$/);
  if (mDel && req.method === 'DELETE') {
    if (req.ggRole !== 'owner') return sendJson(res, 403, { error: 'Удалять цели может только владелец.' });
    db.deleteGoal(Number(mDel[1]));
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && m) {
    const _plP = db.getUserPlan(userKeyOf(req));
    if (db.postsToday(userKeyOf(req)) >= _plP.posts_daily_max) {
      return sendJson(res, 402, { error: 'Дневной лимит постов тарифа «' + _plP.code + '» исчерпан (' + _plP.posts_daily_max + '/день).', upgrade: _plP.code === 'start' ? 'growth' : 'pro' });
    }
    const goalId = Number(m[1]);
    const g = db.getGoal(goalId);
    if (!g) return sendJson(res, 404, { error: 'Разбор не найден' });
    const body = await readBody(req);
    let count = Number(body.count) || 3;
    count = Math.max(1, Math.min(10, count));

    let strategy = {};
    try { strategy = JSON.parse(g.strategy_json); } catch (e) { strategy = {}; }

    const demo = isDemo();
    let texts;
    if (demo) {
      texts = demoPosts(strategy, count, goalId);
    } else {
      if (!state.key) return sendJson(res, 409, { error: 'Ключ DeepSeek не найден - включи демо-режим или добавь ключ в .env.' });
      try {
        texts = await livePosts(strategy, count);
      } catch (e) {
        return sendJson(res, 502, { error: 'Разум не ответил: ' + e.message, hint: 'Можно включить демо-режим внизу страницы.' });
      }
    }

    const created = texts.map((p) => db.addPost(goalId, {
      title: p.title,
      body: p.body,
      cta: p.cta,
      image_status: 'none',
      source: demo ? 'demo' : 'live',
      model: demo ? null : state.model
    }));
    return sendJson(res, 200, { goalId, created: created.length, posts: created });
  }

  m = u.pathname.match(/^\/api\/goals\/(\d+)\/posts$/);
  if (req.method === 'GET' && m) {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    const _g = db.getGoal(Number(m[1]));
    if (!_g) return sendJson(res, 404, { error: 'Разбор не найден' });
    const _gid = _g.user_id == null ? null : Number(_g.user_id);
    const _allowed = _gid == null ? !!_w.includeNull : (_gid === Number(_w.userId));
    if (!_allowed) return sendJson(res, 403, { error: 'Это чужая цель.' });
    return sendJson(res, 200, { posts: db.listPostsByGoal(Number(m[1])) });
  }

  m = u.pathname.match(/^\/api\/posts\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const post = db.getPost(id);
    if (!post && req.method !== 'POST') return sendJson(res, 404, { error: 'Пост не найден' });

    if (req.method === 'PATCH') {
      const body = await readBody(req);
      const fields = {};
      if ('title' in body) fields.title = asText(body.title, 'Пост').slice(0, 90);
      if ('body' in body) fields.body = asText(body.body, '').slice(0, 500);
      if ('cta' in body) fields.cta = asText(body.cta, '').slice(0, 120);
      if ('title' in body || 'body' in body || 'cta' in body) { fields.approved_at = null; fields.approved_by = null; }
      const updated = db.updatePost(id, fields);
      return sendJson(res, 200, { post: updated });
    }

    if (req.method === 'DELETE') {
      if (post && post.image_path) {
        const f = path.join(PUBLIC, post.image_path.replace('/public/', ''));
        try { fs.unlinkSync(f); } catch (e) { /* уже нет */ }
      }
      db.deletePost(id);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && u.pathname.endsWith('/regenerate')) {
      /* handled below by more specific route */
    }
  }

  /* Дверь 3: публикация в Telegram (только по кнопке) */
  m = u.pathname.match(/^\/api\/posts\/(\d+)\/publish$/);
  if (req.method === 'POST' && m) {
    if (req.ggRole !== 'publisher' && req.ggRole !== 'owner') {
      return sendJson(res, 403, { error: 'Публикация доступна роли «Публикатор». Твоя роль: ' + req.ggRole + '.' });
    }
    const id = Number(m[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });
    if (!TG.ready()) {
      return sendJson(res, 409, { error: 'Telegram не настроен: нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.' });
    }
    try {
      /* Приказ 23: канал бренда, если у цели есть brand_id */
      const goalRow = db.getGoal(post.goal_id);
      const brandChannels = goalRow && goalRow.brand_id ? db.listChannels(goalRow.brand_id) : [];
      const target = brandChannels.length ? brandChannels[0].chat_id : null;
      const result = await tgSend(post, target);
      if (!result.ok) {
        const desc = result.description || ('HTTP-ошибка Telegram');
        return sendJson(res, 502, { error: 'Telegram отказал: ' + desc });
      }
      const when = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const updated = db.updatePost(id, {
        published_at: when,
        published_message_id: result.result.message_id,
        published_channel: TG.chatId
      });
      db.bumpPostsToday(userKeyOf(req));
      return sendJson(res, 200, { post: updated, messageId: result.result.message_id });
    } catch (e) {
      return sendJson(res, 502, { error: 'Связь с Telegram оборвалась: ' + e.message });
    }
  }

  /* Order 34 / Door 6.1: approve draft */
  m = u.pathname.match(/^\/api\/posts\/(\d+)\/approve$/);
  if (req.method === 'POST' && m) {
    if (req.ggRole !== 'approver' && req.ggRole !== 'owner') {
      return sendJson(res, 403, { error: 'Утверждение доступно роли «Утверждающий». Твоя роль: ' + req.ggRole + '.' });
    }
    const id = Number(m[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });
    const when = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updated = db.updatePost(id, { approved_at: when, approved_by: req.ggUser.name || req.ggUser.email });
    return sendJson(res, 200, { post: updated });
  }

  /* судовой журнал публикаций (Дверь 3) */
  if (req.method === 'GET' && u.pathname === '/api/publications') {
    const _w = workspaceScope(req); /* O70 */
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    return sendJson(res, 200, { publications: db.listPublications(50, _w) });
  }

  /* ремонтная команда: упавшие и зависшие картинки — обратно в очередь */
  m = u.pathname.match(/^\/api\/posts\/(\d+)\/regenerate$/);
  if (req.method === 'POST' && m) {
    const id = Number(m[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });
    const g = db.getGoal(post.goal_id);
    let strategy = {};
    try { strategy = g ? JSON.parse(g.strategy_json) : {}; } catch (e) { strategy = {}; }
    const demo = isDemo();

    let fresh;
    if (demo) {
      fresh = demoPosts(strategy, 1, Date.now() % 9973)[0];
      fresh.title = post.title.replace(/ — \d+$/, '') + ' — ' + (new Date().getSeconds() % 9 + 1);
    } else {
      if (!state.key) return sendJson(res, 409, { error: 'Ключ DeepSeek не найден - включи демо-режим или добавь ключ в .env.' });
      try {
        fresh = await liveOnePost(strategy, post.title);
      } catch (e) {
        return sendJson(res, 502, { error: 'Разум не ответил: ' + e.message });
      }
    }
    const updated = db.updatePost(id, {
      title: fresh.title, body: fresh.body, cta: fresh.cta,
      image_status: 'none', image_path: null,
      approved_at: null, approved_by: null
    });
    return sendJson(res, 200, { post: updated });
  }

  m = u.pathname.match(/^\/api\/posts\/(\d+)\/image$/);
  if (m) {
    const id = Number(m[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });

    if (req.method === 'POST') {
      if (post.image_status === 'pending') {
        return sendJson(res, 200, { id, status: 'pending' });
      }
      const body = await readBody(req).catch(() => ({}));
      let prompt = asText(body.prompt, '');
      if (!prompt) {
        const g = db.getGoal(post.goal_id);
        prompt = deriveImagePrompt(post, g ? g.strategy_json : null);
      }
      const file = 'post-' + id + '-' + Date.now() + '.jpg';
      db.updatePost(id, { image_status: 'pending' });
      enqueueImage({ postId: id, prompt, file });
      return sendJson(res, 200, { id, status: 'pending', queueAhead: inFlight.size });
    }

    if (req.method === 'GET') {
      return sendJson(res, 200, {
        id, status: post.image_status, imagePath: post.image_path || null
      });
    }
  }

  /* ---------- Door 1: goals (после более специфичных маршрутов) ---------- */
  m = u.pathname.match(/^\/api\/goals\/(\d+)$/);
  if (req.method === 'GET' && m) {
    const g = db.getGoal(Number(m[1]));
    if (!g) return sendJson(res, 404, { error: 'Запись не найдена' });
    let strategy = {};
    try { strategy = JSON.parse(g.strategy_json); } catch (e) { strategy = {}; }
    return sendJson(res, 200, {
      id: g.id, goal: g.goal_text, source: g.source, created_at: g.created_at, strategy
    });
  }

  /* ключ DeepSeek: сохранить в .env прямо с экрана */
  if (req.method === 'POST' && u.pathname === '/api/keys/deepseek') {
    if (!rateLimit(clientIp(req), 3)) return sendJson(res, 429, { error: 'Слишком часто.' });
    const body = await readBody(req);
    const key = String(body.key || '').trim();
    if (!/^sk-[A-Za-z0-9]{20,}$/.test(key)) {
      return sendJson(res, 400, {
        error: 'Ключ не похож на ключ DeepSeek: он должен начинаться с «sk-» и содержать только латинские буквы и цифры.'
      });
    }
    const envPath = path.join(__dirname, '.env');
    let env = '';
    if (fs.existsSync(envPath)) env = fs.readFileSync(envPath, 'utf8');
    const lines = env.split(/\r?\n/).filter((l) => l.trim() && !/^DEEPSEEK_API_KEY\s*=/.test(l));
    lines.push('DEEPSEEK_API_KEY=' + key);
    fs.writeFileSync(envPath, lines.join('\n') + '\n');
    state.key = key; /* живём дальше без перезапуска */
    const wasDemo = db.getSetting('demo_mode', '0') === '1';
    if (wasDemo) db.setSetting('demo_mode', '0'); /* с ключом — сразу живой режим */
    return sendJson(res, 200, {
      ok: true,
      demo: false,
      hint: 'Ключ принят. Мозг и тексты теперь живые.'
    });
  }

  /* ключ Pollinations: сохранить в .env прямо с экрана (Дверь 4, скорость картинок) */
  if (req.method === 'POST' && u.pathname === '/api/keys/pollinations') {
    if (!rateLimit(clientIp(req), 3)) return sendJson(res, 429, { error: 'Слишком часто.' });
    const body = await readBody(req);
    const key = String(body.key || '').trim();
    if (key.length < 10 || /[^A-Za-z0-9_.\-]/.test(key)) {
      return sendJson(res, 400, { error: 'Ключ не похож на ключ Pollinations: только латиница, цифры и знаки _ . - (обычно начинается с sk_).' });
    }
    const envPath2 = path.join(__dirname, '.env');
    let env2 = '';
    if (fs.existsSync(envPath2)) env2 = fs.readFileSync(envPath2, 'utf8');
    const lines2 = env2.split(/\r?\n/).filter((l) => l.trim() && !/^POLLINATIONS_API_KEY\s*=/.test(l));
    lines2.push('POLLINATIONS_API_KEY=' + key);
    fs.writeFileSync(envPath2, lines2.join('\n') + '\n');
    state.pollenKey = key;
    /* с ключом картинки идут в быстром конвейере: маленькая пауза, больше попыток */
    IMG.cooldownMs = 3000;
    IMG.minGapMs = 1000;
    IMG.maxTries = 3;
    /* вернем в очередь все упа��шие - теперь они дойдут быстро */
    for (const pp of db.listAllPosts()) {
      if (pp.image_status === 'error' && !inFlight.has(pp.id)) {
        const g = db.getGoal(pp.goal_id);
        enqueueImage({
          postId: pp.id,
          prompt: deriveImagePrompt(pp, g ? g.strategy_json : null),
          file: 'post-' + pp.id + '-' + Date.now() + '.jpg'
        });
      }
    }
    return sendJson(res, 200, { ok: true, fastLane: true, hint: 'Ключ принят. Картинки теперь быстрые.' });
  }

  if (req.method === 'GET' && u.pathname === '/api/keys/pollinations/status') {
    return sendJson(res, 200, { hasKey: !!state.pollenKey });
  }

  if (req.method === 'GET' && u.pathname === '/api/keys/deepseek/status') {
    return sendJson(res, 200, { hasKey: !!state.key });
  }

  if (req.method === 'POST' && u.pathname === '/api/demo-mode') {
    if (!rateLimit(clientIp(req), 5)) return sendJson(res, 429, { error: 'Слишком часто.' });
    const body = await readBody(req);
    db.setSetting('demo_mode', body.enabled ? '1' : '0');
    return sendJson(res, 200, { ok: true, demo: !!body.enabled });
  }

  /* ремонтная команда: упавшие и зависшие картинки — обратно в очередь */
  if (req.method === 'POST' && u.pathname === '/api/images/repair') {
    const rows = db.listAllPosts();
    let queued = 0;
    for (const p of rows) {
      if (p.image_status !== 'error' && p.image_status !== 'pending') continue;
      if (inFlight.has(p.id)) continue; /* уже в работе — не дублируем */
      const g = db.getGoal(p.goal_id);
      const prompt = deriveImagePrompt(p, g ? g.strategy_json : null);
      const file = 'post-' + p.id + '-' + Date.now() + '.jpg';
      db.updatePost(p.id, { image_status: 'pending' });
      enqueueImage({ postId: p.id, prompt, file });
      queued++;
    }
    return sendJson(res, 200, { ok: true, requeued: queued, queueAhead: inFlight.size });
  }

  return sendJson(res, 404, { error: 'Нет такого маршрута' });
}

/* boot repair: after restart, requeue stuck images so nothing is lost */
(function bootRepair() {
  let n = 0;
  for (const p of db.listAllPosts()) {
    if ((p.image_status === 'pending' || p.image_status === 'error') && !inFlight.has(p.id)) {
      const g = db.getGoal(p.goal_id);
      enqueueImage({
        postId: p.id,
        prompt: deriveImagePrompt(p, g ? g.strategy_json : null),
        file: 'post-' + p.id + '-' + Date.now() + '.jpg'
      });
      n++;
    }
  }
  if (n) console.log('BOOT_REPAIR requeued ' + n + ' image(s)');
})();

/* ---- O35: invite letters + mail queue worker (Telegram now, SMTP when ports open) ---- */
const ROLE_NAMES = { creator: 'Создатель', approver: 'Утверждающий', publisher: 'Публикатор' };
function queueInviteLetter(token, email, role, name) {
  const owner = db.getUserById(db.minUserId());
  const from = owner && owner.name ? owner.name : 'Владелец';
  const body = [
    'Письмо-приглашение (черновик транспорта: Telegram -> email после открытия SMTP-портов)',
    '',
    'Тема: Вас пригласили в команду GOOD Growth',
    '',
    'Здравствуйте!',
    '',
    from + ' приглашает вас в команду GOOD Growth в роли «' + (ROLE_NAMES[role] || role) + '».',
    '',
    'Примите приглашение — и мастерская роста откроется с вашей ролью:',
    'https://growth.go-ood.com/accept-invite?token=' + token,
    '',
    'Email для входа: ' + email,
    '',
    '— GOOD Growth'
  ].join('\n');
  return db.mailEnqueue(SMTP.ready() ? 'smtp' : 'telegram', 'Вас пригласили в команду GOOD Growth', body, email);
}
const MAIL = { busy: false };
async function processMailQueue() {
  if (MAIL.busy) return;
  const item = db.mailQueueNext();
  if (!item) return;
  MAIL.busy = true;
  try {
    /* Order 69: SMTP — основной транспорт; telegram остаётся резервом */
    if (item.transport === 'smtp' || item.transport === 'email') {
      if (!SMTP.ready()) {
        db.mailQueueMark(item.id, item.attempts >= 5 ? 'failed' : 'pending', 'smtp: SMTP_* не настроены в .env');
        return;
      }
      let ok = false, err = '';
      try {
        const tp = await SMTP.transport();
        const to = String(item.to_addr || '').trim();
        if (!to) throw new Error('нет адреса получателя');
        await tp.sendMail({
          from: SMTP.from || SMTP.user,
          to,
          subject: item.subject || 'GOOD Growth',
          text: item.body
        });
        ok = true;
      } catch (e) { err = 'smtp: ' + (e && e.message ? e.message : String(e)); }
      db.mailQueueMark(item.id, ok ? 'sent' : (item.attempts >= 5 ? 'failed' : 'pending'), ok ? null : err);
      if (!ok) { try { console.log('[mail] smtp fail -> ' + err); } catch (e) {} }
      return;
    }
    if (item.transport === 'telegram') {
      if (!TG.ready()) {
        db.mailQueueMark(item.id, item.attempts >= 5 ? 'failed' : 'pending', 'telegram: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не заданы');
        return;
      }
      let ok = false, err = '';
      try {
        const api = 'https://api.telegram.org/bot' + TG.token;
        const res = await fetch(api + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TG.mailChatId || TG.chatId, text: item.body, disable_web_page_preview: true }),
          signal: AbortSignal.timeout(60000)
        });
        const d = await res.json();
        ok = !!(d && d.ok);
        if (!ok) err = 'telegram: ' + JSON.stringify(d).slice(0, 200);
      } catch (e) { err = 'telegram: ' + e.message; }
      db.mailQueueMark(item.id, ok ? 'sent' : (item.attempts >= 5 ? 'failed' : 'pending'), ok ? null : err);
      return;
    }
    db.mailQueueMark(item.id, 'failed', 'transport "' + item.transport + '" не настроен');
  } finally { MAIL.busy = false; }
}
setInterval(() => { processMailQueue().catch(() => {}); }, 15000);

/* ---- Order 70: плановая публикация — каждую минуту ---- */
let SCHED = { busy: false, last: null };
async function scheduleCronTick() {
  if (SCHED.busy) return;
  const due = db.listDueScheduled(10);
  if (!due.length) return;
  SCHED.busy = true;
  try {
    for (const post of due) {
      try {
        const state = db.getScheduleState(post.id);
        if (!state || state.schedule_status !== 'scheduled') continue; /* отменён, пока ждали */
        const goalRow = db.getGoal(post.goal_id);
        const brandChannels = goalRow && goalRow.brand_id ? db.listChannels(goalRow.brand_id) : [];
        const target = brandChannels.length ? brandChannels[0].chat_id : null;
        if (!TG.ready()) {
          db.markSchedule(post.id, 'failed', 'Telegram не настроен (TELEGRAM_BOT_TOKEN/CHAT_ID)');
          try { mailEnqueue('telegram', 'GOOD Growth: ошибка публикации', 'Пост № ' + post.id + ' не опубликован: Telegram не настроен.', ''); } catch (e) {}
          continue;
        }
        const result = await tgSend(post, target);
        if (result && result.ok) {
          const when = db.mskNowStamp();
          db.updatePost(post.id, {
            published_at: when,
            published_message_id: result.result && result.result.message_id ? result.result.message_id : null,
            published_channel: target || TG.chatId
          });
          db.markSchedule(post.id, 'published', 'Опубликован по расписанию в ' + when);
          try { mailEnqueue('telegram', 'GOOD Growth: пост опубликован', 'Пост № ' + post.id + ' «' + post.title + '» опубликован по расписанию (' + when + ' МСК).', ''); } catch (e) {}
        } else {
          db.markSchedule(post.id, 'failed', 'Telegram отказал: ' + ((result && result.description) || 'HTTP-ошибка'));
          try { mailEnqueue('telegram', 'GOOD Growth: ошибка публикации', 'Пост № ' + post.id + ' не опубликован: ' + ((result && result.description) || 'HTTP-ошибка Telegram') + '. Открой /app/schedule и перенеси время.', ''); } catch (e) {}
        }
      } catch (e) {
        db.markSchedule(post.id, 'failed', 'Сбой: ' + e.message);
        try { mailEnqueue('telegram', 'GOOD Growth: ошибка публикации', 'Пост № ' + post.id + ': сбой публикации — ' + e.message, ''); } catch (e2) {}
      }
    }
  } finally { SCHED.busy = false; SCHED.last = new Date().toISOString(); }
}
setInterval(scheduleCronTick, 60000).unref();
setTimeout(scheduleCronTick, 15000).unref();

const server = http.createServer((req, res) => {
  route(req, res).catch((e) => {
    try { sendJson(res, 500, { error: 'Внутренняя ошибка сервера: ' + e.message }); } catch (e2) { /* noop */ }
  });
});

server.listen(state.port, () => {
  const demo = isDemo();
  db.seedPlans();
console.log('GOOD Growth - Door 1 "Brain" + Door 2 "Hands"');
  console.log('Open:  http://localhost:' + state.port);
  console.log('AI:    ' + (demo ? 'DEMO mode (no DeepSeek calls)' : state.key ? 'live (' + state.model + ')' : 'NO KEY - put DEEPSEEK_API_KEY into .env'));
  console.log('Data:  ' + path.join(__dirname, 'data', 'goodgrowth.db'));
});
