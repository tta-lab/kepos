import { createDesktopMainBackendSession } from './desktop-main-backend-session.js'
import { createDesktopBackendWorkerIpcServer } from './desktop-backend-worker-ipc.js'

export function startDesktopBackendWorker({
  createIpcServer = createDesktopBackendWorkerIpcServer,
  createMainBackendSession = createDesktopMainBackendSession,
  storageBasePath,
  stream
} = {}) {
  const session = createMainBackendSession({ storageBasePath })
  const server = createIpcServer({
    bridge: session.backendHost.bridge,
    stream
  })
  session.publishSnapshots?.()

  return {
    close() {
      server.close()
      return session.backendRuntime?.closeAll?.()
    }
  }
}
