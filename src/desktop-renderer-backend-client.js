export function createDesktopRendererBackendClient({
  localBackend,
  mode = 'local',
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
