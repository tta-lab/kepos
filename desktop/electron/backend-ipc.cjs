const DESKTOP_COMMANDS = [
  'acceptMessageRequest',
  'commentTreehole',
  'ignoreMessageRequest',
  'joinHome',
  'joinHomeUri',
  'leaveHome',
  'likeTreehole',
  'postTreehole',
  'revokeContact',
  'sendDmMessage',
  'sendHomeMessage',
  'sendMessageRequest',
  'trustProfileUri'
]

const DESKTOP_EVENTS = [
  'contactBookChanged',
  'dmMessageReceived',
  'dmThreadChanged',
  'errorReceived',
  'homeMessageReceived',
  'peerCountChanged',
  'statusChanged',
  'treeholeStateChanged'
]

const DISPATCH_CHANNEL = 'kepos:backend:dispatch'
const EVENT_CHANNEL = 'kepos:backend:event'
const SUBSCRIBE_CHANNEL = 'kepos:backend:subscribe'
const UNSUBSCRIBE_CHANNEL = 'kepos:backend:unsubscribe'

const COMMAND_SET = new Set(DESKTOP_COMMANDS)
const EVENT_SET = new Set(DESKTOP_EVENTS)

function createDesktopElectronBackendBridge({ dispatch, ipcMain, webContents }) {
  const subscriptions = new Map()
  let currentWebContents = webContents
  let currentDispatch = dispatch

  ipcMain.handle(DISPATCH_CHANNEL, (_event, command, payload) => {
    assertCommand(command)
    return currentDispatch(command, payload)
  })

  ipcMain.on(SUBSCRIBE_CHANNEL, (_event, listenerId, event) => {
    assertListenerId(listenerId)
    assertEvent(event)
    subscriptions.set(listenerId, event)
  })

  ipcMain.on(UNSUBSCRIBE_CHANNEL, (_event, listenerId) => {
    assertListenerId(listenerId)
    subscriptions.delete(listenerId)
  })

  return {
    commands: DESKTOP_COMMANDS,
    connectBackend(backend) {
      if (!backend || typeof backend.dispatch !== 'function') {
        throw new Error('Desktop backend dispatch must be a function')
      }

      currentDispatch = backend.dispatch
    },
    emit(event, payload) {
      assertEvent(event)

      for (const [listenerId, subscribedEvent] of subscriptions) {
        if (subscribedEvent !== event) continue

        currentWebContents.send(EVENT_CHANNEL, {
          event,
          listenerId,
          payload
        })
      }
    },
    events: DESKTOP_EVENTS,
    setWebContents(nextWebContents) {
      currentWebContents = nextWebContents
    }
  }
}

function registerDesktopBackendIpc({ ipcMain, webContents }) {
  return createDesktopElectronBackendBridge({
    dispatch(command) {
      throw new Error(`Desktop backend bridge is not connected: ${command}`)
    },
    ipcMain,
    webContents
  })
}

function assertCommand(command) {
  if (!COMMAND_SET.has(command)) throw new Error(`Unknown desktop command: ${command}`)
}

function assertEvent(event) {
  if (!EVENT_SET.has(event)) throw new Error(`Unknown desktop event: ${event}`)
}

function assertListenerId(listenerId) {
  if (typeof listenerId !== 'string' || listenerId.length === 0) {
    throw new Error('Desktop backend listener id is required')
  }
}

module.exports = {
  createDesktopElectronBackendBridge,
  registerDesktopBackendIpc
}
