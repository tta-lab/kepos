const path = require('node:path')
const { app, BrowserWindow } = require('electron')

const pkg = require('../package.json')

let mainWindow = null
let pear = null

function createWindow() {
  mainWindow = new BrowserWindow({
    height: 760,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false
    },
    width: 1080
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  void mainWindow.loadFile(path.join(__dirname, '..', 'index.html'))
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

app.whenReady().then(() => {
  createWindow()
  void startPearRuntime()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  if (!pear) return

  event.preventDefault()
  const runtime = pear
  pear = null
  runtime.close().finally(() => app.quit())
})
