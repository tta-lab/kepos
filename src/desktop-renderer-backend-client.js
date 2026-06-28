export function createDesktopRendererBackendClient({
  createLocalBackend = null,
  localBackend,
  mode = 'auto',
  preloadBackend = globalThis.keposBackend
}) {
  let resolvedLocalBackend = localBackend
  const getLocalBackend = () => {
    if (!resolvedLocalBackend) resolvedLocalBackend = createLocalBackend?.()
    return resolvedLocalBackend
  }

  return {
    async dispatch(command, payload) {
      const backend = selectBackend({ getLocalBackend, mode, preloadBackend })
      return await backend.dispatch(command, payload)
    },
    isPreloadConnected() {
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

function subscribeAuto({ event, getLocalBackend, handler, preloadBackend }) {
  if (isConnectedPreloadBackend(preloadBackend)) return preloadBackend.subscribe(event, handler)

  let activeBackend = 'local'
  const localBackend = requireLocalBackend(getLocalBackend())
  let unsubscribeActive = localBackend.subscribe(event, handler)
  let unsubscribeConnected = () => {}

  if (
    typeof preloadBackend?.dispatch === 'function' &&
    typeof preloadBackend?.subscribe === 'function' &&
    typeof preloadBackend?.onConnected === 'function'
  ) {
    unsubscribeConnected = preloadBackend.onConnected((connected) => {
      if (connected !== true || activeBackend === 'preload') return

      unsubscribeActive()
      activeBackend = 'preload'
      unsubscribeActive = preloadBackend.subscribe(event, handler)
    })
  }

  return () => {
    unsubscribeActive()
    unsubscribeConnected()
  }
}

function selectBackend({ getLocalBackend, mode, preloadBackend }) {
  if (mode === 'preload') return requirePreloadBackend(preloadBackend)
  if (mode === 'auto' && isConnectedPreloadBackend(preloadBackend)) {
    return preloadBackend
  }

  return requireLocalBackend(getLocalBackend())
}

function requireLocalBackend(localBackend) {
  if (
    !localBackend ||
    typeof localBackend.dispatch !== 'function' ||
    typeof localBackend.subscribe !== 'function'
  ) {
    throw new Error('Desktop local backend is unavailable')
  }

  return localBackend
}

function requirePreloadBackend(preloadBackend) {
  if (
    !preloadBackend ||
    typeof preloadBackend.dispatch !== 'function' ||
    typeof preloadBackend.subscribe !== 'function'
  ) {
    throw new Error('Desktop preload backend is unavailable')
  }

  return preloadBackend
}

function isConnectedPreloadBackend(preloadBackend) {
  if (!preloadBackend) return false
  if (
    typeof preloadBackend.dispatch !== 'function' ||
    typeof preloadBackend.subscribe !== 'function'
  ) {
    return false
  }

  if (typeof preloadBackend.isConnected === 'function') return preloadBackend.isConnected()
  return preloadBackend.isConnected === true
}
