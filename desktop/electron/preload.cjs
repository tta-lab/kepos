const { contextBridge, ipcRenderer } = require('electron')

let nextListenerId = 1
let backendConnected = false
const connectedListeners = new Set()
const listeners = new Map()

function exposeDesktopApi(name, api) {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld(name, api)
    return
  }

  globalThis[name] = api
}

ipcRenderer.on('kepos:backend:connected', (_event, connected) => {
  backendConnected = connected === true
  for (const listener of connectedListeners) listener(backendConnected)
})

ipcRenderer.on('kepos:backend:event', (_event, message) => {
  const listener = listeners.get(message?.listenerId)
  if (!listener || listener.event !== message.event) return

  listener.handler(message.payload)
})

exposeDesktopApi('keposBackend', {
  dispatch(command, payload) {
    return ipcRenderer.invoke('kepos:backend:dispatch', command, payload)
  },
  isConnected() {
    return backendConnected
  },
  onConnected(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Desktop backend connected handler must be a function')
    }

    connectedListeners.add(handler)
    return () => connectedListeners.delete(handler)
  },
  subscribe(event, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Desktop backend event handler must be a function')
    }

    const listenerId = `listener-${nextListenerId++}`
    listeners.set(listenerId, { event, handler })
    ipcRenderer.send('kepos:backend:subscribe', listenerId, event)

    return () => {
      listeners.delete(listenerId)
      ipcRenderer.send('kepos:backend:unsubscribe', listenerId)
    }
  }
})

exposeDesktopApi('keposDesktopConfig', {
  storageBasePath: process.env.KEPOS_DESKTOP_STORAGE_BASE_PATH
})
