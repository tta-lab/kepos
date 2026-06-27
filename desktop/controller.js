/* global document, navigator */

import {
  createDesktopControlMessageResult,
  createDesktopTreeholeControlSendResult
} from '../src/desktop-control-service.js'
import { createDesktopDirectContactPickerViewModel } from '../src/desktop-direct-contact-picker-view-model.js'
import { createDesktopDirectMessageListViewModel } from '../src/desktop-direct-view-model.js'
import { createDesktopHomeChatViewModel } from '../src/desktop-home-chat-view-model.js'
import { createDesktopHomeJoinDetails } from '../src/desktop-home-join-service.js'
import { createDesktopPeopleViewModel } from '../src/desktop-people-view-model.js'
import { createDesktopProfileContext } from '../src/desktop-profile-context.js'
import {
  createDesktopMessageRequestAcceptance,
  createDesktopMessageRequestIgnore
} from '../src/desktop-message-request-service.js'
import {
  applyDesktopHomeQr,
  applyDesktopProfileTrustQr,
  createDesktopShareQrOutputs,
  renderDesktopQrSvg
} from '../src/desktop-qr-service.js'
import { createDesktopContactRevoke } from '../src/desktop-revoke-service.js'
import {
  createDesktopState,
  setDesktopRoom,
  setDesktopTab,
  setDesktopTreehole
} from '../src/desktop-state.js'
import { createDesktopStatusViewModel } from '../src/desktop-status-view-model.js'
import { createDesktopTreeholeViewModel } from '../src/desktop-treehole-view-model.js'
import { createDesktopLocalBackendHost } from '../src/desktop-local-backend-host.js'
import { createDesktopRendererBackendClient } from '../src/desktop-renderer-backend-client.js'
import { getDesktopStorageBasePath } from '../src/desktop-storage-base.js'

const BLOCKING_COMMANDS = new Set(['joinHome', 'joinHomeUri', 'leaveHome', 'trustProfileUri'])

