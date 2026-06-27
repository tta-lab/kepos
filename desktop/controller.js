/* global document, navigator */

import { createDesktopBackendRuntime } from '../src/desktop-backend-runtime.js'
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
import { createDesktopBackendBridge } from '../src/desktop-backend-bridge.ts'
import { createDesktopCommandRegistry } from '../src/desktop-command-registry.ts'
import { createDesktopRendererBackendClient } from '../src/desktop-renderer-backend-client.js'
import { getDesktopStorageBasePath } from '../src/desktop-storage-base.js'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/
const BLOCKING_COMMANDS = new Set(['joinHome', 'joinHomeUri', 'leaveHome', 'trustProfileUri'])

const els = {
  chatForm: document.querySelector('#chatForm'),
  chatInput: document.querySelector('#chatInput'),
  chatPane: document.querySelector('#chatPane'),
  chatSendButton: document.querySelector('#chatSendButton'),
  chatTab: document.querySelector('#chatTab'),
  copyHomeQrButton: document.querySelector('#copyHomeQrButton'),
  copyProfileQrButton: document.querySelector('#copyProfileQrButton'),
  createButton: document.querySelector('#createButton'),
  dmForm: document.querySelector('#dmForm'),
  dmInput: document.querySelector('#dmInput'),
  dmPane: document.querySelector('#dmPane'),
  dmRecipientInput: document.querySelector('#dmRecipientInput'),
  dmSendButton: document.querySelector('#dmSendButton'),
  dmTab: document.querySelector('#dmTab'),
  homeQrForm: document.querySelector('#homeQrForm'),
  homeQrInput: document.querySelector('#homeQrInput'),
  joinButton: document.querySelector('#joinButton'),
  joinHomeQrButton: document.querySelector('#joinHomeQrButton'),
  largeQrCloseButton: document.querySelector('#largeQrCloseButton'),
  largeQrDialog: document.querySelector('#largeQrDialog'),
  leaveButton: document.querySelector('#leaveButton'),
  lobbyForm: document.querySelector('#lobbyForm'),
  nickInput: document.querySelector('#nickInput'),
  peoplePane: document.querySelector('#peoplePane'),
  peopleTab: document.querySelector('#peopleTab'),
  roomKeyInput: document.querySelector('#roomKeyInput'),
  showLargeHomeQrButton: document.querySelector('#showLargeHomeQrButton'),
  showLargeProfileQrButton: document.querySelector('#showLargeProfileQrButton'),
  treeholeForm: document.querySelector('#treeholeForm'),
  treeholeInput: document.querySelector('#treeholeInput'),
  treeholePane: document.querySelector('#treeholePane'),
  treeholePostPolicy: document.querySelector('#treeholePostPolicy'),
  treeholeSendButton: document.querySelector('#treeholeSendButton'),
  treeholeTab: document.querySelector('#treeholeTab'),
  trustAliasInput: document.querySelector('#trustAliasInput'),
  trustButton: document.querySelector('#trustButton'),
  trustForm: document.querySelector('#trustForm'),
  trustQrInput: document.querySelector('#trustQrInput')
}

let state = createDesktopState()
let session = null
let dmSession = null
let homeJoinDetails = null
let largeQrReturnFocus = null
let pendingCommand = null
let shareQrOutputs = {
  homeSvg: '',
  homeUri: '',
  profileSvg: '',
  profileUri: ''
}
const commands = createDesktopCommandRegistry({
  handlers: {
    acceptMessageRequest: (payload) => {
      const { message } = readCommandPayload(payload)
      if (message) return acceptIncomingMessageRequest(message)
    },
    commentTreehole: (payload) => commentTreeholePost(readCommandPayload(payload)),
    ignoreMessageRequest: (payload) => {
      const { message, profileId } = readCommandPayload(payload)
      return ignoreIncomingMessageRequest({ message, profileId })
    },
    joinHome: (payload) => joinRoom(readCommandPayload(payload)),
    joinHomeUri: (payload) => joinHomeQr(readCommandPayload(payload)),
    leaveHome: () => leaveRoom(),
    likeTreehole: (payload) => {
      const { postId } = readCommandPayload(payload)
      return likeTreeholePost(postId)
    },
    postTreehole: (payload) => postTreehole(readCommandPayload(payload)),
    revokeContact: (payload) => {
      const { profileId } = readCommandPayload(payload)
      if (profileId) return revokeLocalContact(profileId)
    },
    sendDmMessage: (payload) => sendMessageRequest(readCommandPayload(payload)),
    sendHomeMessage: (payload) => sendChat(readCommandPayload(payload)),
    sendMessageRequest: () => sendMessageRequest(),
    trustProfileUri: (payload) => trustProfileQr(readCommandPayload(payload))
  }
})
const backendBridge = createDesktopBackendBridge({
  dispatch: (command, payload) => commands.dispatch(command, payload)
})
const backendClient = createDesktopRendererBackendClient({
  localBackend: backendBridge
})
const backendRuntime = createDesktopBackendRuntime({
  emit: (event, payload) => backendBridge.emit(event, payload),
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
})
const dmRuntime = backendRuntime.dm
const homeRuntime = backendRuntime.home
const treeholeRuntime = backendRuntime.treehole

