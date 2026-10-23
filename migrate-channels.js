'use strict';
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/goodgrowth.db');
db.exec(`CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL,
  chat_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
console.log('CHANNELS_TABLE_OK');
db.close();
