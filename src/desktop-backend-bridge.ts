import {
  DESKTOP_COMMANDS,
  DESKTOP_EVENTS,
  isDesktopCommand,
  isDesktopEvent,
  type DesktopCommand,
  type DesktopEvent
} from './desktop-command-vocabulary.ts'

export type DesktopBackendDispatch = (
  command: DesktopCommand,
  payload?: unknown
) => unknown | Promise<unknown>

export type DesktopBackendEventHandler = (payload?: unknown) => void

export type DesktopBackendBridge = {
  commands: readonly DesktopCommand[]
  events: readonly DesktopEvent[]
  dispatch(command: string, payload?: unknown): Promise<unknown>
  emit(event: string, payload?: unknown): void
  subscribe(event: string, handler: DesktopBackendEventHandler): () => void
}

export function createDesktopBackendBridge({
  dispatch
}: {
  dispatch: DesktopBackendDispatch
}): DesktopBackendBridge {
  const handlers = new Map<DesktopEvent, Set<DesktopBackendEventHandler>>()

  return {
    commands: DESKTOP_COMMANDS,
    events: DESKTOP_EVENTS,
    async dispatch(command, payload) {
      if (!isDesktopCommand(command)) {
        throw new Error(`Unknown desktop command: ${command}`)
      }

      return await dispatch(command, payload)
    },
    emit(event, payload) {
      if (!isDesktopEvent(event)) {
        throw new Error(`Unknown desktop event: ${event}`)
      }

      for (const handler of handlers.get(event) || []) {
        handler(payload)
      }
    },
    subscribe(event, handler) {
      if (!isDesktopEvent(event)) {
        throw new Error(`Unknown desktop event: ${event}`)
      }

      const eventHandlers = handlers.get(event) || new Set<DesktopBackendEventHandler>()
      eventHandlers.add(handler)
      handlers.set(event, eventHandlers)

      return () => {
        eventHandlers.delete(handler)
        if (eventHandlers.size === 0) {
          handlers.delete(event)
        }
      }
    }
  }
}
