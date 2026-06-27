/* global navigator */

import { createDesktopControlActions } from '../src/desktop-control-actions.js'
import { createDesktopProfileContext } from '../src/desktop-profile-context.js'
import { createDesktopMessageActions } from '../src/desktop-message-actions.js'
import { createDesktopMessageRequestActions } from '../src/desktop-message-request-actions.js'
import { createDesktopQrActions } from '../src/desktop-qr-actions.js'
import { createDesktopRenderPresenter } from '../src/desktop-render-presenter.js'
import { createDesktopRoomActions } from '../src/desktop-room-actions.js'
import { createDesktopState, setDesktopTab, setDesktopTreehole } from '../src/desktop-state.js'
import { createDesktopLocalBackendHost } from '../src/desktop-local-backend-host.js'
import { createDesktopRendererBackendClient } from '../src/desktop-renderer-backend-client.js'
import { getDesktopStorageBasePath } from '../src/desktop-storage-base.js'
import { createDesktopTrustActions } from '../src/desktop-trust-actions.js'

const BLOCKING_COMMANDS = new Set(['joinHome', 'joinHomeUri', 'leaveHome', 'trustProfileUri'])

let state = createDesktopState()
let session = null
let dmSession = null
let homeJoinDetails = null
let pendingCommand = null
let directComposerRecipientProfileId = ''
let currentDisplayName = 'Desktop'
const messageActions = createDesktopMessageActions({
  createId,
  getDmRuntime: () => dmRuntime,
  getDmSession: () => dmSession,
  getHomeRuntime: () => homeRuntime,
  getSession: () => session,
  getTreeholeCanPost: () => state.treeholeCanPost,
  getTreeholeRuntime: () => treeholeRuntime,
  onChanged: () => render(),
  setSession: (nextSession) => {
    session = nextSession
  }
})
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
    state = { ...state, notice }
  },
  setShareQrOutputs: (outputs) => globalThis.keposDesktopUi?.setShareQrOutputs(outputs)
})
const controlActions = createDesktopControlActions({
  configureTreeholeRuntime,
  getDmRuntime: () => dmRuntime,
  getHomeJoinDetails: () => homeJoinDetails,
  getHomeRuntime: () => homeRuntime,
  getProfileContext,
  getTreeholeRuntime: () => treeholeRuntime,
  onChanged: () => render(),
  openTreehole,
  setHomeJoinDetails: (nextDetails) => {
    homeJoinDetails = nextDetails
  },
  setNotice: (notice) => {
    state = { ...state, notice }
  },
  shortenProfileId: shorten
})
const messageRequestActions = createDesktopMessageRequestActions({
  createId,
  getDmRuntime: () => dmRuntime,
  getDmSession: () => dmSession,
  getHomeRuntime: () => homeRuntime,
  getProfileContext,
  onChanged: () => render(),
  setNotice: (notice) => {
    state = { ...state, notice }
  }
})
const roomActions = createDesktopRoomActions({
  closeAll: () => backendRuntime.closeAll(),
  configureTreeholeRuntime,
  getCurrentDisplayName,
  getDmRuntime: () => dmRuntime,
  getHomeRuntime: () => homeRuntime,
  getProfileContext,
  getTreeholeRuntime: () => treeholeRuntime,
  onChanged: () => render(),
  openTreehole,
  setContextFormDraft: (draft) => globalThis.keposDesktopUi?.setContextFormDraft(draft),
  setDmSession: (nextSession) => {
    dmSession = nextSession
  },
  setHomeJoinDetails: (nextDetails) => {
    homeJoinDetails = nextDetails
  },
  setSession: (nextSession) => {
    session = nextSession
  },
  updateState: (updater) => {
    state = updater(state)
  }
})
const trustActions = createDesktopTrustActions({
  configureTreeholeRuntime,
  getDmRuntime: () => dmRuntime,
  getHomeJoinDetails: () => homeJoinDetails,
  getProfileContext,
  getSelectedRecipientProfileId: () => directComposerRecipientProfileId,
  onChanged: () => render(),
  setContextFormDraft: (draft) => globalThis.keposDesktopUi?.setContextFormDraft(draft),
  setDirectComposerRecipient: (profileId) => {
    directComposerRecipientProfileId = profileId
    globalThis.keposDesktopUi?.setDirectComposerRecipient(profileId)
  },
  setHomeJoinDetails: (nextDetails) => {
    homeJoinDetails = nextDetails
  },
  setNotice: (notice) => {
    state = { ...state, notice }
  }
})
const backendHost = createDesktopLocalBackendHost({
  actions: {
    acceptMessageRequest: messageRequestActions.acceptMessageRequest,
    commentTreehole: messageActions.commentTreehole,
    ignoreMessageRequest: messageRequestActions.ignoreMessageRequest,
    joinHome: roomActions.joinHome,
    joinHomeUri: roomActions.joinHomeUri,
    leaveHome: roomActions.leaveHome,
    likeTreehole: messageActions.likeTreehole,
    postTreehole: messageActions.postTreehole,
    revokeContact: trustActions.revokeContact,
    sendDmMessage: messageActions.sendDmMessage,
    sendHomeMessage: messageActions.sendHomeMessage,
    sendMessageRequest: messageActions.sendDmMessage,
    trustProfileUri: trustActions.trustProfileUri
  },
  runtimeOptions: {
    onDmSessionChanged: (nextSession) => {
      dmSession = nextSession
      render()
    },
    onHomeControl: (message, peer) => controlActions.handleControl(message, peer).catch(showError),
    onHomeSessionChanged: (nextSession) => {
      session = nextSession
      render()
    },
    onVerifiedHello: (message, peer) =>
      controlActions.sendTreeholeBootstrap(peer, message.profileId),
    storageBasePath: getDesktopStorageBasePath()
  }
})
const backendClient = createDesktopRendererBackendClient({
  localBackend: backendHost.bridge
})
const backendRuntime = backendHost.runtime
const dmRuntime = backendHost.dmRuntime
const homeRuntime = backendHost.homeRuntime
const treeholeRuntime = backendHost.treeholeRuntime

