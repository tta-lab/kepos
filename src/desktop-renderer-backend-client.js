export function createDesktopRendererBackendClient({
  localBackend,
  mode = 'auto',
  preloadBackend = globalThis.keposBackend
}) {
  return {
    async dispatch(command, payload) {
      const backend = selectBackend({ localBackend, mode, preloadBackend })
      return await backend.dispatch(command, payload)
    },
    subscribe(event, handler) {
      if (mode === 'auto') return subscribeAuto({ event, handler, localBackend, preloadBackend })

      const backend = selectBackend({ localBackend, mode, preloadBackend })
      return backend.subscribe(event, handler)
    }
  }
}

function subscribeAuto({ event, handler, localBackend, preloadBackend }) {
  if (isConnectedPreloadBackend(preloadBackend)) return preloadBackend.subscribe(event, handler)

  let activeBackend = 'local'
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

function selectBackend({ localBackend, mode, preloadBackend }) {
  if (mode === 'preload') return requirePreloadBackend(preloadBackend)
  if (mode === 'auto' && isConnectedPreloadBackend(preloadBackend)) {
    return preloadBackend
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
