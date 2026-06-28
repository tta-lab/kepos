import { DESKTOP_COMMANDS, DESKTOP_EVENTS } from './desktop-command-vocabulary.ts'

export function createDesktopBackendWorkerIpcClient({ stream } = {}) {
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
      onMessage(JSON.parse(line))
    }
  }

  stream.on('data', onData)
  return () => stream.off?.('data', onData)
}

function writeIpcMessage(stream, message) {
  stream.write(`${JSON.stringify(message)}\n`)
}
