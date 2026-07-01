import BareEncoding from 'bare-encoding'
import { createDesktopBackendWorkerIpcServer } from './desktop-backend-worker-ipc.ts'
import type { IpcStream } from './desktop-backend-worker-ipc.ts'

export function startDesktopBackendBareWorker({
  BareRuntime = (globalThis as BareGlobalScope).Bare,
  createIpcServer = createDesktopBackendWorkerIpcServer,
  createMainBackendSession,
  startBackendWorker = startDesktopBackendWorkerInBare
}: StartDesktopBackendBareWorkerOptions = {}): BareWorkerHandle {
  if (!BareRuntime?.IPC) throw new Error('Bare IPC is required for desktop backend worker')

  installBareEncodingGlobals()

  const worker = startBackendWorker({
    createIpcServer,
    createMainBackendSession,
    env: parseWorkerEnv(BareRuntime.argv?.[3]),
    storageBasePath: BareRuntime.argv?.[2],
    stream: BareRuntime.IPC
  })

  BareRuntime.on?.('beforeExit', () => worker.close())

  return worker
}

export function installBareEncodingGlobals({
  globalObject = globalThis as BareEncodingGlobalScope,
  utils = BareEncoding as BareEncodingUtils
}: {
  globalObject?: BareEncodingGlobalScope
  utils?: BareEncodingUtils
} = {}): void {
  if (!globalObject.TextEncoder) globalObject.TextEncoder = utils.TextEncoder
  if (!globalObject.TextDecoder) globalObject.TextDecoder = utils.TextDecoder
}

function startDesktopBackendWorkerInBare({
  createIpcServer,
  env,
  createMainBackendSession,
  storageBasePath,
  stream
}: StartBackendWorkerInBareOptions): BareWorkerHandle {
  if (!createMainBackendSession) {
    throw new Error('Desktop Bare backend session factory is required')
  }

  const session = createMainBackendSession({ env, storageBasePath })
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

function parseWorkerEnv(value: string | undefined): Record<string, string> {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  } catch {
    return {}
  }
}

async function startDefaultDesktopBackendBareWorker(): Promise<BareWorkerHandle> {
  const [{ createDesktopBareProfileContext }, { createDesktopMainBackendSessionCore }] =
    await Promise.all([
      import('./desktop-bare-profile-context.ts'),
      import('./desktop-main-backend-session-core.ts')
    ])

  return startDesktopBackendBareWorker({
    createMainBackendSession: (options) =>
      createDesktopMainBackendSessionCore({
        ...options,
        createProfileContext: createDesktopBareProfileContext
      })
  })
}

if ((globalThis as BareGlobalScope).Bare?.IPC) void startDefaultDesktopBackendBareWorker()

type BareEncodingGlobalScope = {
  TextDecoder?: unknown
  TextEncoder?: unknown
}

type BareEncodingUtils = {
  TextDecoder: unknown
  TextEncoder: unknown
}

type BareGlobalScope = typeof globalThis & {
  Bare?: BareRuntime
}

type BareRuntime = {
  IPC?: IpcStream
  argv?: string[]
  on?: (event: 'beforeExit', handler: () => unknown | Promise<unknown>) => unknown
}

type StartDesktopBackendBareWorkerOptions = {
  BareRuntime?: BareRuntime
  createIpcServer?: IpcServerFactory
  createMainBackendSession?: MainBackendSessionFactory
  startBackendWorker?: (options: StartBackendWorkerInBareOptions) => BareWorkerHandle
}

type StartBackendWorkerInBareOptions = {
  createIpcServer: IpcServerFactory
  createMainBackendSession?: MainBackendSessionFactory
  env?: Record<string, string>
  storageBasePath?: string | null
  stream: IpcStream
}

type IpcServerFactory = (options: { bridge: BackendBridgeLike; stream: IpcStream }) => {
  close(): unknown
}

type MainBackendSessionFactory = (options: {
  env?: Record<string, string>
  storageBasePath?: string | null
}) => MainBackendSession

type MainBackendSession = {
  backendHost: {
    bridge: BackendBridgeLike
  }
  backendRuntime?: {
    closeAll?: () => unknown | Promise<unknown>
  }
  publishSnapshots?: () => unknown
}

type BackendBridgeLike = {
  dispatch(command: string, payload?: unknown): unknown | Promise<unknown>
  subscribe?: (event: string, handler: (payload?: unknown) => void) => () => void
}

type BareWorkerHandle = {
  close(): unknown
}
