import { createDesktopBackendSession } from './desktop-backend-session.js'
import { createDesktopControllerState } from './desktop-controller-state.ts'
import { createDesktopShareQrOutputs } from './desktop-qr-service.js'

export function createDesktopMainBackendSessionCore({
  createBackendSession = createDesktopBackendSession,
  createControllerState = createDesktopControllerState,
  createId = defaultCreateId,
  env,
  createProfileContext,
  createShareQrOutputs = createDesktopShareQrOutputs,
  defaultDisplayName = 'Desktop',
  storageBasePath
} = {}) {
  if (!createProfileContext) throw new Error('Desktop profile context factory is required')

  const controllerState = createControllerState({ defaultDisplayName })
  let backendSession = null

  backendSession = createBackendSession({
    controllerState,
    createId,
    env,
    getCurrentDisplayName: () => controllerState.getCurrentDisplayName(),
    getProfileContext: (displayName = controllerState.getCurrentDisplayName()) =>
      createProfileContext({ displayName, storageBasePath }),
    onChanged: () => {
      publishSnapshots()
      publishShareQrOutputs()
    },
    setContextFormDraft: (draft) => {
      backendSession?.backendHost.bridge.emit('contextFormDraftChanged', draft)
    },
    setDirectComposerRecipient: (profileId) => {
      controllerState.setDirectComposerRecipient(profileId)
      backendSession?.backendHost.bridge.emit('directComposerRecipientChanged', profileId)
    },
    setNotice: (notice) => {
      controllerState.updateState((state) => ({ ...state, notice }))
    },
    shortenProfileId: (value) => `${value.slice(0, 8)}...${value.slice(-8)}`,
    storageBasePath,
    updateState: (updater) => {
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
      createProfileContext({
        displayName: controllerState.getCurrentDisplayName(),
        storageBasePath
      }).contactBook
    )
    backendSession?.backendHost.bridge.emit('dmMessageReceived', controllerState.getDmSession())
  }

  async function publishShareQrOutputs() {
    try {
      const { profile } = createProfileContext({
        displayName: controllerState.getCurrentDisplayName(),
        storageBasePath
      })
      backendSession?.backendHost.bridge.emit(
        'shareQrOutputsChanged',
        await createShareQrOutputs({ profile })
      )
    } catch (error) {
      backendSession?.backendHost.bridge.emit('errorReceived', error)
    }
  }
}

function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
