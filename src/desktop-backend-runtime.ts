import { createDesktopDmRuntime } from './desktop-dm-runtime.js'
import { createDesktopHomeRuntime } from './desktop-home-runtime.js'
import { createDesktopTreeholeRuntime } from './desktop-treehole-runtime.js'

type BackendEmit = (event: string, payload?: unknown) => void

type RuntimeFactory<T> = (options: Record<string, unknown>) => T

type DesktopDmRuntimeLike = {
  closeAll(): unknown | Promise<unknown>
}

type DesktopHomeRuntimeLike = {
  broadcastControl(message: unknown): unknown
  configure(context: unknown): unknown
  leave(): unknown | Promise<unknown>
}

type DesktopTreeholeRuntimeLike = {
  close(): unknown | Promise<unknown>
  configure(context: unknown): unknown
}

export type DesktopRuntimeFacade = {
  closeAll(): Promise<unknown[]>
  configure(context: unknown): void
  dm: DesktopDmRuntimeLike
  home: DesktopHomeRuntimeLike
  treehole: DesktopTreeholeRuntimeLike
}

export function createDesktopBackendRuntime({
  createDirectTransport = null,
  createDmRuntime = createDesktopDmRuntime,
  createHomeRuntime = createDesktopHomeRuntime,
  createTreeholeRuntime = createDesktopTreeholeRuntime,
  emit = () => {},
  onDmSessionChanged = () => {},
  onHomeDebugState = () => {},
  onHomeControl = () => {},
  onHomeSessionChanged = () => {},
  onTreeholeStateChanged = () => {},
  onVerifiedHello = () => {},
  storageBasePath = null
}: {
  createDirectTransport?: unknown
  createDmRuntime?: RuntimeFactory<DesktopDmRuntimeLike>
  createHomeRuntime?: RuntimeFactory<DesktopHomeRuntimeLike>
  createTreeholeRuntime?: RuntimeFactory<DesktopTreeholeRuntimeLike>
  emit?: BackendEmit
  onDmSessionChanged?: (session: unknown) => void
  onHomeDebugState?: (debug: unknown) => void
  onHomeControl?: (message: unknown, peer?: unknown) => void
  onHomeSessionChanged?: (session: unknown) => void
  onTreeholeStateChanged?: (snapshot: unknown) => void
  onVerifiedHello?: (message: unknown, peer?: unknown) => void
  storageBasePath?: string | null
} = {}): DesktopRuntimeFacade {
  const dm = createDmRuntime({
    onSessionChanged: (session: unknown) => {
      emit('dmMessageReceived', session)
      onDmSessionChanged(session)
    }
  })
  const home = createHomeRuntime({
    createDirectTransport,
    onControl: onHomeControl,
    onDebugState: (debug: unknown) => {
      emit('transportDebugChanged', debug)
      onHomeDebugState(debug)
    },
    onError: (error: unknown) => emit('errorReceived', error),
    onPeerCount: (peers: unknown) => emit('peerCountChanged', { peers }),
    onSessionChanged: (session: unknown) => {
      emit('homeMessageReceived', session)
      onHomeSessionChanged(session)
    },
    onVerifiedHello
  })
  const treehole = createTreeholeRuntime({
    onError: (error: unknown) => emit('errorReceived', error),
    onStateChanged: (snapshot: unknown) => {
      emit('treeholeStateChanged', snapshot)
      onTreeholeStateChanged(snapshot)
      home.broadcastControl({
        snapshot,
        type: 'treehole.state.v1'
      })
    },
    storageBasePath
  })

  function configure(context: unknown) {
    home.configure(context)
    treehole.configure(context)
  }

  async function closeAll() {
    return await Promise.all([dm.closeAll(), home.leave(), treehole.close()])
  }

  return {
    closeAll,
    configure,
    dm,
    home,
    treehole
  }
}
