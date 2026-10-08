'use strict';
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/goodgrowth.db');
db.exec(`CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'creator',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
console.log('TEAM_TABLE_OK');
db.close();
