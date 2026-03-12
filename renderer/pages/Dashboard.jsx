import React, { useEffect, useState, useCallback } from 'react'
import ProfileCard from '../components/ProfileCard.jsx'

export default function Dashboard({ onEdit, onCreateNew }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading profiles...
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
        <p>No profiles yet.</p>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold"
        >
          Create your first profile
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Profiles{' '}
          <span className="text-gray-500 text-sm font-normal">({profiles.length})</span>
        </h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold"
        >
          + New Profile
        </button>
      </div>

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
