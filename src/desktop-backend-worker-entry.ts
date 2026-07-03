import { createDesktopMainBackendSession } from './desktop-main-backend-session.ts'
import { createDesktopBackendWorkerIpcServer } from './desktop-backend-worker-ipc.ts'
import type { IpcStream } from './desktop-backend-worker-ipc.ts'

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
  createIpcServer?: (options: { bridge: BackendBridgeLike; stream: IpcStream }) => WorkerServerLike
  createMainBackendSession?: (options: { storageBasePath?: string | null }) => WorkerSessionLike
  storageBasePath?: string | null
  stream?: IpcStream
} = {}) {
  if (!stream) throw new Error('Desktop backend worker stream is required')

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
