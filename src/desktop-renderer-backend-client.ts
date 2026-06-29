export function createDesktopRendererBackendClient({
  createLocalBackend = null,
  localBackend,
  mode = 'auto',
  preloadBackend = (globalThis as { keposBackend?: DesktopPreloadBackend }).keposBackend
}: {
  createLocalBackend?: (() => DesktopBackendBridgeLike | null) | null
  localBackend?: DesktopBackendBridgeLike | null
  mode?: 'auto' | 'local' | 'preload'
  preloadBackend?: DesktopPreloadBackend | null
} = {}): DesktopRendererBackendClient {
  let resolvedLocalBackend: DesktopBackendBridgeLike | null | undefined = localBackend
  const getLocalBackend = () => {
    if (!resolvedLocalBackend) resolvedLocalBackend = createLocalBackend?.()
    return resolvedLocalBackend
  }

  return {
    async dispatch(command, payload) {
      const backend = selectBackend({ getLocalBackend, mode, preloadBackend })
      return await backend.dispatch(command, payload)
    },
    hasPreloadBackend() {
      if (mode === 'preload') return hasUsablePreloadBackend(preloadBackend)
      return mode === 'auto' && hasManagedPreloadBackend(preloadBackend)
    },
    isPreloadConnected() {
      if (mode === 'preload') return isConnectedPreloadBackend(preloadBackend)
      return mode === 'auto' && isConnectedPreloadBackend(preloadBackend)
    },
    subscribe(event, handler) {
      if (mode === 'auto') {
        return subscribeAuto({ event, getLocalBackend, handler, preloadBackend })
      }

      const backend = selectBackend({ getLocalBackend, mode, preloadBackend })
      return backend.subscribe(event, handler)
    }
  }
}

type DesktopBackendEventHandler = (payload?: unknown) => void
type Unsubscribe = () => void

type DesktopBackendBridgeLike = {
  dispatch(command: string, payload?: unknown): unknown | Promise<unknown>
  subscribe(event: string, handler: DesktopBackendEventHandler): Unsubscribe
}

type DesktopPreloadBackend = DesktopBackendBridgeLike & {
  isConnected?: boolean | (() => boolean)
  onConnected?: (handler: (connected: boolean) => void) => Unsubscribe
}

export type DesktopRendererBackendClient = DesktopBackendBridgeLike & {
  hasPreloadBackend(): boolean
  isPreloadConnected(): boolean
}

function subscribeAuto({
  event,
  getLocalBackend,
  handler,
  preloadBackend
}: {
  event: string
  getLocalBackend: () => DesktopBackendBridgeLike | null | undefined
  handler: DesktopBackendEventHandler
  preloadBackend?: DesktopPreloadBackend | null
}): Unsubscribe {
  if (isConnectedPreloadBackend(preloadBackend) && preloadBackend) {
    return preloadBackend.subscribe(event, handler)
  }

  if (hasManagedPreloadBackend(preloadBackend)) {
    let unsubscribeActive = () => {}
    const unsubscribeConnected = preloadBackend.onConnected((connected) => {
      if (connected !== true) return

      unsubscribeActive()
      unsubscribeActive = preloadBackend.subscribe(event, handler)
    })

    return () => {
      unsubscribeActive()
      unsubscribeConnected()
    }
  }

  const localBackend = requireLocalBackend(getLocalBackend())
  return localBackend.subscribe(event, handler)
}

function selectBackend({
  getLocalBackend,
  mode,
  preloadBackend
}: {
  getLocalBackend: () => DesktopBackendBridgeLike | null | undefined
  mode: 'auto' | 'local' | 'preload'
  preloadBackend?: DesktopPreloadBackend | null
}): DesktopBackendBridgeLike {
  if (mode === 'preload') return requirePreloadBackend(preloadBackend)
  if (
    mode === 'auto' &&
    (isConnectedPreloadBackend(preloadBackend) || hasManagedPreloadBackend(preloadBackend))
  ) {
    return requirePreloadBackend(preloadBackend)
  }

  return requireLocalBackend(getLocalBackend())
}

function requireLocalBackend(
  localBackend: DesktopBackendBridgeLike | null | undefined
): DesktopBackendBridgeLike {
  if (
    !localBackend ||
    typeof localBackend.dispatch !== 'function' ||
    typeof localBackend.subscribe !== 'function'
  ) {
    throw new Error('Desktop local backend is unavailable')
  }

  return localBackend
}

function requirePreloadBackend(
  preloadBackend: DesktopPreloadBackend | null | undefined
): DesktopPreloadBackend {
  if (!hasUsablePreloadBackend(preloadBackend)) {
    throw new Error('Desktop preload backend is unavailable')
  }

  return preloadBackend
}

function hasUsablePreloadBackend(
  preloadBackend: DesktopPreloadBackend | null | undefined
): preloadBackend is DesktopPreloadBackend {
  return (
    typeof preloadBackend?.dispatch === 'function' &&
    typeof preloadBackend?.subscribe === 'function'
  )
}

function hasManagedPreloadBackend(
  preloadBackend: DesktopPreloadBackend | null | undefined
): preloadBackend is DesktopPreloadBackend & {
  onConnected: (handler: (connected: boolean) => void) => Unsubscribe
} {
  return (
    hasUsablePreloadBackend(preloadBackend) && typeof preloadBackend?.onConnected === 'function'
  )
}

function isConnectedPreloadBackend(
  preloadBackend: DesktopPreloadBackend | null | undefined
): boolean {
  if (!preloadBackend) return false
  if (!hasUsablePreloadBackend(preloadBackend)) return false

  if (typeof preloadBackend.isConnected === 'function') return preloadBackend.isConnected()
  return preloadBackend.isConnected === true
}
