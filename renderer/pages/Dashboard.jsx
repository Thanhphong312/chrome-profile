import React, { useEffect, useState, useCallback } from 'react'
import ProfileCard from '../components/ProfileCard.jsx'

export default function Dashboard({ onEdit, onCreateNew }) {
  const [profiles,   setProfiles]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [importing,  setImporting]  = useState(false)
  const [importMsg,  setImportMsg]  = useState(null)

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getProfiles()
      setProfiles(data)
    } catch (e) {
      console.error('Failed to load profiles:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  async function handleDelete(id) {
    await window.electronAPI.deleteProfile(id)
    loadProfiles()
  }

  async function handleImport() {
    const filePath = await window.electronAPI.openFilePicker()
    if (!filePath) return

    setImporting(true)
    setImportMsg(null)
    try {
      const result = await window.electronAPI.importProxies(filePath, '')
      if (result.success) {
        setImportMsg({ type: 'ok', text: `✓ Imported ${result.count} profiles (geo-lookup timezone per proxy)` })
        loadProfiles()
      } else {
        setImportMsg({ type: 'err', text: `✗ ${result.error}` })
      }
    } catch (e) {
      setImportMsg({ type: 'err', text: e.message })
    } finally {
      setImporting(false)
      setTimeout(() => setImportMsg(null), 5000)
    }
  }

  const header = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-white">
        Profiles{' '}
        {profiles.length > 0 && (
          <span className="text-gray-500 text-sm font-normal">({profiles.length})</span>
        )}
      </h2>
      <div className="flex gap-2">
        <button
          onClick={handleImport}
          disabled={importing}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 rounded-lg text-sm font-semibold transition-colors"
        >
          {importing ? 'Importing...' : '↑ Import Proxies'}
        </button>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold"
        >
          + New Profile
        </button>
      </div>
    </div>
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  }

  if (profiles.length === 0) {
    return (
      <div>
        {header}
        {importMsg && (
          <p className={`text-sm mb-4 px-3 py-2 rounded ${importMsg.type === 'ok' ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>
            {importMsg.text}
          </p>
        )}
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-gray-500">
          <p>No profiles yet. Import a proxy file or create one manually.</p>
          <button onClick={onCreateNew} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold">
            Create your first profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {header}
      {importMsg && (
        <p className={`text-sm mb-4 px-3 py-2 rounded ${importMsg.type === 'ok' ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>
          {importMsg.text}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
