const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { app, BrowserWindow, ipcMain } = require('electron')
const { registerDesktopBackendIpc } = require('./backend-ipc.cjs')

const pkg = require('../package.json')

let mainWindow = null
let mainBackendWorker = null
let backendIpc = null
let pear = null

function createWindow() {
  process.env.KEPOS_DESKTOP_STORAGE_BASE_PATH = getDesktopStorageBasePath()

  mainWindow = new BrowserWindow({
    height: 760,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false
    },
    width: 1080
  })

  if (backendIpc) {
    backendIpc.setWebContents(mainWindow.webContents)
  } else {
    backendIpc = registerDesktopBackendIpc({
      ipcMain,
      webContents: mainWindow.webContents
    })
  }
  void connectMainBackend()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  void mainWindow.loadFile(path.join(__dirname, '..', 'index.html'))
}

async function connectMainBackend() {
  if (!backendIpc || mainBackendWorker) return

  const { createDesktopBackendWorkerHost } = await import(
    pathToFileURL(path.join(__dirname, '..', '..', 'src', 'desktop-backend-worker-host.js')).href
  )
  mainBackendWorker = createDesktopBackendWorkerHost({
    storageBasePath: getDesktopStorageBasePath()
  })
  backendIpc.connectBackend(mainBackendWorker.backendHost.bridge)
}

async function startPearRuntime() {
  try {
    const { default: PearRuntime } = await import('pear-runtime')
    const runtime = new PearRuntime({
      ...pkg,
      app: getAppPath(),
      dir: path.join(app.getPath('userData'), 'pear-runtime'),
      name: pkg.productName || pkg.name,
      storage: path.join(app.getPath('userData'), 'pear-storage'),
      updates: false
    })

    runtime.on('error', (error) => {
      console.error('[pear-runtime]', error)
    })

    pear = runtime
    await runtime.ready()
  } catch (error) {
    console.error('[pear-runtime] failed to start', error)
  }
}

function getAppPath() {
  if (!app.isPackaged) return null
  if (process.platform === 'linux' && process.env.APPIMAGE) return process.env.APPIMAGE
  if (process.platform === 'win32') return process.execPath
  return path.join(process.resourcesPath, '..', '..')
}

function getDesktopStorageBasePath() {
  return path.join(app.getPath('userData'), 'kepos', 'v1')
}

app.whenReady().then(() => {
  createWindow()
  if (process.env.KEPOS_SMOKE_DESKTOP !== '1') void startPearRuntime()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  if (!pear && !mainBackendWorker) return

  event.preventDefault()
  const runtime = pear
  const backendWorker = mainBackendWorker
  pear = null
  mainBackendWorker = null
  Promise.allSettled([runtime?.close(), backendWorker?.close()]).finally(() => app.quit())
})
