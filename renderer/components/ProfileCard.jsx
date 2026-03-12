import React, { useState, useEffect, useRef } from 'react'

function osLabel(platform) {
  if (!platform) return null
  if (platform.startsWith('Win'))  return 'Windows'
  if (platform.startsWith('Mac'))  return 'macOS'
  if (platform.includes('Linux'))  return 'Linux'
  return platform
}

export default function ProfileCard({ profile, onEdit, onDelete }) {
  const [running,   setRunning]   = useState(false)
  const [launching, setLaunching] = useState(false)
  const [error,     setError]     = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const r = await window.electronAPI.isProfileRunning(profile.id)
        if (!cancelled) setRunning(r)
      } catch {}
    }
    check()
    pollRef.current = setInterval(check, 2000)
    return () => { cancelled = true; clearInterval(pollRef.current) }
  }, [profile.id])

  async function handleRun() {
    setLaunching(true); setError(null)
    try {
      const result = await window.electronAPI.runProfile(profile.id)
      if (!result.success) setError(result.error || 'Failed to launch Chrome')
      else setRunning(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLaunching(false)
    }
  }

  async function handleStop() {
    try {
      await window.electronAPI.stopProfile(profile.id)
      setRunning(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${profile.name}"? Chrome data will be removed.`)) return
    if (running) await window.electronAPI.stopProfile(profile.id)
    await onDelete(profile.id)
  }

  const proxyDisplay = `${profile.proxy_type}://${profile.proxy_host}:${profile.proxy_port}`
  const hasAuth      = profile.proxy_user ? ` (${profile.proxy_user})` : ''

  const fpOS  = osLabel(profile.fp_platform)
  const fpRes = profile.fp_screen_width ? `${profile.fp_screen_width}×${profile.fp_screen_height}` : null
  const fpTZ  = profile.fp_timezone || null
  const hasFp = fpOS || fpRes || fpTZ

  return (
    <div className={`bg-gray-800 border rounded-xl p-5 flex flex-col gap-3 transition-colors ${
      running ? 'border-green-600' : 'border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {running && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />}
          <h3 className="font-semibold text-white text-base truncate">{profile.name}</h3>
        </div>
        <div className="flex gap-2 ml-2 shrink-0">
          <button onClick={() => onEdit(profile)}
            className="text-xs text-gray-400 hover:text-blue-400 transition-colors">Edit</button>
          <button onClick={handleDelete}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors">Delete</button>
        </div>
      </div>

      {/* Running badge */}
      {running && (
        <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Profile Running
        </div>
      )}

      {/* Info */}
      <div className="text-sm space-y-2">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Proxy</p>
          <p className="font-mono text-blue-300 text-xs break-all">{proxyDisplay}{hasAuth}</p>
        </div>

        {profile.default_url && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">URL</p>
            <p className="text-gray-300 text-xs truncate">{profile.default_url}</p>
          </div>
        )}

        {/* Fingerprint badges */}
        {hasFp && (
          <div className="border-t border-gray-700 pt-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Fingerprint</p>
            <div className="flex flex-wrap gap-1.5">
              {fpOS && (
                <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded-full">
                  {fpOS}
                </span>
              )}
              {fpRes && (
                <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded-full">
                  {fpRes}
                </span>
              )}
              {fpTZ && (
                <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded-full">
                  {fpTZ}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">{error}</p>}

      {running ? (
        <button onClick={handleStop}
          className="mt-auto w-full py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600 text-white active:scale-95 transition-all">
          Stop Profile
        </button>
      ) : (
        <button onClick={handleRun} disabled={launching}
          className={`mt-auto w-full py-2 rounded-lg text-sm font-semibold transition-all ${
            launching
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
          }`}>
          {launching ? 'Launching...' : 'Run Profile'}
        </button>
      )}
    </div>
  )
}
