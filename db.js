'use strict';
/* GOOD Growth - local storage (SQLite, built into Node 22+).
   One file: data\goodgrowth.db. No server, no setup.
   Door 2: posts. Door 3: publication records on posts. */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'data', 'goodgrowth.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL,
  chat_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'creator',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS plans (
  code TEXT PRIMARY KEY,
  price_int INTEGER NOT NULL,
  brands_max INTEGER NOT NULL,
  channels_max INTEGER NOT NULL,
  posts_daily_max INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  provider TEXT DEFAULT 'manual',
  period_end TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS posts_today (
  user_key TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, day)
);
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
    CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_text TEXT NOT NULL,
    strategy_json TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'live',
    model TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    cta TEXT,
    image_status TEXT NOT NULL DEFAULT 'none',
    image_path TEXT,
    source TEXT NOT NULL DEFAULT 'demo',
    model TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_posts_goal ON posts(goal_id);
  /* Order 30: auth */
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    role TEXT DEFAULT 'owner',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  /* O35: invites + mail queue */
  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'creator',
    name TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    accepted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(lower(email));
  CREATE TABLE IF NOT EXISTS mail_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transport TEXT NOT NULL DEFAULT 'telegram',
    to_addr TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT
  );
`);

/* Door 3 migration: publication columns (safe if already added) */
const MIGRATIONS = [
  'ALTER TABLE posts ADD COLUMN published_at TEXT',
  'ALTER TABLE posts ADD COLUMN published_message_id INTEGER',
  'ALTER TABLE posts ADD COLUMN published_channel TEXT',
  'ALTER TABLE brands ADD COLUMN user_id INTEGER',
  'CREATE INDEX IF NOT EXISTS idx_brands_user ON brands(user_id)',
  'ALTER TABLE posts ADD COLUMN approved_at TEXT',
  'ALTER TABLE posts ADD COLUMN approved_by TEXT',
  'ALTER TABLE goals ADD COLUMN user_id INTEGER',
  'CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)',
  'ALTER TABLE posts ADD COLUMN scheduled_at TEXT',
  'ALTER TABLE posts ADD COLUMN schedule_status TEXT',
  'ALTER TABLE posts ADD COLUMN schedule_note TEXT',
  'CREATE INDEX IF NOT EXISTS idx_posts_sched ON posts(schedule_status, scheduled_at)'
];
for (const sql of MIGRATIONS) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

/* O70: legacy rows (no owner) belong to the ship owner — the very first account */
try {
  db.exec('UPDATE goals SET user_id = (SELECT MIN(id) FROM users) WHERE user_id IS NULL');
} catch (e) { /* users table may be empty on a fresh install */ }

/* ---------- goals ---------- */

function addGoal(goalText, strategyJson, source, model, brandId, userId) {
  const info = db
    .prepare('INSERT INTO goals (goal_text, strategy_json, source, model, brand_id, user_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(goalText, strategyJson, source, model || null, brandId ? Number(brandId) : null, userId ? Number(userId) : null);
  return getGoal(Number(info.lastInsertRowid));
}

function listGoals(limit = 50, brandId, scope) {
  const conds = [];
  const params = [];
  if (brandId) { conds.push('brand_id = ?'); params.push(Number(brandId)); }
  if (scope && scope.userId != null) {
    conds.push(scope.includeNull ? '(user_id IS NULL OR user_id = ?)' : 'user_id = ?');
    params.push(Number(scope.userId));
  }
  const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
  params.push(limit);
  return db
    .prepare('SELECT id, goal_text, source, created_at, brand_id FROM goals' + where + ' ORDER BY id DESC LIMIT ?')
    .all(...params);
}

function getGoal(id) {
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id) || null;
}

/* ---------- posts ---------- */

function addPost(goalId, p) {
  const info = db
    .prepare('INSERT INTO posts (goal_id, title, body, cta, image_status, source, model) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(goalId, p.title, p.body, p.cta || null, p.image_status || 'none', p.source || 'demo', p.model || null);
  return getPost(Number(info.lastInsertRowid));
}

function listPostsByGoal(goalId) {
  return db
    .prepare('SELECT * FROM posts WHERE goal_id = ? ORDER BY id ASC')
    .all(goalId);
}

function getPost(id) {
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id) || null;
}

function updatePost(id, fields) {
  const allowed = ['title', 'body', 'cta', 'image_status', 'image_path',
    'published_at', 'published_message_id', 'published_channel',
    'approved_at', 'approved_by'];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (k in fields) { sets.push(k + ' = ?'); vals.push(fields[k]); }
  }
  if (!sets.length) return getPost(id);
  sets.push("updated_at = datetime('now', 'localtime')");
  vals.push(id);
  db.prepare('UPDATE posts SET ' + sets.join(', ') + ' WHERE id = ?').run(...vals);
  return getPost(id);
}

function deletePost(id) {
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

function countPostsByGoal(goalId) {
  return Number(db.prepare('SELECT COUNT(*) AS n FROM posts WHERE goal_id = ?').get(goalId).n);
}

function listAllPosts() {
  return db.prepare('SELECT * FROM posts ORDER BY id ASC').all();
}

/* publication journal (Door 3): every publish, newest first */
function deleteGoal(id) {
  db.prepare('DELETE FROM posts WHERE goal_id = ?').run(Number(id));
  db.prepare('DELETE FROM goals WHERE id = ?').run(Number(id));
}

/* O52: storage list — all posts with goal/brand info */
function storageList(limit = 300, scope) {
  const cols = 'SELECT p.id, p.goal_id, p.title, p.body, p.cta, p.image_status, p.image_path, p.created_at, p.published_at, p.published_channel, p.approved_at, g.goal_text, g.brand_id, b.name AS brand_name' +
    ' FROM posts p JOIN goals g ON p.goal_id = g.id LEFT JOIN brands b ON g.brand_id = b.id';
  const params = [];
  let where = '';
  if (scope && scope.userId != null) {
    where = scope.includeNull ? ' WHERE (g.user_id IS NULL OR g.user_id = ?)' : ' WHERE g.user_id = ?';
    params.push(Number(scope.userId));
  }
  params.push(Number(limit) || 300);
  return db.prepare(cols + where + ' ORDER BY p.id DESC LIMIT ?').all(...params);
}

function listPublications(limit = 50, scope) {
  const params = [];
  const conds = ['p.published_at IS NOT NULL'];
  if (scope && scope.userId != null) {
    conds.push(scope.includeNull ? '(g.user_id IS NULL OR g.user_id = ?)' : 'g.user_id = ?');
    params.push(Number(scope.userId));
  }
  params.push(limit);
  return db
    .prepare('SELECT p.id, p.goal_id, p.title, p.published_at, p.published_message_id, p.published_channel FROM posts p JOIN goals g ON p.goal_id = g.id WHERE ' + conds.join(' AND ') + ' ORDER BY p.published_at DESC LIMIT ?')
    .all(...params);
}

/* ---------- Order 70: schedule ---------- */

function mskNowStamp() {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}
function listDueScheduled(limit = 20) {
  return db.prepare(
    "SELECT p.id, p.goal_id, p.title, p.body, p.cta, p.image_path, p.image_status, p.scheduled_at FROM posts p WHERE p.schedule_status = 'scheduled' AND p.scheduled_at IS NOT NULL AND p.scheduled_at <= ? ORDER BY p.scheduled_at ASC LIMIT ?"
  ).all(mskNowStamp(), Number(limit) || 20);
}
function listScheduled(limit = 100, scope) {
  const params = [];
  let where = " WHERE p.schedule_status IN ('scheduled', 'failed', 'cancelled', 'published')";
  if (scope && scope.userId != null) {
    where += scope.includeNull ? ' AND (g.user_id IS NULL OR g.user_id = ?)' : ' AND g.user_id = ?';
    params.push(Number(scope.userId));
  }
  params.push(Number(limit) || 100);
  return db.prepare(
    'SELECT p.id, p.goal_id, p.title, p.body, p.cta, p.image_status, p.image_path, p.created_at, p.scheduled_at, p.schedule_status, p.schedule_note, p.published_at, p.published_channel, g.goal_text, g.brand_id, b.name AS brand_name' +
    ' FROM posts p JOIN goals g ON p.goal_id = g.id LEFT JOIN brands b ON g.brand_id = b.id' + where +
    ' ORDER BY CASE p.schedule_status WHEN \'scheduled\' THEN 0 WHEN \'failed\' THEN 1 WHEN \'published\' THEN 2 ELSE 3 END, p.scheduled_at ASC LIMIT ?'
  ).all(...params);
}
function getScheduleState(id) {
  return db.prepare('SELECT schedule_status, scheduled_at FROM posts WHERE id = ?').get(Number(id));
}
function setSchedule(id, whenLocal, note) {
  db.prepare("UPDATE posts SET scheduled_at = ?, schedule_status = 'scheduled', schedule_note = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
    .run(String(whenLocal), note || null, Number(id));
  return db.prepare('SELECT id, scheduled_at, schedule_status FROM posts WHERE id = ?').get(Number(id));
}
function markSchedule(id, status, note) {
  db.prepare("UPDATE posts SET schedule_status = ?, schedule_note = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
    .run(String(status), note || null, Number(id));
  return db.prepare('SELECT id, schedule_status, schedule_note FROM posts WHERE id = ?').get(Number(id));
}
function clearSchedule(id) {
  db.prepare("UPDATE posts SET schedule_status = NULL, scheduled_at = NULL, schedule_note = NULL, updated_at = datetime('now', 'localtime') WHERE id = ?").run(Number(id));
  return db.prepare('SELECT id, schedule_status, scheduled_at FROM posts WHERE id = ?').get(Number(id));
}

/* ---------- settings ---------- */

function getSetting(key, dflt) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : dflt;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}





/* ---- brands (партнёрский режим, Приказ 21) ---- */
function listBrands(scope) {
  const base = "SELECT b.*, (SELECT COUNT(*) FROM posts p JOIN goals g ON p.goal_id = g.id WHERE g.brand_id = b.id) AS posts_count FROM brands b";
  if (scope && scope.userId != null) {
    const w = scope.includeNull ? ' WHERE (b.user_id IS NULL OR b.user_id = ?)' : ' WHERE b.user_id = ?';
    return db.prepare(base + w + ' ORDER BY b.created_at DESC').all(Number(scope.userId));
  }
  return db.prepare(base + ' ORDER BY b.created_at DESC').all();
}
function getBrand(id) {
  return db.prepare('SELECT * FROM brands WHERE id = ?').get(id);
}
function addBrand(name, description, userId) {
  const info = db.prepare('INSERT INTO brands (name, description, user_id) VALUES (?, ?, ?)').run(name, description || '', userId ? Number(userId) : null);
  return getBrand(Number(info.lastInsertRowid));
}
function renameBrand(id, name) {
  db.prepare('UPDATE brands SET name = ? WHERE id = ?').run(name, id);
  return getBrand(id);
}
function setBrandStatus(id, status) {
  db.prepare('UPDATE brands SET status = ? WHERE id = ?').run(status, id);
  return getBrand(id);
}
function deleteBrand(id) {
  db.prepare('UPDATE goals SET brand_id = NULL WHERE brand_id = ?').run(id);
  db.prepare('DELETE FROM brands WHERE id = ?').run(id);
  return { ok: true };
}


/* ---- channels (каналы брендов, Приказ 23) ---- */
function listChannels(brandId) {
  return db.prepare('SELECT * FROM channels WHERE brand_id = ? ORDER BY id').all(brandId);
}
function addChannel(brandId, chatId, title) {
  const info = db.prepare('INSERT INTO channels (brand_id, chat_id, title) VALUES (?, ?, ?)').run(brandId, chatId, title || '');
  return db.prepare('SELECT * FROM channels WHERE id = ?').get(Number(info.lastInsertRowid));
}
function deleteChannel(id) {
  db.prepare('DELETE FROM channels WHERE id = ?').run(id);
  return { ok: true };
}


/* ---- analytics (аналитика, Приказ 24) ---- */
function brandAnalytics(scope) {
  const has = !!(scope && scope.userId != null);
  const w = has ? (scope.includeNull ? ' WHERE (user_id IS NULL OR user_id = ?)' : ' WHERE user_id = ?') : '';
  const brands = has
    ? db.prepare('SELECT id, name, status, created_at FROM brands' + w + ' ORDER BY created_at DESC').all(Number(scope.userId))
    : db.prepare('SELECT id, name, status, created_at FROM brands ORDER BY created_at DESC').all();
  return brands.map((b) => {
    const goals = db.prepare('SELECT COUNT(*) n FROM goals WHERE brand_id = ?').get(b.id).n;
    const posts = db
      .prepare('SELECT COUNT(*) n FROM posts p JOIN goals g ON p.goal_id = g.id WHERE g.brand_id = ?')
      .get(b.id).n;
    const published = db
      .prepare("SELECT COUNT(*) n FROM posts p JOIN goals g ON p.goal_id = g.id WHERE g.brand_id = ? AND p.published_at IS NOT NULL")
      .get(b.id).n;
    const lastPub = db
      .prepare("SELECT p.published_at FROM posts p JOIN goals g ON p.goal_id = g.id WHERE g.brand_id = ? AND p.published_at IS NOT NULL ORDER BY p.published_at DESC LIMIT 1")
      .get(b.id);
    const channels = db.prepare('SELECT COUNT(*) n FROM channels WHERE brand_id = ?').get(b.id).n;
    return { id: b.id, name: b.name, status: b.status, goals, posts, published, channels, last_published_at: lastPub ? lastPub.published_at : null };
  });
}
function totalsAnalytics(scope) {
  const has = !!(scope && scope.userId != null);
  const uid = has ? Number(scope.userId) : null;
  const cond = (col) => has ? (scope.includeNull ? ' AND (' + col + ' IS NULL OR ' + col + ' = ?)' : ' AND ' + col + ' = ?') : '';
  const p = has ? [uid] : [];
  const goals = db.prepare('SELECT COUNT(*) n FROM goals WHERE 1=1' + cond('user_id')).get(...p).n;
  const posts = db.prepare('SELECT COUNT(*) n FROM posts p JOIN goals g ON p.goal_id = g.id WHERE 1=1' + cond('g.user_id')).get(...p).n;
  const published = db.prepare('SELECT COUNT(*) n FROM posts p JOIN goals g ON p.goal_id = g.id WHERE p.published_at IS NOT NULL' + cond('g.user_id')).get(...p).n;
  const brands = db.prepare('SELECT COUNT(*) n FROM brands WHERE 1=1' + cond('user_id')).get(...p).n;
  const channels = db.prepare('SELECT COUNT(*) n FROM channels c JOIN brands b ON c.brand_id = b.id WHERE 1=1' + cond('b.user_id')).get(...p).n;
  const unbound = db.prepare('SELECT COUNT(*) n FROM goals WHERE brand_id IS NULL' + cond('user_id')).get(...p).n;
  return { goals, posts, published, brands, channels, unbound };
}


/* ---- team (команда, Приказ 25) ---- */
function listTeam() {
  return db.prepare('SELECT * FROM team_members ORDER BY created_at DESC').all();
}
function addTeamMember(name, email, role) {
  const info = db.prepare('INSERT INTO team_members (name, email, role) VALUES (?, ?, ?)').run(name, email || '', role || 'creator');
  return db.prepare('SELECT * FROM team_members WHERE id = ?').get(Number(info.lastInsertRowid));
}
function setTeamRole(id, role) {
  db.prepare('UPDATE team_members SET role = ? WHERE id = ?').run(role, id);
  return db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
}
function getRoleByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  const r = db.prepare('SELECT role FROM team_members WHERE lower(email) = ? ORDER BY id DESC LIMIT 1').get(e);
  return r ? r.role : null;
}
function deleteTeamMember(id) {
  db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
  return { ok: true };
}

/* ---- O35: invites + mail queue (Приказ 35) ---- */
function createInvite(email, role, name) {
  db.prepare('DELETE FROM invites WHERE lower(email) = ? AND accepted_at IS NULL').run(String(email || '').trim().toLowerCase()); /* O35c: старые токены умирают при переприглашении */
  const token = crypto.randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO invites (token, email, role, name) VALUES (?, ?, ?, ?)')
    .run(token, String(email || '').trim().toLowerCase(), role || 'creator', String(name || '').slice(0, 80));
  return token;
}
function getInviteByToken(token) {
  return db.prepare('SELECT * FROM invites WHERE token = ?').get(String(token || '')) || null;
}
function getInviteByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  return db.prepare('SELECT * FROM invites WHERE lower(email) = ? ORDER BY id DESC LIMIT 1').get(e) || null;
}
function acceptInvite(id) {
  db.prepare('UPDATE invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL')
    .run(new Date().toISOString(), Number(id));
  return { ok: true };
}
function getTeamMember(id) {
  return db.prepare('SELECT * FROM team_members WHERE id = ?').get(Number(id)) || null;
}
function mailEnqueue(transport, subject, body, toAddr) {
  const info = db.prepare('INSERT INTO mail_queue (transport, subject, body, to_addr) VALUES (?, ?, ?, ?)')
    .run(transport || 'telegram', String(subject || ''), String(body || ''), toAddr || '');
  return Number(info.lastInsertRowid);
}
function mailQueueNext() {
  return db.prepare("SELECT * FROM mail_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get() || null;
}
function mailQueueMark(id, status, error) {
  db.prepare('UPDATE mail_queue SET status = ?, error = ?, attempts = attempts + 1, sent_at = ? WHERE id = ?')
    .run(String(status), error || null, status === 'sent' ? new Date().toISOString() : null, Number(id));
  return { ok: true };
}


/* ---- тарифы, лимиты, waitlist (Спринт 1) ---- */
function getPlan(code) {
  return db.prepare('SELECT * FROM plans WHERE code = ?').get(code);
}
function seedPlans() {
  const ins = db.prepare('INSERT OR IGNORE INTO plans (code, price_int, brands_max, channels_max, posts_daily_max) VALUES (?,?,?,?,?)');
  ins.run('start', 0, 1, 2, 1);
  ins.run('growth', 490, 1, 5, 4);
  ins.run('pro', 990, 3, 9999, 10);
  ins.run('agency', 2990, 10, 9999, 9999);
  ins.run('unlimited', 5990, 9999, 9999, 9999);
}
function getUserPlan(userKey) {
  const sub = db.prepare("SELECT plan_code FROM subscriptions WHERE user_key = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(userKey);
  return getPlan(sub ? sub.plan_code : 'start') || getPlan('start');
}
function countBrands(userId) {
  if (userId) return db.prepare('SELECT COUNT(*) n FROM brands WHERE user_id = ?').get(Number(userId)).n;
  return db.prepare('SELECT COUNT(*) n FROM brands WHERE user_id IS NULL').get().n; /* legacy owner */
}
function countChannels() {
  return db.prepare('SELECT COUNT(*) n FROM channels').get().n;
}
function mskDay() {
  const now = new Date(Date.now() + 3 * 3600 * 1000); /* UTC+3 МСК */
  return now.toISOString().slice(0, 10);
}
function postsToday(userKey) {
  const row = db.prepare('SELECT count FROM posts_today WHERE user_key = ? AND day = ?').get(userKey, mskDay());
  return row ? row.count : 0;
}
function bumpPostsToday(userKey) {
  db.prepare('INSERT INTO posts_today (user_key, day, count) VALUES (?, ?, 1) ON CONFLICT (user_key, day) DO UPDATE SET count = count + 1').run(userKey, mskDay());
}
function waitlistAdd(email, name) {
  const info = db.prepare('INSERT INTO waitlist (email, name) VALUES (?, ?)').run(email, name || '');
  return db.prepare('SELECT id, email FROM waitlist WHERE id = ?').get(Number(info.lastInsertRowid));
}

/* ---------- auth (Order 30) ---------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(pw, stored) {
  try {
    const parts = String(stored || '').split(':');
    if (parts.length !== 2) return false;
    const check = crypto.scryptSync(String(pw), parts[0], 64);
    const orig = Buffer.from(parts[1], 'hex');
    return orig.length === check.length && crypto.timingSafeEqual(orig, check);
  } catch (e) { return false; }
}
function createUser(email, passwordHash, name) {
  const info = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, passwordHash, String(name || '').slice(0, 80));
  return Number(info.lastInsertRowid);
}
function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase()) || null;
}
function getUserById(id) {
  return db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(Number(id)) || null;
}
function createSession(userId, token, expiresAtIso) {
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(String(token), Number(userId), String(expiresAtIso));
  return token;
}
function deleteSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(String(token));
}
function getSessionUser(token) {
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(String(token));
  if (!s) return null;
  if (!s.expires_at || Date.parse(s.expires_at) < Date.now()) { deleteSession(token); return null; }
  const u = getUserById(s.user_id);
  if (!u) { deleteSession(token); return null; }
  return u;
}
function countUsers() {
  return db.prepare('SELECT COUNT(*) n FROM users').get().n;
}
function minUserId() {
  const r = db.prepare('SELECT MIN(id) AS m FROM users').get();
  return r ? r.m : null;
}
function setUserPlan(userKey, planCode) {
  db.prepare("INSERT INTO subscriptions (user_key, plan_code, status, provider) VALUES (?, ?, 'active', 'seed')").run(String(userKey), String(planCode));
  return true;
}

function listSubscriptionsByUser(userKey) {
  return db.prepare('SELECT plan_code, status, provider, created_at FROM subscriptions WHERE user_key = ? ORDER BY id DESC LIMIT 20').all(String(userKey));
}
function renameUser(userId, name) {
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name || '').slice(0, 80), Number(userId));
  return getUserById(Number(userId));
}
function changeUserPassword(userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(String(passwordHash), Number(userId));
  return { ok: true };
}
function deleteAllSessions(userId, exceptToken) {
  if (exceptToken) db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(Number(userId), String(exceptToken));
  else db.prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(userId));
  return { ok: true };
}
/* O36b: lite recent posts (no body/cta leakage) + per-user channel count */
function listRecentPostsLite(limit) {
  return db.prepare('SELECT id, title, published_at, created_at FROM posts ORDER BY id DESC LIMIT ?').all(Number(limit) || 12);
}
function countChannelsForUser(userId, includeNull) {
  if (includeNull) return db.prepare('SELECT COUNT(*) n FROM channels c JOIN brands b ON c.brand_id = b.id WHERE b.user_id IS NULL OR b.user_id = ?').get(Number(userId)).n;
  return db.prepare('SELECT COUNT(*) n FROM channels c JOIN brands b ON c.brand_id = b.id WHERE b.user_id = ?').get(Number(userId)).n;
}

module.exports = {
  hashPassword, verifyPassword, createUser, getUserByEmail, getUserById, createSession, deleteSession, getSessionUser, countUsers, setUserPlan,
  listSubscriptionsByUser, renameUser, changeUserPassword, deleteAllSessions,
  listRecentPostsLite, countChannelsForUser,
  getPlan, seedPlans, getUserPlan, countBrands, countChannels, postsToday, bumpPostsToday, mskDay, waitlistAdd,
  listTeam, addTeamMember, setTeamRole, deleteTeamMember, getRoleByEmail, minUserId,
  createInvite, getInviteByToken, getInviteByEmail, acceptInvite, getTeamMember,
  mailEnqueue, mailQueueNext, mailQueueMark,
  listDueScheduled, listScheduled, getScheduleState, setSchedule, markSchedule, clearSchedule, mskNowStamp,
  brandAnalytics, totalsAnalytics,
  listChannels, addChannel, deleteChannel,
  listBrands, getBrand, addBrand, renameBrand, setBrandStatus, deleteBrand,
  addGoal, listGoals, getGoal,
  addPost, listPostsByGoal, getPost, updatePost, deletePost, countPostsByGoal, listAllPosts, deleteGoal, storageList,
  listPublications,
  getSetting, setSetting
};
