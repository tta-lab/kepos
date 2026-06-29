import BareEncoding from 'bare-encoding'
import { createDesktopBackendWorkerIpcServer } from './desktop-backend-worker-ipc.js'

export function startDesktopBackendBareWorker({
  BareRuntime = globalThis.Bare,
  createIpcServer = createDesktopBackendWorkerIpcServer,
  createMainBackendSession,
  startBackendWorker = startDesktopBackendWorkerInBare
} = {}) {
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
  globalObject = globalThis,
  utils = BareEncoding
} = {}) {
  if (!globalObject.TextEncoder) globalObject.TextEncoder = utils.TextEncoder
  if (!globalObject.TextDecoder) globalObject.TextDecoder = utils.TextDecoder
}

function startDesktopBackendWorkerInBare({
  createIpcServer,
  env,
  createMainBackendSession,
  storageBasePath,
  stream
} = {}) {
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

function parseWorkerEnv(value) {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function startDefaultDesktopBackendBareWorker() {
  const [{ createDesktopBareProfileContext }, { createDesktopMainBackendSessionCore }] =
    await Promise.all([
      import('./desktop-bare-profile-context.js'),
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

if (globalThis.Bare?.IPC) startDefaultDesktopBackendBareWorker()