let state = createDesktopState()
let session = null
let dmSession = null
let homeJoinDetails = null
let largeQrReturnFocus = null
let pendingCommand = null
let directComposerRecipientProfileId = ''
let currentDisplayName = 'Desktop'
let shareQrOutputs = {
  homeSvg: '',
  homeUri: '',
  profileSvg: '',
  profileUri: ''
}
const backendHost = createDesktopLocalBackendHost({
  actions: {
    acceptMessageRequest: acceptIncomingMessageRequest,
    commentTreehole: commentTreeholePost,
    ignoreMessageRequest: ignoreIncomingMessageRequest,
    joinHome: joinRoom,
    joinHomeUri: joinHomeQr,
    leaveHome: leaveRoom,
    likeTreehole: likeTreeholePost,
    postTreehole,
    revokeContact: revokeLocalContact,
    sendDmMessage: sendMessageRequest,
    sendHomeMessage: sendChat,
    sendMessageRequest,
    trustProfileUri: trustProfileQr
  },
  runtimeOptions: {
    onDmSessionChanged: (nextSession) => {
      dmSession = nextSession
      render()
    },
    onHomeControl: (message, peer) => handleControl(message, peer).catch(showError),
    onHomeSessionChanged: (nextSession) => {
      session = nextSession
      render()
    },
    onVerifiedHello: (message, peer) => sendTreeholeBootstrap(peer, message.profileId),
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
    copyQrValue({ notice: 'Home QR copied.', value: shareQrOutputs.homeUri }).catch(showError),
  copyProfileQr: () =>
    copyQrValue({ notice: 'Profile QR copied.', value: shareQrOutputs.profileUri }).catch(
      showError
    ),
  createHome: () => dispatchCommand('joinHome', { createTreehole: true, mode: 'host' }),
  joinHomeQr: ({ displayName, uri }) => dispatchCommand('joinHomeUri', { displayName, uri }),
  joinManualHome: ({ roomKey }) =>
    dispatchCommand('joinHome', { createTreehole: false, mode: 'peer', roomKey }),
  showLargeHomeQr: ({ returnFocus }) =>
    showLargeQr({ returnFocus, title: 'Home QR', uri: shareQrOutputs.homeUri }).catch(showError),
  showLargeProfileQr: ({ returnFocus }) =>
    showLargeQr({ returnFocus, title: 'Profile QR', uri: shareQrOutputs.profileUri }).catch(
      showError
    ),
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
  hideLargeQr: () => hideLargeQr(),
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

updateQrOutputs().catch(showError)
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

async function joinRoom({ createTreehole, homeAddress = null, mode, roomKey }) {
  await leaveRoom()

  const nick = getCurrentDisplayName()
  const { contactBook, profile, storage } = getProfileContext(nick)
  const homeJoin = createDesktopHomeJoinDetails({
    contactBook,
    homeAddress,
    mode,
    nick,
    profile,
    roomKey
  })

  globalThis.keposDesktopUi?.setContextFormDraft({
    roomKey: homeJoin.homeJoinDetails.roomKey
  })
  homeJoinDetails = homeJoin.homeJoinDetails
  session = homeJoin.session
  configureTreeholeRuntime()
  dmSession = await dmRuntime.start({ nick, profile, storage })
  state = setDesktopRoom(state, {
    mode: homeJoin.mode,
    nick,
    peers: 0,
    roomKey: homeJoin.homeJoinDetails.roomKey
  })
  state = { ...state, notice: 'Joining home...' }
  render()

  await homeRuntime.join({ homeJoinDetails })

  if (createTreehole) {
    await openTreehole()
    homeRuntime.requestHomeHello()
  } else {
    state = setDesktopTreehole(state, {
      canPost: canPostToCurrentTreehole(),
      status: 'waiting-for-bootstrap',
      posts: []
    })
  }

  state = { ...state, notice: 'Home joined.' }
  render()
}

async function joinHomeQr({ displayName = 'Desktop', uri } = {}) {
  if (!uri) return

  const { contactBook, profile } = getProfileContext(displayName)
  const homeAddress = applyDesktopHomeQr({
    book: contactBook,
    localProfileId: profile.id,
    uri
  })

  globalThis.keposDesktopUi?.setContextFormDraft({ homeQrUri: '' })
  await joinRoom({
    createTreehole: false,
    homeAddress,
    mode: 'peer'
  })
}

function trustProfileQr({ alias = '', displayName = 'Desktop', uri } = {}) {
  if (!uri) return

  const context = getProfileContext(displayName)
  const { contactBook, profile } = context
  const result = applyDesktopProfileTrustQr({
    alias,
    book: contactBook,
    localIdentity: profile.identity,
    localProfileId: profile.id,
    uri
  })

  context.saveContactBook(result.book)

  if (homeJoinDetails?.profileId === profile.id) {
    homeJoinDetails = {
      ...homeJoinDetails,
      treeholePolicy: result.treeholePolicy
    }
    configureTreeholeRuntime()
  }
  globalThis.keposDesktopUi?.setContextFormDraft({
    trustAlias: '',
    trustQrUri: ''
  })
  state = { ...state, notice: 'Trusted friend added.' }
  render()
}

function updateDisplayName(displayName = 'Desktop') {
  currentDisplayName = displayName.trim() || 'Desktop'
  updateQrOutputs().catch(showError)
}

async function updateQrOutputs() {
  const { profile } = getProfileContext()
  shareQrOutputs = await createDesktopShareQrOutputs({
    profile
  })

  globalThis.keposDesktopUi?.setShareQrOutputs(shareQrOutputs)
}

async function showLargeQr({ returnFocus, title, uri }) {
  if (!uri) return

  largeQrReturnFocus = returnFocus
  const svg = await renderDesktopQrSvg(uri, {
    margin: 2,
    width: 520
  })
  globalThis.keposDesktopUi?.setLargeQr({
    isOpen: true,
    svg,
    title
  })
}

async function copyQrValue({ notice, value }) {
  if (!value.trim()) return

  await navigator.clipboard.writeText(value)
  state = { ...state, notice }
  render()
}

function hideLargeQr() {
  globalThis.keposDesktopUi?.setLargeQr({ isOpen: false, svg: '', title: '' })
  largeQrReturnFocus?.focus()
  largeQrReturnFocus = null
}

function getCurrentDisplayName() {
  return currentDisplayName
}

function getProfileContext(displayName = getCurrentDisplayName()) {
  return createDesktopProfileContext({ displayName })
}

async function leaveRoom() {
  await backendRuntime.closeAll()
  session = null
  dmSession = null
  homeJoinDetails = null
  configureTreeholeRuntime()
  state = createDesktopState()
  render()
}

function configureTreeholeRuntime() {
  backendRuntime.configure({ homeJoinDetails, session })
}

function sendChat({ text } = {}) {
  if (!homeRuntime.isJoined() || !session || !text) return

  const message = {
    at: Date.now(),
    id: createId(),
    text
  }

  session = homeRuntime.sendMessage(message)
  render()
}

function sendMessageRequest({ text, toProfileId } = {}) {
  if (!homeRuntime.isJoined() || !dmSession || !toProfileId || !text) return

  const result = dmRuntime.sendMessageOrRequest({
    broadcastControl: (request) => homeRuntime.broadcastControl(request),
    createdAt: Date.now(),
    messageId: createId(),
    requestId: createId(),
    text,
    toProfileId
  })

  if (!result) return

  render()
}

async function postTreehole({ text } = {}) {
  if (!text || !state.treeholeCanPost) return

  await treeholeRuntime.post({
    createdAt: Date.now(),
    id: createId(),
    text
  })
}

async function handleControl(message, peer) {
  if (message.type === 'kepos.message.request.v1') {
    const context = getProfileContext()
    const result = await createDesktopControlMessageResult({
      contactBook: context.contactBook,
      currentDmSession: dmRuntime.getSession(),
      fallbackAlias: shorten(message.fromProfileId),
      message
    })
    if (!result) return

    context.saveContactBook(result.book)
    dmRuntime.appendIncomingRequest(result.appendIncomingRequest)
    state = { ...state, notice: 'Message request received.' }
    render()
    return
  }

  if (message.type === 'kepos.dm.invite.v1') {
    const { contactBook, profile } = getProfileContext()
    const result = await createDesktopControlMessageResult({
      acceptInviteAsRecipient: (payload) => dmRuntime.acceptInviteAsRecipient(payload),
      contactBook,
      currentDmSession: dmRuntime.getSession(),
      message,
      recipientEncryptionKeyPair: profile.dmEncryptionKeyPair
    })
    if (!result) return

    state = { ...state, notice: 'Direct message ready.' }
    render()
    return
  }

  if (message.type === 'treehole.bootstrap') {
    const result = await createDesktopControlMessageResult({ message, peer })
    if (!result) return

    if (result.ownerProfileId && homeJoinDetails) {
      homeJoinDetails = {
        ...homeJoinDetails,
        ownerProfileId: result.ownerProfileId
      }
      configureTreeholeRuntime()
    }
    await openTreehole(result.bootstrapKey)
    sendTreeholeWriter(result.sendWriterPeer)
    return
  }

  if (message.type === 'treehole.writer') {
    const result = await createDesktopControlMessageResult({ message, peer })
    if (!result) return

    await treeholeRuntime.addWriter(result.writer)
  }
}

async function openTreehole(bootstrapKey = null) {
  configureTreeholeRuntime()
  await treeholeRuntime.open({
    bootstrapKey,
    initialPosts: state.treeholePosts,
    initialStatus: state.treeholeStatus
  })
}

function sendTreeholeBootstrap(peer, remoteProfileId) {
  const result = createDesktopTreeholeControlSendResult({
    createBootstrapControl: (profileId) => treeholeRuntime.createBootstrapControl(profileId),
    isHomeJoined: homeRuntime.isJoined(),
    peer,
    remoteProfileId,
    type: 'bootstrap'
  })
  if (!result) return

  homeRuntime.sendControl(result.peer, result.payload)
}

function sendTreeholeWriter(peer) {
  const result = createDesktopTreeholeControlSendResult({
    createWriterControl: () => treeholeRuntime.createWriterControl(),
    isHomeJoined: homeRuntime.isJoined(),
    peer,
    type: 'writer'
  })
  if (!result) return

  homeRuntime.sendControl(result.peer, result.payload)
}

function canPostToCurrentTreehole() {
  return treeholeRuntime.canPost()
}

function setTab(tab) {
  state = setDesktopTab(state, tab)
  render()
}

function render() {
  const inRoom = state.view === 'room'
  const isActionPending = Boolean(pendingCommand)
  globalThis.keposDesktopUi?.setShellBusy(isActionPending)
  renderStatus()
  renderControls()

  globalThis.keposDesktopUi?.setActiveTab(state.activeTab)

  renderMessages()
  renderDirectMessages()
  renderDirectContacts()
  renderPeople()
  renderPosts()
}

function renderStatus() {
  const status = createDesktopStatusViewModel({
    session,
    shortenProfileId: shorten,
    state
  })
  globalThis.keposDesktopUi?.setStatus(status)
}

function renderControls() {
  const inRoom = state.view === 'room'
  const isActionPending = Boolean(pendingCommand)
  const controls = {
    canCreateHome: !inRoom && !isActionPending,
    canLeaveHome: inRoom && !isActionPending,
    canPostTreehole: Boolean(state.treeholeCanPost),
    canUseDirectComposer: inRoom,
    canUseHomeChatComposer: inRoom,
    canUseHomeQrJoin: !isActionPending && !inRoom,
    canUseManualHomeJoin: !isActionPending && !inRoom,
    canUseTrustProfile: !isActionPending
  }
  globalThis.keposDesktopUi?.setControls(controls)
}

function renderMessages() {
  const messages = createDesktopHomeChatViewModel({
    messages: session?.messages || []
  })
  globalThis.keposDesktopUi?.setHomeMessages(messages)
}

function renderDirectMessages() {
  const messages = createDesktopDirectMessageListViewModel({
    messages: dmSession?.messages || [],
    shortenProfileId: shorten
  })
  globalThis.keposDesktopUi?.setDirectMessages(messages)
}

function renderDirectContacts() {
  const { contactBook } = getProfileContext()
  const picker = createDesktopDirectContactPickerViewModel({
    contactBook,
    selectedProfileId: directComposerRecipientProfileId
  })
  globalThis.keposDesktopUi?.setDirectContactPicker(picker)
}

function updateDirectComposerRecipient(toProfileId = '') {
  directComposerRecipientProfileId = toProfileId.trim()
  renderDirectContacts()
}

function selectDirectContact(profileId = '') {
  if (!profileId) return
  directComposerRecipientProfileId = profileId
  globalThis.keposDesktopUi?.setDirectComposerRecipient(profileId)
  renderDirectContacts()
}

function renderPeople() {
  const { contactBook } = getProfileContext()
  const people = createDesktopPeopleViewModel({
    contactBook,
    shortenProfileId: shorten
  })
  globalThis.keposDesktopUi?.setPeople(people)
}

async function revokeLocalContact(profileId) {
  const context = getProfileContext()
  const { contactBook, profile } = context
  const threads = dmRuntime.loadThreads()
  const result = createDesktopContactRevoke({
    book: contactBook,
    profileId,
    selectedRecipientProfileId: directComposerRecipientProfileId,
    threads
  })

  context.saveContactBook(result.book)
  dmRuntime.replaceThreads(result.nextThreads)

  await dmRuntime.closeThreads(result.revokedThreadIds)

  if (homeJoinDetails?.profileId === profile.id) {
    homeJoinDetails = {
      ...homeJoinDetails,
      treeholePolicy: result.treeholePolicy
    }
    configureTreeholeRuntime()
  }

  if (result.shouldClearRecipient) {
    directComposerRecipientProfileId = ''
    globalThis.keposDesktopUi?.setDirectComposerRecipient('')
  }

  state = { ...state, notice: 'Trust revoked.' }
  render()
}

async function acceptIncomingMessageRequest(message) {
  if (!homeRuntime.isJoined() || !dmSession) return

  const context = getProfileContext()
  const result = await createDesktopMessageRequestAcceptance({
    acceptMessageRequest: (payload) => dmRuntime.acceptMessageRequest(payload),
    acceptedAt: Date.now(),
    book: context.contactBook,
    message,
    threadId: createId()
  })

  if (!result) return

  context.saveContactBook(result.book)
  homeRuntime.broadcastControl(result.invite)
  state = { ...state, notice: 'Message request accepted.' }
  render()
}

function ignoreIncomingMessageRequest({ message = null, profileId = '' }) {
  const context = getProfileContext()
  const result = createDesktopMessageRequestIgnore({
    book: context.contactBook,
    hasDmSession: Boolean(dmSession),
    message,
    profileId
  })
  if (!result) return

  context.saveContactBook(result.book)

  if (result.dismissedMessageId) {
    dmRuntime.dismissMessage({ id: result.dismissedMessageId })
  }

  state = { ...state, notice: 'Message request ignored.' }
  render()
}

function renderPosts() {
  const posts = createDesktopTreeholeViewModel({
    formatTime,
    posts: state.treeholePosts,
    shortenProfileId: shorten
  })
  globalThis.keposDesktopUi?.setTreeholePosts(posts)
}

async function commentTreeholePost({ postId, text }) {
  if (!text.trim()) return

  await treeholeRuntime.comment({
    createdAt: Date.now(),
    id: createId(),
    postId,
    text
  })
}

async function likeTreeholePost(postId) {
  await treeholeRuntime.like({
    createdAt: Date.now(),
    postId
  })
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
globalThis.Pear?.teardown?.(() => leaveRoom())
