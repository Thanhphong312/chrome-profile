'use strict'
const { spawn } = require('child_process')
const path = require('path')
const { prepareProxy, closeProxy } = require('./proxyManager')
const { ensureFingerprint } = require('./profileManager')

// profileId -> ChildProcess
const runningProfiles = new Map()

function getChromePath() {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  }
  return '/usr/bin/google-chrome'
}

async function runProfile(profileIn) {
  // Back-fill fp data for profiles created before the fingerprint feature
  const profile = ensureFingerprint(profileIn)
  const { id } = profile

  if (runningProfiles.has(id)) {
    runningProfiles.get(id).kill()
    runningProfiles.delete(id)
    await closeProxy(id)
  }

  let proxyUrl
  if (profile.proxy_host) {
    proxyUrl = await prepareProxy(profile)
  }

  const extPath = path.join(profile.profile_path, 'fp-ext')

  const args = [
    `--user-data-dir=${profile.profile_path}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',

    // Fingerprint spoofing
    `--user-agent=${profile.fp_user_agent}`,
    `--lang=${profile.fp_language}`,
    `--load-extension=${extPath}`,

    // Prevent real IP leak via WebRTC
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',

    // Remove automation detection flag
    '--disable-blink-features=AutomationControlled',
  ]

  if (proxyUrl) args.push(`--proxy-server=${proxyUrl}`)
  if (profile.default_url) args.push(profile.default_url)

  const child = spawn(getChromePath(), args, {
    detached: false,
    stdio: 'ignore',
    env: { ...process.env, TZ: profile.fp_timezone },
  })

  runningProfiles.set(id, child)

  child.on('exit', async (code) => {
    console.log(`Profile ${id} Chrome exited (code ${code})`)
    runningProfiles.delete(id)
    await closeProxy(id)
  })

  child.on('error', (err) => {
    console.error(`Failed to spawn Chrome for profile ${id}:`, err.message)
    runningProfiles.delete(id)
  })

  return { success: true, pid: child.pid }
}

function isProfileRunning(profileId) {
  return runningProfiles.has(profileId)
}

async function stopProfile(profileId) {
  if (!runningProfiles.has(profileId)) return { success: false, error: 'Not running' }
  runningProfiles.get(profileId).kill()
  runningProfiles.delete(profileId)
  await closeProxy(profileId)
  return { success: true }
}

module.exports = { runProfile, isProfileRunning, stopProfile }
