import { DESKTOP_COMMANDS, DESKTOP_EVENTS } from './desktop-command-vocabulary.ts'

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

export function createDesktopBackendWorkerIpcClient({ stream } = {}) {
  const latestEventPayloads = new Map()
  const pendingDispatches = new Map()
  const listenersByEvent = new Map()
  let nextRequestId = 1

  const stopReading = readIpcMessages(stream, (message) => {
    if (message.type === 'dispatchResult') {
      resolveDispatch(message)
      return
    }
    if (message.type === 'event') emitLocalEvent(message.event, message.payload)
  })

  return {
    bridge: {
      commands: DESKTOP_COMMANDS,
      dispatch(command, payload) {
        const id = String(nextRequestId)
        nextRequestId += 1
        return new Promise((resolve, reject) => {
          pendingDispatches.set(id, { reject, resolve })
          writeIpcMessage(stream, { command, id, payload, type: 'dispatch' })
        })
      },
      events: DESKTOP_EVENTS,
      subscribe(event, handler) {
        let listeners = listenersByEvent.get(event)
        if (!listeners) {
          listeners = new Set()
          listenersByEvent.set(event, listeners)
        }
        listeners.add(handler)
        if (latestEventPayloads.has(event)) handler(latestEventPayloads.get(event))
        return () => listeners.delete(handler)
      }
    },
    close() {
      stopReading()
      stream.destroy?.()
    }
  }

  function resolveDispatch(message) {
    const pending = pendingDispatches.get(message.id)
    if (!pending) return

    pendingDispatches.delete(message.id)
    if (message.ok) {
      pending.resolve(message.value)
      return
    }
    pending.reject(new Error(message.error?.message || 'Desktop worker dispatch failed'))
  }

  function emitLocalEvent(event, payload) {
    if (REPLAY_EVENT_SET.has(event)) latestEventPayloads.set(event, payload)

    const listeners = listenersByEvent.get(event)
    if (!listeners) return

    for (const listener of listeners) listener(payload)
  }
}

export function createDesktopBackendWorkerIpcServer({ bridge, stream } = {}) {
  const unsubscribeFromBackend = []
  const stopReading = readIpcMessages(stream, (message) => {
    if (message.type === 'dispatch') void handleDispatch(message)
  })

  if (typeof bridge.subscribe === 'function') {
    for (const event of DESKTOP_EVENTS) {
      unsubscribeFromBackend.push(
        bridge.subscribe(event, (payload) => {
          writeIpcMessage(stream, { event, payload, type: 'event' })
        })
      )
    }
  }

  return {
    close() {
      stopReading()
      for (const unsubscribe of unsubscribeFromBackend) unsubscribe()
      stream.destroy?.()
    }
  }

  async function handleDispatch(message) {
    try {
      const value = await bridge.dispatch(message.command, message.payload)
      writeIpcMessage(stream, { id: message.id, ok: true, type: 'dispatchResult', value })
    } catch (error) {
      writeIpcMessage(stream, {
        error: { message: error?.message || 'Desktop worker dispatch failed' },
        id: message.id,
        ok: false,
        type: 'dispatchResult'
      })
    }
  }
}

function readIpcMessages(stream, onMessage) {
  let buffer = ''

  function onData(chunk) {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line) continue
      onMessage(JSON.parse(line, reviveIpcValue))
    }
  }

  stream.on('data', onData)
  return () => stream.off?.('data', onData)
}

function writeIpcMessage(stream, message) {
  stream.write(`${JSON.stringify(message, replaceIpcValue)}\n`)
}

function replaceIpcValue(_key, value) {
  if (value instanceof Error) {
    return {
      __keposIpcType: 'Error',
      code: value.code,
      message: value.message,
      name: value.name,
      stack: value.stack
    }
  }
  if (value instanceof Map) {
    return {
      __keposIpcType: 'Map',
      entries: Array.from(value.entries())
    }
  }
  if (value instanceof Set) {
    return {
      __keposIpcType: 'Set',
      values: Array.from(value.values())
    }
  }
  return value
}

function reviveIpcValue(_key, value) {
  if (value?.__keposIpcType === 'Error') {
    const error = new Error(value.message || 'Desktop worker error')
    error.name = value.name || 'Error'
    if (value.stack) error.stack = value.stack
    if (value.code) error.code = value.code
    return error
  }
  if (value?.__keposIpcType === 'Map') return new Map(value.entries || [])
  if (value?.__keposIpcType === 'Set') return new Set(value.values || [])
  return value
}
