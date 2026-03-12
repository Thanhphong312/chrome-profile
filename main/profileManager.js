const { getDb } = require('../database/db')
const CryptoJS = require('crypto-js')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

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

function createProfile(data) {
  const db = getDb()
  const profilesDir = getProfilesDir()
  fs.mkdirSync(profilesDir, { recursive: true })

  const safeName = data.name.replace(/[^a-zA-Z0-9_-]/g, '_')
  const profilePath = path.join(profilesDir, `${safeName}_${Date.now()}`)
  fs.mkdirSync(profilePath, { recursive: true })

  const result = db.prepare(`
    INSERT INTO profiles
      (name, proxy_host, proxy_port, proxy_user, proxy_pass, proxy_type, default_url, profile_path)
    VALUES
      (@name, @proxy_host, @proxy_port, @proxy_user, @proxy_pass, @proxy_type, @default_url, @profile_path)
  `).run({
    name: data.name,
    proxy_host: data.proxy_host,
    proxy_port: Number(data.proxy_port),
    proxy_user: data.proxy_user || '',
    proxy_pass: encryptPassword(data.proxy_pass),
    proxy_type: data.proxy_type || 'http',
    default_url: data.default_url || '',
    profile_path: profilePath,
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
      name       = @name,
      proxy_host = @proxy_host,
      proxy_port = @proxy_port,
      proxy_user = @proxy_user,
      proxy_pass = @proxy_pass,
      proxy_type = @proxy_type,
      default_url = @default_url
    WHERE id = @id
  `).run({
    id,
    name: data.name,
    proxy_host: data.proxy_host,
    proxy_port: Number(data.proxy_port),
    proxy_user: data.proxy_user || '',
    proxy_pass: encryptPassword(data.proxy_pass),
    proxy_type: data.proxy_type || 'http',
    default_url: data.default_url || '',
  })
  return getProfileById(id)
}

function deleteProfile(id) {
  const profile = getProfileById(id)
  if (profile?.profile_path) {
    try {
      fs.rmSync(profile.profile_path, { recursive: true, force: true })
    } catch (e) {
      console.error('Failed to remove profile directory:', e.message)
    }
  }
  getDb().prepare('DELETE FROM profiles WHERE id = ?').run(id)
  return { success: true }
}

module.exports = { createProfile, getAllProfiles, getProfileById, updateProfile, deleteProfile }