globalThis.keposDesktopUi?.setDirectContactPickerActions({
  openPeople: () => setTab('people'),
  selectContact: (profileId) => selectDirectContact(profileId)
})
globalThis.keposDesktopUi?.setDirectMessageActions({
  acceptMessage: (message) => dispatchCommand('acceptMessageRequest', { message }),
  ignoreMessage: (message) => dispatchCommand('ignoreMessageRequest', { message })
})
globalThis.keposDesktopUi?.setPeopleActions({
  acceptMessageRequest: (message) => dispatchCommand('acceptMessageRequest', { message }),
  ignoreMessageRequest: (profileId) => dispatchCommand('ignoreMessageRequest', { profileId }),
  revokeContact: (profileId) => dispatchCommand('revokeContact', { profileId })
})
globalThis.keposDesktopUi?.setTreeholeActions({
  commentPost: ({ postId, text }) => dispatchCommand('commentTreehole', { postId, text }),
  likePost: (postId) => dispatchCommand('likeTreehole', { postId })
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

els.createButton.addEventListener('click', () => {
  dispatchCommand('joinHome', { createTreehole: true, mode: 'host' })
})

els.lobbyForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('joinHome', {
    createTreehole: false,
    mode: 'peer',
    roomKey: els.roomKeyInput.value.trim()
  })
})

els.leaveButton.addEventListener('click', () => dispatchCommand('leaveHome'))
els.chatTab.addEventListener('click', () => setTab('chat'))
els.dmTab.addEventListener('click', () => setTab('dm'))
els.treeholeTab.addEventListener('click', () => setTab('treehole'))
els.peopleTab.addEventListener('click', () => setTab('people'))
els.showLargeHomeQrButton.addEventListener('click', () => {
  showLargeQr({
    returnFocus: els.showLargeHomeQrButton,
    title: 'Home QR',
    uri: shareQrOutputs.homeUri
  }).catch(showError)
})
els.showLargeProfileQrButton.addEventListener('click', () => {
  showLargeQr({
    returnFocus: els.showLargeProfileQrButton,
    title: 'Profile QR',
    uri: shareQrOutputs.profileUri
  }).catch(showError)
})
els.copyHomeQrButton.addEventListener('click', () => {
  copyQrValue({ notice: 'Home QR copied.', value: shareQrOutputs.homeUri }).catch(showError)
})
els.copyProfileQrButton.addEventListener('click', () => {
  copyQrValue({ notice: 'Profile QR copied.', value: shareQrOutputs.profileUri }).catch(showError)
})
els.largeQrCloseButton.addEventListener('click', hideLargeQr)
els.largeQrDialog.addEventListener('click', (event) => {
  if (event.target === els.largeQrDialog) hideLargeQr()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.largeQrDialog.classList.contains('hidden')) {
    hideLargeQr()
  }
})
els.nickInput.addEventListener('input', () => {
  updateQrOutputs().catch(showError)
})
els.chatInput.addEventListener('input', updateComposerButtons)
els.dmInput.addEventListener('input', updateComposerButtons)
els.treeholeInput.addEventListener('input', updateComposerButtons)
els.roomKeyInput.addEventListener('input', updateActionButtons)
els.homeQrInput.addEventListener('input', updateActionButtons)
els.trustQrInput.addEventListener('input', updateActionButtons)
els.dmRecipientInput.addEventListener('input', () => {
  renderDirectContacts()
  updateComposerButtons()
})

els.chatForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('sendHomeMessage', {
    text: els.chatInput.value.trim()
  })
})

