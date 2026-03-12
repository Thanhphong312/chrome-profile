import React from 'react'
import ProxyForm from '../components/ProxyForm.jsx'

export default function Profiles({ initialProfile, onSaved }) {
  const isEditing = !!initialProfile

  async function handleSubmit(data) {
    if (isEditing) {
      await window.electronAPI.updateProfile({ id: initialProfile.id, ...data })
    } else {
      await window.electronAPI.createProfile(data)
    }
    onSaved()
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-white mb-6">
        {isEditing ? `Edit: ${initialProfile.name}` : 'Create New Profile'}
      </h2>
      <ProxyForm
        initialValues={initialProfile}
        onSubmit={handleSubmit}
        onCancel={onSaved}
      />
    </div>
  )
}
