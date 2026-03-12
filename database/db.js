const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

let db

const FP_COLUMNS = [
  { name: 'fp_user_agent',           type: 'TEXT' },
  { name: 'fp_platform',             type: 'TEXT' },
  { name: 'fp_hardware_concurrency', type: 'INTEGER' },
  { name: 'fp_device_memory',        type: 'INTEGER' },
  { name: 'fp_language',             type: 'TEXT' },
  { name: 'fp_languages',            type: 'TEXT' },
  { name: 'fp_screen_width',         type: 'INTEGER' },
  { name: 'fp_screen_height',        type: 'INTEGER' },
  { name: 'fp_canvas_noise',         type: 'TEXT' },
  { name: 'fp_webgl_vendor',         type: 'TEXT' },
  { name: 'fp_webgl_renderer',       type: 'TEXT' },
  { name: 'fp_timezone',             type: 'TEXT' },
]

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

  // Migration: add fingerprint columns if missing
  const existing = new Set(
    db.prepare('PRAGMA table_info(profiles)').all().map(r => r.name)
  )
  for (const col of FP_COLUMNS) {
    if (!existing.has(col.name)) {
      db.exec(`ALTER TABLE profiles ADD COLUMN ${col.name} ${col.type}`)
    }
  }

  return db
}

module.exports = { getDb }
