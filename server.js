'use strict';
/* GOOD Growth - Door 1 "The Brain" + Door 2 "Hands of the maker".
   Local server: serves the screen, turns a goal into a strategy,
   then writes posts (texts + images). Zero npm dependencies. */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

/* Door 3: Telegram connector lives here inline (loaded before routes) */
/* ---- Telegram connector (Door 3) ----------------------------------- */
const TG = {
  token: null,
  chatId: null,
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
  }
})();

async function tgSend(post) {
  const api = 'https://api.telegram.org/bot' + TG.token;
  const parts = [post.title, '', post.body];
  if (post.cta) { parts.push('', post.cta); }
  const text = parts.join('\n');

  if (post.image_path && post.image_status === 'done') {
    const imgFile = path.join(PUBLIC, post.image_path.replace('/public/', ''));
    const fd = new FormData();
    fd.append('chat_id', TG.chatId);
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
function sendJson(res, code, obj) {
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

  if (req.method === 'GET' && u.pathname === '/api/health') {
    const demo = isDemo();
    return sendJson(res, 200, {
      ok: true,
      ai: demo ? 'demo' : state.key ? 'live' : 'no-key',
      model: state.model,
      port: state.port
    });
  }

  if (req.method === 'POST' && u.pathname === '/api/analyze') {
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
      const saved = db.addGoal(goal, JSON.stringify(strategy), 'demo', null);
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
      const saved = db.addGoal(goal, JSON.stringify(strategy), 'live', state.model);
      return sendJson(res, 200, { id: saved.id, createdAt: saved.created_at, source: 'live', goal, strategy });
    } catch (e) {
      return sendJson(res, 502, {
        error: 'Разум не ответил: ' + e.message,
        hint: 'Проверь ключ DeepSeek и интернет - или включи демо-режим.'
      });
    }
  }

  if (req.method === 'GET' && u.pathname === '/api/goals') {
    return sendJson(res, 200, { goals: db.listGoals(50) });
  }

  /* ---------- Door 2: posts ---------- */

  let m = u.pathname.match(/^\/api\/goals\/(\d+)\/posts$/);
  if (req.method === 'POST' && m) {
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
    const id = Number(m[1]);
    const post = db.getPost(id);
    if (!post) return sendJson(res, 404, { error: 'Пост не найден' });
    if (!TG.ready()) {
      return sendJson(res, 409, { error: 'Telegram не настроен: нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.' });
    }
    try {
      const result = await tgSend(post);
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
      return sendJson(res, 200, { post: updated, messageId: result.result.message_id });
    } catch (e) {
      return sendJson(res, 502, { error: 'Связь с Telegram оборвалась: ' + e.message });
    }
  }

  /* судовой журнал публикаций (Дверь 3) */
  if (req.method === 'GET' && u.pathname === '/api/publications') {
    return sendJson(res, 200, { publications: db.listPublications(50) });
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
      image_status: 'none', image_path: null
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
    /* вернем в очередь все упавшие - теперь они дойдут быстро */
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

const server = http.createServer((req, res) => {
  route(req, res).catch((e) => {
    try { sendJson(res, 500, { error: 'Внутренняя ошибка сервера: ' + e.message }); } catch (e2) { /* noop */ }
  });
});

server.listen(state.port, () => {
  const demo = isDemo();
  console.log('GOOD Growth - Door 1 "Brain" + Door 2 "Hands"');
  console.log('Open:  http://localhost:' + state.port);
  console.log('AI:    ' + (demo ? 'DEMO mode (no DeepSeek calls)' : state.key ? 'live (' + state.model + ')' : 'NO KEY - put DEEPSEEK_API_KEY into .env'));
  console.log('Data:  ' + path.join(__dirname, 'data', 'goodgrowth.db'));
});
