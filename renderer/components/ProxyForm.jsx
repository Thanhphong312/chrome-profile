import React, { useState, useEffect } from 'react'

const EMPTY = {
  name: '',
  proxy_type: 'http',
  proxy_host: '',
  proxy_port: '',
  proxy_user: '',
  proxy_pass: '',
  default_url: '',
}

const inputCls = 'w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500'
const labelCls = 'block text-xs text-gray-400 mb-1 uppercase tracking-wider'

export default function ProxyForm({ initialValues, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(initialValues
      ? {
          name: initialValues.name || '',
          proxy_type: initialValues.proxy_type || 'http',
          proxy_host: initialValues.proxy_host || '',
          proxy_port: initialValues.proxy_port || '',
          proxy_user: initialValues.proxy_user || '',
          proxy_pass: initialValues.proxy_pass || '',
          default_url: initialValues.default_url || '',
        }
      : EMPTY
    )
    setErrors({})
  }, [initialValues])

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())       e.name = 'Required'
    if (!form.proxy_host.trim()) e.proxy_host = 'Required'
    const port = Number(form.proxy_port)
    if (!form.proxy_port || isNaN(port) || port < 1 || port > 65535)
      e.proxy_port = 'Must be 1–65535'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await onSubmit({ ...form, proxy_port: Number(form.proxy_port) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className={labelCls}>Profile Name</label>
        <input type="text" value={form.name} onChange={set('name')}
          placeholder="e.g. Gmail Account 1" className={inputCls} />
        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className={labelCls}>Proxy Type</label>
        <select value={form.proxy_type} onChange={set('proxy_type')}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
          <option value="socks5">SOCKS5</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Proxy Host</label>
          <input type="text" value={form.proxy_host} onChange={set('proxy_host')}
            placeholder="e.g. 45.12.23.11" className={inputCls} />
          {errors.proxy_host && <p className="text-xs text-red-400 mt-1">{errors.proxy_host}</p>}
        </div>
        <div>
          <label className={labelCls}>Port</label>
          <input type="number" value={form.proxy_port} onChange={set('proxy_port')}
            placeholder="1080" className={inputCls} />
          {errors.proxy_port && <p className="text-xs text-red-400 mt-1">{errors.proxy_port}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Username (optional)</label>
        <input type="text" value={form.proxy_user} onChange={set('proxy_user')}
          placeholder="username" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Password (optional)</label>
        <input type="password" value={form.proxy_pass} onChange={set('proxy_pass')}
          placeholder="••••••••" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Default URL (optional)</label>
        <input type="url" value={form.default_url} onChange={set('default_url')}
          placeholder="https://gmail.com" className={inputCls} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors">
          {loading ? 'Saving...' : (initialValues ? 'Update Profile' : 'Create Profile')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
