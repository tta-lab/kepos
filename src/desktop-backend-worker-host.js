import { createDesktopMainBackendSession } from './desktop-main-backend-session.js'

export function createDesktopBackendWorkerHost({
  createMainBackendSession = createDesktopMainBackendSession,
  storageBasePath
} = {}) {
  const session = createMainBackendSession({ storageBasePath })

  return {
    bridge: session.backendHost.bridge,
    close: () => session.backendRuntime?.closeAll?.()
  }
}
