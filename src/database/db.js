const Database = require('better-sqlite3');
const config = require('../config');

const db = new Database(config.database.path);
db.pragma('journal_mode = WAL');

module.exports = db;
