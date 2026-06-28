import { createDesktopMainBackendSession } from './desktop-main-backend-session.js'

export function createDesktopBackendWorkerHost({
  createMainBackendSession = createDesktopMainBackendSession,
  storageBasePath
} = {}) {
  const session = createMainBackendSession({ storageBasePath })

  return {
    backendHost: session.backendHost,
    close: () => session.backendRuntime?.closeAll?.()
  }
}
