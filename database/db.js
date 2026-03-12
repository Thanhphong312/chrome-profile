const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

let db

function getDb() {
  if (db) return db

  const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'profiles.db')
    : path.join(__dirname, '..', 'profiles.db')

  db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id           INTEGER  PRIMARY KEY AUTOINCREMENT,
      name         TEXT     NOT NULL,
      proxy_host   TEXT     NOT NULL,
      proxy_port   INTEGER  NOT NULL,
      proxy_user   TEXT,
      proxy_pass   TEXT,
      proxy_type   TEXT     NOT NULL DEFAULT 'http',
      default_url  TEXT,
      profile_path TEXT     NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  return db
}

module.exports = { getDb }
