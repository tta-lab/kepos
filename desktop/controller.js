/* global navigator */

import { createDesktopBackendSubscriptions } from '../src/desktop-backend-subscriptions.ts'
import { createDesktopCommandDispatcher } from '../src/desktop-command-dispatcher.ts'
import { createDesktopRenderPresenter } from '../src/desktop-render-presenter.ts'
import { setDesktopTab } from '../src/desktop-state.ts'
import { createDesktopRendererBackendClient } from '../src/desktop-renderer-backend-client.ts'
import { createDesktopControllerState } from '../src/desktop-controller-state.ts'
import { createDesktopUiActionBindings } from '../src/desktop-ui-action-bindings.ts'
import { createDefaultSecureId } from '../src/secure-id.ts'

const BLOCKING_COMMANDS = new Set([
  'joinHome',
  'joinHomeUri',
  'leaveHome',
  'prepareProfileRequestTarget'
])

const controllerState = createDesktopControllerState()
let backendContactBook = null
let backendDmThreads = []
let localBackendSession = null
let localBackendSessionFactory = null
let localProfileApi = null
let largeQrReturnFocus = null
let shareQrOutputs = {
  homeSvg: '',
  homeUri: '',
  profileSvg: '',
  profileUri: ''
}
const renderPresenter = createDesktopRenderPresenter({
  formatTime,
  shortenProfileId: shorten,
  ui: globalThis.keposDesktopUi
})
const qrActions = createControllerQrActions()
const backendClient = createDesktopRendererBackendClient({
  createLocalBackend: () => getLocalBackendSession().backendHost.bridge,
  mode: globalThis.keposBackend ? 'preload' : 'auto'
})
const commandDispatcher = createDesktopCommandDispatcher({
  backendClient,
  blockingCommands: BLOCKING_COMMANDS,
  onError: showError,
  onPendingChanged: () => render()
})

createDesktopUiActionBindings({
  dispatchCommand,
  onError: showError,
  qrActions,
  selectDirectContact,
  setTab,
  ui: globalThis.keposDesktopUi,
  updateDirectComposerRecipient,
  updateAvatarMedia,
  updateAvatarUri,
  updateDisplayName
})

createDesktopBackendSubscriptions({
  backendClient,
  getState: () => controllerState.getState(),
  onError: showError,
  onRender: () => render(),
  setContactBook: (nextContactBook) => {
    backendContactBook = nextContactBook
  },
  setContextFormDraft: (draft) => {
    globalThis.keposDesktopUi?.setContextFormDraft(draft)
  },
  setDirectComposerRecipient: (profileId) => {
    controllerState.setDirectComposerRecipient(profileId)
    globalThis.keposDesktopUi?.setDirectComposerRecipient(profileId)
  },
  setDmSession: (nextSession) => {
    controllerState.setDmSession(nextSession)
  },
  setDmThreads: (nextThreads) => {
    backendDmThreads = Array.isArray(nextThreads) ? nextThreads : []
  },
  setHomeSession: (nextSession) => {
    controllerState.setSession(nextSession)
  },
  setProfileRequestTarget: (target) => {
    globalThis.keposDesktopUi?.setProfileRequestTarget(target)
  },
  setShareQrOutputs: (outputs) => {
    qrActions.setShareQrOutputs(outputs)
  },
  setState: (nextState) => {
    controllerState.setState(nextState)
  }
})

refreshLocalShareQrOutputs().catch(showError)
render()

async function dispatchCommand(command, payload) {
  await commandDispatcher.dispatch(command, payload)
}

globalThis.keposDesktopDispatchCommand = dispatchCommand

function updateDisplayName(displayName = 'Desktop') {
  controllerState.setCurrentDisplayName(displayName)
  refreshLocalShareQrOutputs().catch(showError)
}

function updateAvatarUri(avatarUri = '') {
  controllerState.setCurrentAvatarMedia(null)
  controllerState.setCurrentAvatarUri(avatarUri)
  refreshLocalShareQrOutputs().catch(showError)
}

function updateAvatarMedia(avatar = {}) {
  if (avatar.avatarMedia) controllerState.setCurrentAvatarMedia(avatar.avatarMedia)
  if (avatar.avatarUri) controllerState.setCurrentAvatarUri(avatar.avatarUri)
  refreshLocalShareQrOutputs().catch(showError)
}

async function refreshLocalShareQrOutputs() {
  if (backendClient.hasPreloadBackend()) return
  await qrActions.updateQrOutputs()
}

function getCurrentDisplayName() {
  return controllerState.getCurrentDisplayName()
}

function getProfileContext(displayName = getCurrentDisplayName()) {
  return getLocalProfileApi().createProfileContext({
    avatarMedia: controllerState.getCurrentAvatarMedia(),
    avatarUri: controllerState.getCurrentAvatarUri(),
    displayName
  })
}

function setTab(tab) {
  controllerState.updateState((state) => setDesktopTab(state, tab))
  render()
}

function render() {
  renderPresenter.render({
    contactBook: getRenderContactBook(),
    directComposerRecipientProfileId: controllerState.getDirectComposerRecipientProfileId(),
    dmSession: controllerState.getDmSession(),
    dmThreads: getRenderDmThreads(),
    pendingCommand: commandDispatcher.getPendingCommand(),
    session: controllerState.getSession(),
    state: controllerState.getState()
  })
}

