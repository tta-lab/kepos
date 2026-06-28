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
  'trustProfileUri',
  'updateDisplayName'
]

const DESKTOP_EVENTS = [
  'contactBookChanged',
  'contextFormDraftChanged',
  'desktopStateChanged',
  'directComposerRecipientChanged',
  'dmMessageReceived',
  'dmThreadChanged',
  'errorReceived',
  'homeMessageReceived',
  'peerCountChanged',
  'shareQrOutputsChanged',
  'statusChanged',
  'transportDebugChanged',
  'treeholeStateChanged'
]

const DISPATCH_CHANNEL = 'kepos:backend:dispatch'
const CONNECTED_CHANNEL = 'kepos:backend:connected'
const EVENT_CHANNEL = 'kepos:backend:event'
const SUBSCRIBE_CHANNEL = 'kepos:backend:subscribe'
const UNSUBSCRIBE_CHANNEL = 'kepos:backend:unsubscribe'

const COMMAND_SET = new Set(DESKTOP_COMMANDS)
const EVENT_SET = new Set(DESKTOP_EVENTS)
const REPLAY_EVENT_SET = new Set([
  'contactBookChanged',
  'contextFormDraftChanged',
  'desktopStateChanged',
  'directComposerRecipientChanged',
  'dmMessageReceived',
  'homeMessageReceived',
  'peerCountChanged',
  'shareQrOutputsChanged',
  'transportDebugChanged',
  'treeholeStateChanged'
])

function createDesktopElectronBackendBridge({ dispatch, ipcMain, webContents }) {
  const subscriptions = new Map()
  const latestEventPayloads = new Map()
  let backendEventUnsubscribers = []
  let currentWebContents = webContents
  let currentDispatch = dispatch
  let backendConnected = false

  ipcMain.handle(DISPATCH_CHANNEL, (_event, command, payload) => {
    assertCommand(command)
    return currentDispatch(command, payload)
  })

  ipcMain.on(SUBSCRIBE_CHANNEL, (_event, listenerId, event) => {
    assertListenerId(listenerId)
    assertEvent(event)
    subscriptions.set(listenerId, event)
    if (latestEventPayloads.has(event)) {
      sendEvent(listenerId, event, latestEventPayloads.get(event))
    }
  })

  ipcMain.on(UNSUBSCRIBE_CHANNEL, (_event, listenerId) => {
    assertListenerId(listenerId)
    subscriptions.delete(listenerId)
  })

  function emit(event, payload) {
    assertEvent(event)
    if (REPLAY_EVENT_SET.has(event)) latestEventPayloads.set(event, payload)

    for (const [listenerId, subscribedEvent] of subscriptions) {
      if (subscribedEvent !== event) continue

      sendEvent(listenerId, event, payload)
    }
  }

  function sendEvent(listenerId, event, payload) {
    currentWebContents.send(EVENT_CHANNEL, {
      event,
      listenerId,
      payload
    })
  }

  return {
    commands: DESKTOP_COMMANDS,
    connectBackend(backend) {
      if (!backend || typeof backend.dispatch !== 'function') {
        throw new Error('Desktop backend dispatch must be a function')
      }

      for (const unsubscribe of backendEventUnsubscribers) unsubscribe()
      backendEventUnsubscribers = []
      currentDispatch = backend.dispatch

      if (typeof backend.subscribe === 'function') {
        for (const event of DESKTOP_EVENTS) {
          backendEventUnsubscribers.push(
            backend.subscribe(event, (payload) => emit(event, payload))
          )
        }
      }

      backendConnected = true
      currentWebContents.send(CONNECTED_CHANNEL, true)
    },
    emit,
    events: DESKTOP_EVENTS,
    setWebContents(nextWebContents) {
      currentWebContents = nextWebContents
      if (backendConnected) currentWebContents.send(CONNECTED_CHANNEL, true)
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