els.dmForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('sendDmMessage', {
    text: els.dmInput.value.trim(),
    toProfileId: els.dmRecipientInput.value.trim()
  })
})

els.treeholeForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('postTreehole', {
    text: els.treeholeInput.value.trim()
  })
})

els.trustForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('trustProfileUri', {
    alias: els.trustAliasInput.value,
    displayName: els.nickInput.value.trim() || 'Desktop',
    uri: els.trustQrInput.value.trim()
  })
})

els.homeQrForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('joinHomeUri', {
    displayName: els.nickInput.value.trim() || 'Desktop',
    uri: els.homeQrInput.value.trim()
  })
})

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

function readCommandPayload(payload) {
  return payload && typeof payload === 'object' ? payload : {}
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

  els.roomKeyInput.value = homeJoin.homeJoinDetails.roomKey
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

  els.homeQrInput.value = ''
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
  els.trustQrInput.value = ''
  els.trustAliasInput.value = ''
  state = { ...state, notice: 'Trusted friend added.' }
  render()
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
  els.largeQrCloseButton.focus()
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
  return els.nickInput.value.trim() || 'Desktop'
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
  els.chatInput.value = ''
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

  els.dmInput.value = ''
  render()
}

async function postTreehole({ text } = {}) {
  if (!text || !state.treeholeCanPost) return

  await treeholeRuntime.post({
    createdAt: Date.now(),
    id: createId(),
    text
  })
  els.treeholeInput.value = ''
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
  document.body.setAttribute('aria-busy', String(isActionPending))
  els.leaveButton.disabled = !inRoom || isActionPending
  els.createButton.disabled = inRoom || isActionPending
  updateActionButtons()
  renderStatus()
  els.treeholeForm.classList.toggle('disabledComposer', !state.treeholeCanPost)
  els.treeholeInput.disabled = !state.treeholeCanPost
  els.treeholePostPolicy.hidden = state.treeholeCanPost
  updateComposerButtons()

  els.chatPane.classList.toggle('hidden', state.activeTab !== 'chat')
  els.dmPane.classList.toggle('hidden', state.activeTab !== 'dm')
  els.treeholePane.classList.toggle('hidden', state.activeTab !== 'treehole')
  els.peoplePane.classList.toggle('hidden', state.activeTab !== 'people')
  els.chatTab.classList.toggle('active', state.activeTab === 'chat')
  els.dmTab.classList.toggle('active', state.activeTab === 'dm')
  els.treeholeTab.classList.toggle('active', state.activeTab === 'treehole')
  els.peopleTab.classList.toggle('active', state.activeTab === 'people')
  updateTabCurrentState()

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

function updateTabCurrentState() {
  for (const [tab, element] of [
    ['chat', els.chatTab],
    ['dm', els.dmTab],
    ['treehole', els.treeholeTab],
    ['people', els.peopleTab]
  ]) {
    if (state.activeTab === tab) {
      element.setAttribute('aria-current', 'page')
    } else {
      element.removeAttribute('aria-current')
    }
  }
}

function updateActionButtons() {
  const inRoom = state.view === 'room'
  const isActionPending = Boolean(pendingCommand)
  els.joinButton.disabled =
    isActionPending || inRoom || !ROOM_KEY_PATTERN.test(els.roomKeyInput.value.trim())
  els.joinHomeQrButton.disabled = isActionPending || inRoom || !els.homeQrInput.value.trim()
  els.trustButton.disabled = isActionPending || !els.trustQrInput.value.trim()
}

function updateComposerButtons() {
  const inRoom = state.view === 'room'
  els.chatSendButton.disabled = !inRoom || !els.chatInput.value.trim()
  els.dmSendButton.disabled =
    !inRoom || !els.dmInput.value.trim() || !els.dmRecipientInput.value.trim()
  els.treeholeSendButton.disabled =
    !inRoom || !state.treeholeCanPost || !els.treeholeInput.value.trim()
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
    selectedProfileId: els.dmRecipientInput.value.trim()
  })
  globalThis.keposDesktopUi?.setDirectContactPicker(picker)
}

function selectDirectContact(profileId = '') {
  if (!profileId) return
  els.dmRecipientInput.value = profileId
  renderDirectContacts()
  updateComposerButtons()
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
    selectedRecipientProfileId: els.dmRecipientInput.value.trim(),
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
    els.dmRecipientInput.value = ''
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