globalThis.keposDesktopUi?.setContextFormActions({
  copyHomeQr: () =>
    qrActions
      .copyQrValue({ notice: 'Home QR copied.', value: qrActions.getShareQrOutputs().homeUri })
      .catch(showError),
  copyProfileQr: () =>
    qrActions
      .copyQrValue({
        notice: 'Profile QR copied.',
        value: qrActions.getShareQrOutputs().profileUri
      })
      .catch(showError),
  createHome: () => dispatchCommand('joinHome', { createTreehole: true, mode: 'host' }),
  joinHomeQr: ({ displayName, uri }) => dispatchCommand('joinHomeUri', { displayName, uri }),
  joinManualHome: ({ roomKey }) =>
    dispatchCommand('joinHome', { createTreehole: false, mode: 'peer', roomKey }),
  showLargeHomeQr: ({ returnFocus }) =>
    qrActions
      .showLargeQr({
        returnFocus,
        title: 'Home QR',
        uri: qrActions.getShareQrOutputs().homeUri
      })
      .catch(showError),
  showLargeProfileQr: ({ returnFocus }) =>
    qrActions
      .showLargeQr({
        returnFocus,
        title: 'Profile QR',
        uri: qrActions.getShareQrOutputs().profileUri
      })
      .catch(showError),
  trustProfileQr: ({ alias, displayName, uri }) =>
    dispatchCommand('trustProfileUri', { alias, displayName, uri }),
  updateDisplayName: ({ displayName }) => updateDisplayName(displayName)
})
globalThis.keposDesktopUi?.setDirectContactPickerActions({
  openPeople: () => setTab('people'),
  selectContact: (profileId) => selectDirectContact(profileId)
})
globalThis.keposDesktopUi?.setDirectComposerActions({
  sendDirectMessage: ({ text, toProfileId }) =>
    dispatchCommand('sendDmMessage', { text, toProfileId }),
  updateRecipient: ({ toProfileId }) => updateDirectComposerRecipient(toProfileId)
})
globalThis.keposDesktopUi?.setDirectMessageActions({
  acceptMessage: (message) => dispatchCommand('acceptMessageRequest', { message }),
  ignoreMessage: (message) => dispatchCommand('ignoreMessageRequest', { message })
})
globalThis.keposDesktopUi?.setHomeComposerActions({
  sendHomeMessage: ({ text }) => dispatchCommand('sendHomeMessage', { text })
})
globalThis.keposDesktopUi?.setPeopleActions({
  acceptMessageRequest: (message) => dispatchCommand('acceptMessageRequest', { message }),
  ignoreMessageRequest: (profileId) => dispatchCommand('ignoreMessageRequest', { profileId }),
  revokeContact: (profileId) => dispatchCommand('revokeContact', { profileId })
})
globalThis.keposDesktopUi?.setShellActions({
  hideLargeQr: () => qrActions.hideLargeQr(),
  leaveHome: () => dispatchCommand('leaveHome'),
  setTab: (tab) => setTab(tab)
})
globalThis.keposDesktopUi?.setTreeholeActions({
  commentPost: ({ postId, text }) => dispatchCommand('commentTreehole', { postId, text }),
  likePost: (postId) => dispatchCommand('likeTreehole', { postId })
})
globalThis.keposDesktopUi?.setTreeholeComposerActions({
  postTreehole: ({ text }) => dispatchCommand('postTreehole', { text })
})

