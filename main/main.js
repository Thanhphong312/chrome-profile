const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { createProfile, getAllProfiles, getProfileById, updateProfile, deleteProfile } = require('./profileManager')
const { runProfile, isProfileRunning, stopProfile } = require('./chromeManager')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Chrome Proxy Manager',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('profiles:get-all', () => getAllProfiles())

ipcMain.handle('profiles:create', (_, data) => createProfile(data))

ipcMain.handle('profiles:update', (_, data) => {
  const { id, ...rest } = data
  return updateProfile(id, rest)
})

ipcMain.handle('profiles:delete', (_, { id }) => deleteProfile(id))

ipcMain.handle('profiles:run', async (_, { id }) => {
  const profile = getProfileById(id)
  if (!profile) return { success: false, error: 'Profile not found' }
  return runProfile(profile)
})

ipcMain.handle('profiles:is-running', (_, { id }) => isProfileRunning(id))

ipcMain.handle('profiles:stop', (_, { id }) => stopProfile(id))
