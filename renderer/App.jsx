import React, { useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Profiles from './pages/Profiles.jsx'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [editingProfile, setEditingProfile] = useState(null)

  function handleEdit(profile) {
    setEditingProfile(profile)
    setPage('profiles')
  }

  function handleCreateNew() {
    setEditingProfile(null)
    setPage('profiles')
  }

  function handleSaved() {
    setEditingProfile(null)
    setPage('dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <span className="text-blue-400 font-bold text-lg tracking-tight mr-2">
          Chrome Proxy Manager
        </span>
        <button
          onClick={() => setPage('dashboard')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            page === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={handleCreateNew}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            page === 'profiles'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          + New Profile
        </button>
      </nav>

      <main className="p-6">
        {page === 'dashboard' && (
          <Dashboard onEdit={handleEdit} onCreateNew={handleCreateNew} />
        )}
        {page === 'profiles' && (
          <Profiles initialProfile={editingProfile} onSaved={handleSaved} />
        )}
      </main>
    </div>
  )
}
