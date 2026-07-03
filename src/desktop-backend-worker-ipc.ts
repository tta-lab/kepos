import { DESKTOP_COMMANDS, DESKTOP_EVENTS } from './desktop-command-vocabulary.ts'

const REPLAY_EVENT_SET = new Set<string>([
  'contactBookChanged',
  'contextFormDraftChanged',
  'desktopStateChanged',
  'directComposerRecipientChanged',
  'dmMessageReceived',
  'dmThreadChanged',
  'homeMessageReceived',
  'peerCountChanged',
  'shareQrOutputsChanged',
  'transportDebugChanged',
  'treeholeStateChanged'
])

export function createDesktopBackendWorkerIpcClient({
  stream
}: {
  stream: IpcStream
}): DesktopBackendWorkerIpcClient {
  const latestEventPayloads = new Map<string, unknown>()
  const pendingDispatches = new Map<string, PendingDispatch>()
  const listenersByEvent = new Map<string, Set<IpcEventHandler>>()
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
        return () => listeners?.delete(handler)
      }
    },
    close() {
      stopReading()
      stream.destroy?.()
    }
  }

  function resolveDispatch(message: IpcDispatchResultMessage): void {
    const pending = pendingDispatches.get(message.id)
    if (!pending) return

    pendingDispatches.delete(message.id)
    if (message.ok) {
      pending.resolve(message.value)
      return
    }
    pending.reject(new Error(message.error?.message || 'Desktop worker dispatch failed'))
  }

  function emitLocalEvent(event: string, payload: unknown): void {
    if (REPLAY_EVENT_SET.has(event)) latestEventPayloads.set(event, payload)

    const listeners = listenersByEvent.get(event)
    if (!listeners) return

    for (const listener of listeners) listener(payload)
  }
}

export function createDesktopBackendWorkerIpcServer({
  bridge,
  stream
}: {
  bridge: DesktopBackendBridge
  stream: IpcStream
}): DesktopBackendWorkerIpcServer {
  const unsubscribeFromBackend: Array<() => void> = []
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

  async function handleDispatch(message: IpcDispatchMessage): Promise<void> {
    try {
      const value = await bridge.dispatch(message.command, message.payload)
      writeIpcMessage(stream, { id: message.id, ok: true, type: 'dispatchResult', value })
    } catch (error) {
      writeIpcMessage(stream, {
        error: {
          message: error instanceof Error ? error.message : 'Desktop worker dispatch failed'
        },
        id: message.id,
        ok: false,
        type: 'dispatchResult'
      })
    }
  }
}

function readIpcMessages(stream: IpcStream, onMessage: (message: IpcMessage) => void): () => void {
  let buffer = ''

  function onData(chunk: { toString(): string }): void {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line) continue
      onMessage(JSON.parse(line, reviveIpcValue) as IpcMessage)
    }
  }

  stream.on('data', onData)
  return () => stream.off?.('data', onData)
}

function writeIpcMessage(stream: IpcStream, message: IpcMessage): void {
  stream.write(`${JSON.stringify(message, replaceIpcValue)}\n`)
}

function replaceIpcValue(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      __keposIpcType: 'Error',
      code: (value as Error & { code?: unknown }).code,
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

function reviveIpcValue(_key: string, value: unknown): unknown {
  if (!isRecord(value)) return value

  if (value.__keposIpcType === 'Error') {
    const error = new Error(readString(value.message) || 'Desktop worker error') as Error & {
      code?: unknown
    }
    error.name = readString(value.name) || 'Error'
    if (typeof value.stack === 'string') error.stack = value.stack
    if (value.code) error.code = value.code
    return error
  }
  if (value.__keposIpcType === 'Map') {
    return new Map(Array.isArray(value.entries) ? value.entries : [])
  }
  if (value.__keposIpcType === 'Set') {
    return new Set(Array.isArray(value.values) ? value.values : [])
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export type IpcStream = {
  destroy?: () => unknown
  off?: (event: 'data', handler: (chunk: { toString(): string }) => void) => unknown
  on(event: 'data', handler: (chunk: { toString(): string }) => void): unknown
  write(value: string): unknown
}

type IpcEventHandler = (payload: unknown) => void

type PendingDispatch = {
  reject(error: Error): void
  resolve(value: unknown): void
}

type IpcDispatchMessage = {
  command: string
  id: string
  payload?: unknown
  type: 'dispatch'
}

type IpcDispatchResultMessage =
  | {
      id: string
      ok: true
      type: 'dispatchResult'
      value?: unknown
    }
  | {
      error?: { message?: string }
      id: string
      ok: false
      type: 'dispatchResult'
    }

type IpcEventMessage = {
  event: string
  payload?: unknown
  type: 'event'
}

type IpcMessage = IpcDispatchMessage | IpcDispatchResultMessage | IpcEventMessage

type DesktopBackendBridge = {
  dispatch(command: string, payload?: unknown): unknown | Promise<unknown>
  subscribe?: (event: string, handler: IpcEventHandler) => () => void
}

type DesktopBackendWorkerBridge = {
  commands: typeof DESKTOP_COMMANDS
  dispatch(command: string, payload?: unknown): Promise<unknown>
  events: typeof DESKTOP_EVENTS
  subscribe(event: string, handler: IpcEventHandler): () => void
}

type DesktopBackendWorkerIpcClient = {
  bridge: DesktopBackendWorkerBridge
  close(): void
}

type DesktopBackendWorkerIpcServer = {
  close(): void
}