backendClient.subscribe('treeholeStateChanged', (snapshot) => {
  state = setDesktopTreehole(state, snapshot)
  render()
})
backendClient.subscribe('peerCountChanged', ({ peers }) => {
  state = { ...state, peers }
  render()
})
backendClient.subscribe('errorReceived', showError)

qrActions.updateQrOutputs().catch(showError)
render()

async function dispatchCommand(command, payload) {
  if (isBlockingCommand(command) && pendingCommand) return

  if (isBlockingCommand(command)) {
    pendingCommand = command
    render()
  }

  try {
    await backendClient.dispatch(command, payload)
  } catch (error) {
    showError(error)
  } finally {
    if (pendingCommand === command) {
      pendingCommand = null
      render()
    }
  }
}

function isBlockingCommand(command) {
  return BLOCKING_COMMANDS.has(command)
}

function updateDisplayName(displayName = 'Desktop') {
  currentDisplayName = displayName.trim() || 'Desktop'
  qrActions.updateQrOutputs().catch(showError)
}

function getCurrentDisplayName() {
  return currentDisplayName
}

function getProfileContext(displayName = getCurrentDisplayName()) {
  return createDesktopProfileContext({ displayName })
}

function configureTreeholeRuntime() {
  backendRuntime.configure({ homeJoinDetails, session })
}

async function openTreehole(bootstrapKey = null) {
  configureTreeholeRuntime()
  await treeholeRuntime.open({
    bootstrapKey,
    initialPosts: state.treeholePosts,
    initialStatus: state.treeholeStatus
  })
}

function setTab(tab) {
  state = setDesktopTab(state, tab)
  render()
}

function render() {
  const { contactBook } = getProfileContext()
  renderPresenter.render({
    contactBook,
    directComposerRecipientProfileId,
    dmSession,
    pendingCommand,
    session,
    state
  })
}

function updateDirectComposerRecipient(toProfileId = '') {
  directComposerRecipientProfileId = toProfileId.trim()
  render()
}

function selectDirectContact(profileId = '') {
  if (!profileId) return
  directComposerRecipientProfileId = profileId
  globalThis.keposDesktopUi?.setDirectComposerRecipient(profileId)
  render()
}

function showError(error) {
  console.error(error)
  state = { ...state, lastError: error.message, notice: getDesktopErrorNotice(error) }
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
globalThis.Pear?.teardown?.(() => roomActions.leaveHome())