function getRenderDmThreads() {
  if (backendClient.hasPreloadBackend()) return backendDmThreads
  return getLocalBackendSession().runtime.dm.loadThreads()
}

function getRenderContactBook() {
  if (backendContactBook) return backendContactBook
  if (backendClient.hasPreloadBackend()) return null
  return getProfileContext().contactBook
}

function updateDirectComposerRecipient(toProfileId = '') {
  controllerState.setDirectComposerRecipient(toProfileId)
  render()
}

function selectDirectContact(profileId = '') {
  if (!controllerState.selectDirectContact(profileId)) return
  globalThis.keposDesktopUi?.setDirectComposerRecipient(profileId)
  render()
}

function showError(error) {
  console.error(error)
  controllerState.updateState((state) => ({
    ...state,
    lastError: error.message,
    notice: getDesktopErrorNotice(error)
  }))
  render()
}

function getDesktopErrorNotice(error) {
  const message = error?.message || ''

  if (message.includes('This trusted-only home is not trusted locally')) {
    return 'Could not join this home. Trust this friend on this device first.'
  }

  if (message.includes('Home QR is required') || message.includes('Invalid signed home QR')) {
    return 'Could not read this Home QR.'
  }

  if (message.includes('Profile QR is required') || message.includes('Invalid signed profile QR')) {
    return 'Could not read this Profile QR.'
  }

  return 'Something went wrong.'
}

function createId() {
  return createDefaultSecureId()
}

function shorten(value) {
  return `${value.slice(0, 8)}...${value.slice(-8)}`
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

globalThis.Pear?.updates?.(() => globalThis.Pear.reload())
globalThis.Pear?.teardown?.(() => localBackendSession?.roomActions.leaveHome())

function getLocalBackendSession() {
  if (!localBackendSession) {
    const createLocalBackendSession = loadLocalBackendSessionFactory()
    localBackendSession = createLocalBackendSession({
      controllerState,
      createId,
      getProfileContext,
      getCurrentDisplayName,
      onError: showError,
      onChanged: () => render(),
      setContextFormDraft: (draft) => globalThis.keposDesktopUi?.setContextFormDraft(draft),
      setDirectComposerRecipient: (profileId) => {
        controllerState.setDirectComposerRecipient(profileId)
        globalThis.keposDesktopUi?.setDirectComposerRecipient(profileId)
      },
      setProfileRequestTarget: (target) => {
        globalThis.keposDesktopUi?.setProfileRequestTarget(target)
      },
      setNotice: (notice) => {
        controllerState.updateState((state) => ({ ...state, notice }))
      },
      shortenProfileId: shorten,
      storageBasePath: getLocalProfileApi().getStorageBasePath(),
      updateState: (updater) => {
        controllerState.updateState(updater)
      }
    })
  }

  return localBackendSession
}

function loadLocalBackendSessionFactory() {
  if (!localBackendSessionFactory) {
    const localBackendModule = globalThis.eval("require('./local-backend.bundle.cjs')")
    localBackendSessionFactory = localBackendModule.createLocalBackendSession
  }

  return localBackendSessionFactory
}

function getLocalProfileApi() {
  if (!localProfileApi) {
    localProfileApi = globalThis.eval("require('./local-profile.bundle.cjs')")
  }

  return localProfileApi
}

function createControllerQrActions() {
  return {
    async copyQrValue({ notice, value }) {
      if (!value.trim()) return

      await navigator.clipboard.writeText(value)
      setNotice(notice)
      render()
    },
    getShareQrOutputs() {
      return shareQrOutputs
    },
    hideLargeQr() {
      globalThis.keposDesktopUi?.setLargeQr({ isOpen: false, svg: '', title: '' })
      largeQrReturnFocus?.focus()
      largeQrReturnFocus = null
    },
    setShareQrOutputs(outputs) {
      setShareQrOutputsSnapshot(outputs)
    },
    async showLargeQr({ returnFocus, title, uri }) {
      if (!uri) return

      largeQrReturnFocus = returnFocus
      const svg =
        getShareQrSvgForUri(uri) ||
        (await getLocalProfileApi().renderQrSvg(uri, {
          margin: 4,
          width: 640
        }))
      globalThis.keposDesktopUi?.setLargeQr({
        isOpen: true,
        svg,
        title
      })
    },
    async updateQrOutputs() {
      const { profile } = getProfileContext()
      setShareQrOutputsSnapshot(await getLocalProfileApi().createShareQrOutputs({ profile }))
    }
  }
}

function setNotice(notice) {
  controllerState.updateState((state) => ({ ...state, notice }))
}

function setShareQrOutputsSnapshot(outputs) {
  shareQrOutputs = outputs
  globalThis.keposDesktopUi?.setShareQrOutputs(shareQrOutputs)
}

function getShareQrSvgForUri(uri) {
  if (uri === shareQrOutputs.homeUri) return shareQrOutputs.homeSvg
  if (uri === shareQrOutputs.profileUri) return shareQrOutputs.profileSvg
  return ''
}
