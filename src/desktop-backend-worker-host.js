import { createDesktopMainBackendSession } from './desktop-main-backend-session.js'

export function createDesktopBackendWorkerHost({
  createMainBackendSession = createDesktopMainBackendSession,
  storageBasePath
} = {}) {
  let session = null

  return {
    get bridge() {
      return session?.backendHost.bridge || null
    },
    close: () => {
      const currentSession = session
      session = null
      return currentSession?.backendRuntime?.closeAll?.()
    },
    start() {
      if (!session) session = createMainBackendSession({ storageBasePath })
      return Promise.resolve(session.backendHost.bridge)
    }
  }
}
