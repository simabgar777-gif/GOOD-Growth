'use strict';
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/goodgrowth.db');
try { db.exec('ALTER TABLE goals ADD COLUMN brand_id INTEGER'); console.log('COL_ADDED'); }
catch (e) { console.log('COL_EXISTS'); }
db.close();
