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
      const backend = selectBackend({ localBackend, mode, preloadBackend })
      return backend.subscribe(event, handler)
    }
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
