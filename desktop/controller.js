/* global navigator */

import { createDesktopBackendSession } from '../src/desktop-backend-session.js'
import { createDesktopBackendSubscriptions } from '../src/desktop-backend-subscriptions.js'
import { createDesktopCommandDispatcher } from '../src/desktop-command-dispatcher.js'
import { createDesktopProfileContext } from '../src/desktop-profile-context.js'
import { createDesktopQrActions } from '../src/desktop-qr-actions.js'
import { createDesktopRenderPresenter } from '../src/desktop-render-presenter.js'
import { setDesktopTab } from '../src/desktop-state.js'
import { createDesktopRendererBackendClient } from '../src/desktop-renderer-backend-client.js'
import { getDesktopStorageBasePath } from '../src/desktop-storage-base.js'
import { createDesktopControllerState } from '../src/desktop-controller-state.js'
import { createDesktopUiActionBindings } from '../src/desktop-ui-action-bindings.js'

const BLOCKING_COMMANDS = new Set(['joinHome', 'joinHomeUri', 'leaveHome', 'trustProfileUri'])

const controllerState = createDesktopControllerState()
let backendContactBook = null
const renderPresenter = createDesktopRenderPresenter({
  formatTime,
  shortenProfileId: shorten,
  ui: globalThis.keposDesktopUi
})
const qrActions = createDesktopQrActions({
  copyText: (value) => navigator.clipboard.writeText(value),
  getProfileContext,
  onChanged: () => render(),
  setLargeQr: (qr) => globalThis.keposDesktopUi?.setLargeQr(qr),
  setNotice: (notice) => {
    controllerState.updateState((state) => ({ ...state, notice }))
  },
  setShareQrOutputs: (outputs) => globalThis.keposDesktopUi?.setShareQrOutputs(outputs)
})
const backendSession = createDesktopBackendSession({
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
  setNotice: (notice) => {
    controllerState.updateState((state) => ({ ...state, notice }))
  },
  shortenProfileId: shorten,
  storageBasePath: getDesktopStorageBasePath(),
  updateState: (updater) => {
    controllerState.updateState(updater)
  }
})
const backendClient = createDesktopRendererBackendClient({
  localBackend: backendSession.backendHost.bridge
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
  setDmSession: (nextSession) => {
    controllerState.setDmSession(nextSession)
  },
  setHomeSession: (nextSession) => {
    controllerState.setSession(nextSession)
  },
  setState: (nextState) => {
    controllerState.setState(nextState)
  }
})

qrActions.updateQrOutputs().catch(showError)
render()

async function dispatchCommand(command, payload) {
  await commandDispatcher.dispatch(command, payload)
}

function updateDisplayName(displayName = 'Desktop') {
  controllerState.setCurrentDisplayName(displayName)
  qrActions.updateQrOutputs().catch(showError)
}

function getCurrentDisplayName() {
  return controllerState.getCurrentDisplayName()
}

function getProfileContext(displayName = getCurrentDisplayName()) {
  return createDesktopProfileContext({ displayName })
}

function setTab(tab) {
  controllerState.updateState((state) => setDesktopTab(state, tab))
  render()
}

function render() {
  const { contactBook } = getProfileContext()
  renderPresenter.render({
    contactBook: backendContactBook || contactBook,
    directComposerRecipientProfileId: controllerState.getDirectComposerRecipientProfileId(),
    dmSession: controllerState.getDmSession(),
    pendingCommand: commandDispatcher.getPendingCommand(),
    session: controllerState.getSession(),
    state: controllerState.getState()
  })
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
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
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
globalThis.Pear?.teardown?.(() => backendSession.roomActions.leaveHome())
