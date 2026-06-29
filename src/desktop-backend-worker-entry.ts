import { createDesktopMainBackendSession } from './desktop-main-backend-session.ts'
import { createDesktopBackendWorkerIpcServer } from './desktop-backend-worker-ipc.js'

type BackendBridgeLike = {
  dispatch(command: string, payload?: unknown): unknown | Promise<unknown>
  emit?: (event: string, payload?: unknown) => unknown
  subscribe(event: string, handler: (payload?: unknown) => void): () => void
}

type WorkerSessionLike = {
  backendHost: {
    bridge: BackendBridgeLike
  }
  backendRuntime?: {
    closeAll?: () => unknown | Promise<unknown>
  }
  publishSnapshots?: () => unknown
}

type WorkerServerLike = {
  close(): unknown
}

export function startDesktopBackendWorker({
  createIpcServer = createDesktopBackendWorkerIpcServer,
  createMainBackendSession = createDesktopMainBackendSession,
  storageBasePath,
  stream
}: {
  createIpcServer?: (options: { bridge: BackendBridgeLike; stream: unknown }) => WorkerServerLike
  createMainBackendSession?: (options: { storageBasePath?: string | null }) => WorkerSessionLike
  storageBasePath?: string | null
  stream?: unknown
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
