import { createDesktopBackendSession } from './desktop-backend-session.js'
import { createDesktopControllerState } from './desktop-controller-state.js'
import { createDesktopFileProfileContext } from './desktop-profile-context.js'

export function createDesktopMainBackendSession({
  createBackendSession = createDesktopBackendSession,
  createControllerState = createDesktopControllerState,
  createId = defaultCreateId,
  createProfileContext = createDesktopFileProfileContext,
  defaultDisplayName = 'Desktop',
  storageBasePath
} = {}) {
  const controllerState = createControllerState({ defaultDisplayName })
  let backendSession = null

  backendSession = createBackendSession({
    controllerState,
    createId,
    getCurrentDisplayName: () => controllerState.getCurrentDisplayName(),
    getProfileContext: (displayName = controllerState.getCurrentDisplayName()) =>
      createProfileContext({ displayName, storageBasePath }),
    onChanged: () => publishSnapshots(),
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
  }
}

function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
