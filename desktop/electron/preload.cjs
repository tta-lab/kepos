const { contextBridge, ipcRenderer } = require('electron')

let nextListenerId = 1
const listeners = new Map()

ipcRenderer.on('kepos:backend:event', (_event, message) => {
  const listener = listeners.get(message?.listenerId)
  if (!listener || listener.event !== message.event) return

  listener.handler(message.payload)
})

contextBridge.exposeInMainWorld('keposBackend', {
  dispatch(command, payload) {
    return ipcRenderer.invoke('kepos:backend:dispatch', command, payload)
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
