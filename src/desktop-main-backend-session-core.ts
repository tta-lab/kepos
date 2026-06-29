import { createDesktopBackendSession } from './desktop-backend-session.js'
import { createDesktopControllerState } from './desktop-controller-state.ts'
import { createDesktopShareQrOutputs } from './desktop-qr-service.js'

type BackendBridgeLike = {
  dispatch(command: string, payload?: unknown): unknown | Promise<unknown>
  emit(event: string, payload?: unknown): unknown
  subscribe(event: string, handler: (payload?: unknown) => void): () => void
}

export type DesktopMainBackendSession = {
  backendHost: {
    bridge: BackendBridgeLike
  }
  backendRuntime?: {
    closeAll?: () => unknown | Promise<unknown>
  }
  publishSnapshots?: () => void
}

type DesktopControllerStateLike = {
  getCurrentDisplayName(): string
  getDmSession(): unknown
  getState(): unknown
  setDirectComposerRecipient(profileId: string): unknown
  updateState(updater: unknown): unknown
}

type DesktopProfileContext = {
  contactBook: unknown
  profile: unknown
}

type CreateProfileContext = (options: {
  displayName: string
  storageBasePath?: string
}) => DesktopProfileContext

type DesktopBackendSessionFactory = (options: Record<string, unknown>) => DesktopMainBackendSession

export function createDesktopMainBackendSessionCore({
  createBackendSession = createDesktopBackendSession as unknown as DesktopBackendSessionFactory,
  createControllerState = createDesktopControllerState,
  createId = defaultCreateId,
  env,
  createProfileContext,
  createShareQrOutputs = createDesktopShareQrOutputs,
  defaultDisplayName = 'Desktop',
  storageBasePath
}: {
  createBackendSession?: DesktopBackendSessionFactory
  createControllerState?: (options: { defaultDisplayName: string }) => DesktopControllerStateLike
  createId?: () => string
  env?: Record<string, string>
  createProfileContext?: CreateProfileContext
  createShareQrOutputs?: (options: { profile: unknown }) => unknown | Promise<unknown>
  defaultDisplayName?: string
  storageBasePath?: string | null
} = {}): DesktopMainBackendSession {
  if (!createProfileContext) throw new Error('Desktop profile context factory is required')
  const profileContext = createProfileContext
  const shareQrOutputs = createShareQrOutputs

  const controllerState = createControllerState({ defaultDisplayName })
  let backendSession: DesktopMainBackendSession | null = null

  backendSession = createBackendSession({
    controllerState,
    createId,
    env,
    getCurrentDisplayName: () => controllerState.getCurrentDisplayName(),
    getProfileContext: (displayName = controllerState.getCurrentDisplayName()) =>
      profileContext({ displayName, storageBasePath: storageBasePath ?? undefined }),
    onChanged: () => {
      publishSnapshots()
      publishShareQrOutputs()
    },
    setContextFormDraft: (draft: unknown) => {
      backendSession?.backendHost.bridge.emit('contextFormDraftChanged', draft)
    },
    setDirectComposerRecipient: (profileId: string) => {
      controllerState.setDirectComposerRecipient(profileId)
      backendSession?.backendHost.bridge.emit('directComposerRecipientChanged', profileId)
    },
    setNotice: (notice: unknown) => {
      controllerState.updateState((state: Record<string, unknown>) => ({ ...state, notice }))
    },
    shortenProfileId: (value: string) => `${value.slice(0, 8)}...${value.slice(-8)}`,
    storageBasePath,
    updateState: (updater: unknown) => {
      controllerState.updateState(updater)
    }
  })

  publishSnapshots()
  publishShareQrOutputs()

  backendSession.publishSnapshots = () => {
    publishSnapshots()
    void publishShareQrOutputs()
  }

  return backendSession

  function publishSnapshots() {
    backendSession?.backendHost.bridge.emit('desktopStateChanged', controllerState.getState())
    backendSession?.backendHost.bridge.emit(
      'contactBookChanged',
      profileContext({
        displayName: controllerState.getCurrentDisplayName(),
        storageBasePath: storageBasePath ?? undefined
      }).contactBook
    )
    backendSession?.backendHost.bridge.emit('dmMessageReceived', controllerState.getDmSession())
  }

  async function publishShareQrOutputs() {
    try {
      const { profile } = profileContext({
        displayName: controllerState.getCurrentDisplayName(),
        storageBasePath: storageBasePath ?? undefined
      })
      backendSession?.backendHost.bridge.emit(
        'shareQrOutputsChanged',
        await shareQrOutputs({ profile })
      )
    } catch (error) {
      backendSession?.backendHost.bridge.emit('errorReceived', error)
    }
  }
}

function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
