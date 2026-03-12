'use strict'
const { getDb } = require('../database/db')
const CryptoJS  = require('crypto-js')
const path      = require('path')
const fs        = require('fs')
const https     = require('https')
const { app }   = require('electron')
const { generateFingerprint, buildExtension } = require('./fingerprintGenerator')

const ENCRYPTION_KEY = 'cpm-secret-key-2024'

function encryptPassword(plaintext) {
  if (!plaintext) return ''
  return CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString()
}

function decryptPassword(ciphertext) {
  if (!ciphertext) return ''
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
}

function getProfilesDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'profiles')
    : path.join(__dirname, '..', 'profiles')
}

/**
 * Lookup timezone + country for a proxy host via ipinfo.io.
 * Returns { timezone, country } or {} on failure/timeout.
 */
function geoLocateProxy(host) {
  return new Promise((resolve) => {
    const req = https.get(`https://ipinfo.io/${host}/json`, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ timezone: json.timezone || null, country: json.country || null })
        } catch {
          resolve({})
        }
      })
    })
    req.on('error', () => resolve({}))
    req.setTimeout(4000, () => { req.destroy(); resolve({}) })
  })
}

/**
 * Lazily back-fills fingerprint for profiles created before this feature.
 */
function ensureFingerprint(profile) {
  if (profile.fp_user_agent) return profile
  const fp = generateFingerprint()
  buildExtension(profile.profile_path, fp)
  const setClauses = Object.keys(fp).map(k => `${k} = @${k}`).join(', ')
  getDb().prepare(`UPDATE profiles SET ${setClauses} WHERE id = @id`).run({ ...fp, id: profile.id })
  return { ...profile, ...fp }
}

async function createProfile(data) {
  const db          = getDb()
  const profilesDir = getProfilesDir()
  fs.mkdirSync(profilesDir, { recursive: true })

  const safeName    = data.name.replace(/[^a-zA-Z0-9_-]/g, '_')
  const profilePath = path.join(profilesDir, `${safeName}_${Date.now()}`)
  fs.mkdirSync(profilePath, { recursive: true })

  // Geo-lookup to match timezone & language to proxy location
  const geo = await geoLocateProxy(data.proxy_host)

  const fp = generateFingerprint(geo)
  buildExtension(profilePath, fp)

  const result = db.prepare(`
    INSERT INTO profiles (
      name, proxy_host, proxy_port, proxy_user, proxy_pass,
      proxy_type, default_url, profile_path,
      fp_user_agent, fp_platform, fp_hardware_concurrency, fp_device_memory,
      fp_language, fp_languages, fp_screen_width, fp_screen_height,
      fp_canvas_noise, fp_webgl_vendor, fp_webgl_renderer, fp_timezone
    ) VALUES (
      @name, @proxy_host, @proxy_port, @proxy_user, @proxy_pass,
      @proxy_type, @default_url, @profile_path,
      @fp_user_agent, @fp_platform, @fp_hardware_concurrency, @fp_device_memory,
      @fp_language, @fp_languages, @fp_screen_width, @fp_screen_height,
      @fp_canvas_noise, @fp_webgl_vendor, @fp_webgl_renderer, @fp_timezone
    )
  `).run({
    name:         data.name,
    proxy_host:   data.proxy_host,
    proxy_port:   Number(data.proxy_port),
    proxy_user:   data.proxy_user || '',
    proxy_pass:   encryptPassword(data.proxy_pass),
    proxy_type:   data.proxy_type || 'http',
    default_url:  data.default_url || '',
    profile_path: profilePath,
    ...fp,
  })

  return getProfileById(result.lastInsertRowid)
}

function getAllProfiles() {
  const rows = getDb().prepare('SELECT * FROM profiles ORDER BY created_at DESC').all()
  return rows.map(row => ({ ...row, proxy_pass: decryptPassword(row.proxy_pass) }))
}

function getProfileById(id) {
  const row = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(id)
  if (!row) return null
  return { ...row, proxy_pass: decryptPassword(row.proxy_pass) }
}

function updateProfile(id, data) {
  getDb().prepare(`
    UPDATE profiles SET
      name        = @name,
      proxy_host  = @proxy_host,
      proxy_port  = @proxy_port,
      proxy_user  = @proxy_user,
      proxy_pass  = @proxy_pass,
      proxy_type  = @proxy_type,
      default_url = @default_url
    WHERE id = @id
  `).run({
    id,
    name:        data.name,
    proxy_host:  data.proxy_host,
    proxy_port:  Number(data.proxy_port),
    proxy_user:  data.proxy_user || '',
    proxy_pass:  encryptPassword(data.proxy_pass),
    proxy_type:  data.proxy_type || 'http',
    default_url: data.default_url || '',
  })
  return getProfileById(id)
}

function deleteProfile(id) {
  const profile = getProfileById(id)
  if (profile?.profile_path) {
    try { fs.rmSync(profile.profile_path, { recursive: true, force: true }) } catch (e) {}
  }
  getDb().prepare('DELETE FROM profiles WHERE id = ?').run(id)
  return { success: true }
}

/**
 * Parse proxy lines in format: user:pass@host:port
 * Returns array of profile data objects, or throws on bad format.
 */
function parseProxyFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  return lines.map((line, i) => {
    const atIdx = line.lastIndexOf('@')
    if (atIdx === -1) throw new Error(`Line ${i + 1}: missing @ separator`)
    const creds    = line.substring(0, atIdx)
    const hostPort = line.substring(atIdx + 1)
    const [host, portStr] = hostPort.split(':')
    const colonIdx = creds.indexOf(':')
    if (colonIdx === -1 || !host || !portStr) throw new Error(`Line ${i + 1}: invalid format`)
    return {
      proxy_user: creds.substring(0, colonIdx),
      proxy_pass: creds.substring(colonIdx + 1),
      proxy_host: host,
      proxy_port: parseInt(portStr, 10),
      proxy_type: 'http',
    }
  })
}

/**
 * Bulk import: parse file, create one profile per proxy.
 * Returns array of created profiles.
 */
async function importProxiesFromFile(filePath, defaultUrl = '') {
  const proxies = parseProxyFile(filePath)
  const created = []
  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i]
    const profile = await createProfile({
      name:        `Profile ${i + 1} — ${proxy.proxy_host}:${proxy.proxy_port}`,
      default_url: defaultUrl,
      ...proxy,
    })
    created.push(profile)
  }
  return created
}

module.exports = {
  createProfile, getAllProfiles, getProfileById,
  updateProfile, deleteProfile, ensureFingerprint,
  importProxiesFromFile,
}
