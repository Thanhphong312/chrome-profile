const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getProfiles:      ()     => ipcRenderer.invoke('profiles:get-all'),
  createProfile:    (data) => ipcRenderer.invoke('profiles:create', data),
  updateProfile:    (data) => ipcRenderer.invoke('profiles:update', data),
  deleteProfile:    (id)   => ipcRenderer.invoke('profiles:delete', { id }),
  runProfile:       (id)   => ipcRenderer.invoke('profiles:run', { id }),
  isProfileRunning: (id)   => ipcRenderer.invoke('profiles:is-running', { id }),
  stopProfile:      (id)   => ipcRenderer.invoke('profiles:stop', { id }),
  openFilePicker:   ()     => ipcRenderer.invoke('dialog:open-file'),
  importProxies:    (filePath, defaultUrl) => ipcRenderer.invoke('proxies:import-file', { filePath, defaultUrl }),
})
