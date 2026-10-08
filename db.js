'use strict';
/* GOOD Growth - local storage (SQLite, built into Node 22+).
   One file: data\goodgrowth.db. No server, no setup.
   Door 2: posts. Door 3: publication records on posts. */

const fs = require('node:fs');
const path = require('node:path');
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
`);

/* Door 3 migration: publication columns (safe if already added) */
const MIGRATIONS = [
  'ALTER TABLE posts ADD COLUMN published_at TEXT',
  'ALTER TABLE posts ADD COLUMN published_message_id INTEGER',
  'ALTER TABLE posts ADD COLUMN published_channel TEXT'
];
for (const sql of MIGRATIONS) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

/* ---------- goals ---------- */

function addGoal(goalText, strategyJson, source, model, brandId) {
  const info = db
    .prepare('INSERT INTO goals (goal_text, strategy_json, source, model, brand_id) VALUES (?, ?, ?, ?, ?)')
    .run(goalText, strategyJson, source, model || null, brandId ? Number(brandId) : null);
  return getGoal(Number(info.lastInsertRowid));
}

function listGoals(limit = 50, brandId) {
  if (brandId) {
    return db
      .prepare('SELECT id, goal_text, source, created_at, brand_id FROM goals WHERE brand_id = ? ORDER BY id DESC LIMIT ?')
      .all(Number(brandId), limit);
  }
  return db
    .prepare('SELECT id, goal_text, source, created_at, brand_id FROM goals ORDER BY id DESC LIMIT ?')
    .all(limit);
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
    'published_at', 'published_message_id', 'published_channel'];
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
function listPublications(limit = 50) {
  return db
    .prepare("SELECT id, goal_id, title, published_at, published_message_id, published_channel FROM posts WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT ?")
    .all(limit);
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
function listBrands() {
  return db
    .prepare(
      "SELECT b.*, (SELECT COUNT(*) FROM posts p JOIN goals g ON p.goal_id = g.id WHERE g.brand_id = b.id) AS posts_count FROM brands b ORDER BY b.created_at DESC"
    )
    .all();
}
function getBrand(id) {
  return db.prepare('SELECT * FROM brands WHERE id = ?').get(id);
}
function addBrand(name, description) {
  const info = db.prepare('INSERT INTO brands (name, description) VALUES (?, ?)').run(name, description || '');
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
function brandAnalytics() {
  const brands = db.prepare('SELECT id, name, status, created_at FROM brands ORDER BY created_at DESC').all();
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
function totalsAnalytics() {
  const goals = db.prepare('SELECT COUNT(*) n FROM goals').get().n;
  const posts = db.prepare('SELECT COUNT(*) n FROM posts').get().n;
  const published = db.prepare('SELECT COUNT(*) n FROM posts WHERE published_at IS NOT NULL').get().n;
  const brands = db.prepare('SELECT COUNT(*) n FROM brands').get().n;
  const channels = db.prepare('SELECT COUNT(*) n FROM channels').get().n;
  const unbound = db.prepare('SELECT COUNT(*) n FROM goals WHERE brand_id IS NULL').get().n;
  return { goals, posts, published, brands, channels, unbound };
}

module.exports = {
  brandAnalytics, totalsAnalytics,
  listChannels, addChannel, deleteChannel,
  listBrands, getBrand, addBrand, renameBrand, setBrandStatus, deleteBrand,
  addGoal, listGoals, getGoal,
  addPost, listPostsByGoal, getPost, updatePost, deletePost, countPostsByGoal, listAllPosts,
  listPublications,
  getSetting, setSetting
};
