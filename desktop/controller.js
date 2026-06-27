/* global document, navigator */

import QRCode from 'qrcode'
import { applyMessageRequestToContactBook } from '../src/message-request.ts'
import { ignoreMessageRequest, listTrustedContacts } from '../src/contact-book.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'
import { createDesktopBackendRuntime } from '../src/desktop-backend-runtime.js'
import { createDesktopHomeJoinDetails } from '../src/desktop-home-join-service.js'
import { createDesktopProfileContext } from '../src/desktop-profile-context.js'
import { applyDesktopHomeQr, applyDesktopProfileTrustQr } from '../src/desktop-qr-service.js'
import { createDesktopContactRevoke } from '../src/desktop-revoke-service.js'
import {
  createDesktopState,
  getDesktopHomeStatus,
  getDesktopTreeholeStatus,
  setDesktopRoom,
  setDesktopTab,
  setDesktopTreehole
} from '../src/desktop-state.js'
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
  contactList: document.querySelector('#contactList'),
  copyHomeQrButton: document.querySelector('#copyHomeQrButton'),
  copyProfileQrButton: document.querySelector('#copyProfileQrButton'),
  createButton: document.querySelector('#createButton'),
  dmForm: document.querySelector('#dmForm'),
  dmContactList: document.querySelector('#dmContactList'),
  dmInput: document.querySelector('#dmInput'),
  dmList: document.querySelector('#dmList'),
  dmPane: document.querySelector('#dmPane'),
  dmRecipientInput: document.querySelector('#dmRecipientInput'),
  dmSendButton: document.querySelector('#dmSendButton'),
  dmTab: document.querySelector('#dmTab'),
  errorDetailLabel: document.querySelector('#errorDetailLabel'),
  homeQrForm: document.querySelector('#homeQrForm'),
  homeQrCode: document.querySelector('#homeQrCode'),
  homeQrInput: document.querySelector('#homeQrInput'),
  homeQrOutput: document.querySelector('#homeQrOutput'),
  homeStatusLabel: document.querySelector('#homeStatusLabel'),
  joinButton: document.querySelector('#joinButton'),
  joinHomeQrButton: document.querySelector('#joinHomeQrButton'),
  largeQrCloseButton: document.querySelector('#largeQrCloseButton'),
  largeQrCode: document.querySelector('#largeQrCode'),
  largeQrDialog: document.querySelector('#largeQrDialog'),
  largeQrTitle: document.querySelector('#largeQrTitle'),
  leaveButton: document.querySelector('#leaveButton'),
  lobbyForm: document.querySelector('#lobbyForm'),
  messageList: document.querySelector('#messageList'),
  nickInput: document.querySelector('#nickInput'),
  noticeLabel: document.querySelector('#noticeLabel'),
  peerLabel: document.querySelector('#peerLabel'),
  peoplePane: document.querySelector('#peoplePane'),
  peopleTab: document.querySelector('#peopleTab'),
  profileQrCode: document.querySelector('#profileQrCode'),
  profileQrOutput: document.querySelector('#profileQrOutput'),
  profileIdLabel: document.querySelector('#profileIdLabel'),
  requestList: document.querySelector('#requestList'),
  roomKeyInput: document.querySelector('#roomKeyInput'),
  roomKeyLabel: document.querySelector('#roomKeyLabel'),
  showLargeHomeQrButton: document.querySelector('#showLargeHomeQrButton'),
  showLargeProfileQrButton: document.querySelector('#showLargeProfileQrButton'),
  treeholeForm: document.querySelector('#treeholeForm'),
  treeholeInput: document.querySelector('#treeholeInput'),
  treeholeList: document.querySelector('#treeholeList'),
  treeholePane: document.querySelector('#treeholePane'),
  treeholePostPolicy: document.querySelector('#treeholePostPolicy'),
  treeholeSendButton: document.querySelector('#treeholeSendButton'),
  treeholeStatusLabel: document.querySelector('#treeholeStatusLabel'),
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
    uri: els.homeQrOutput.value
  }).catch(showError)
})
els.showLargeProfileQrButton.addEventListener('click', () => {
  showLargeQr({
    returnFocus: els.showLargeProfileQrButton,
    title: 'Profile QR',
    uri: els.profileQrOutput.value
  }).catch(showError)
})
els.copyHomeQrButton.addEventListener('click', () => {
  copyQrValue({ notice: 'Home QR copied.', value: els.homeQrOutput.value }).catch(showError)
})
els.copyProfileQrButton.addEventListener('click', () => {
  copyQrValue({ notice: 'Profile QR copied.', value: els.profileQrOutput.value }).catch(showError)
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
  const profileUri = encodeQrUri(
    createSignedTrustInvitePayload({
      displayName: profile.displayName,
      identity: profile.identity
    })
  )
  const homeUri = encodeQrUri(
    createSignedHomeAddressPayload({
      address: profile.homeRoom.address,
      identity: profile.identity,
      policy: profile.homeRoom.policy,
      roomKey: profile.homeRoom.roomKey
    })
  )

  els.profileQrOutput.value = profileUri
  els.homeQrOutput.value = homeUri
  els.profileQrCode.innerHTML = await QRCode.toString(profileUri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    type: 'svg',
    width: 172
  })
  els.homeQrCode.innerHTML = await QRCode.toString(homeUri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    type: 'svg',
    width: 172
  })
}

async function showLargeQr({ returnFocus, title, uri }) {
  if (!uri) return

  largeQrReturnFocus = returnFocus
  els.largeQrTitle.textContent = title
  els.largeQrCode.innerHTML = await QRCode.toString(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    type: 'svg',
    width: 520
  })
  els.largeQrDialog.classList.remove('hidden')
  els.largeQrCloseButton.focus()
}

async function copyQrValue({ notice, value }) {
  if (!value.trim()) return

  await navigator.clipboard.writeText(value)
  state = { ...state, notice }
  render()
}

function hideLargeQr() {
  els.largeQrDialog.classList.add('hidden')
  els.largeQrCode.replaceChildren()
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
    const currentDmSession = dmRuntime.getSession()
    if (!currentDmSession || message.toProfileId !== currentDmSession.localProfileId) return

    const context = getProfileContext()
    const nextBook = applyMessageRequestToContactBook(context.contactBook, {
      alias: shorten(message.fromProfileId),
      request: message,
      source: 'home_room'
    })

    context.saveContactBook(nextBook)
    dmRuntime.appendIncomingRequest(message)
    state = { ...state, notice: 'Message request received.' }
    render()
    return
  }

  if (message.type === 'kepos.dm.invite.v1') {
    const currentDmSession = dmRuntime.getSession()
    if (!currentDmSession || message.toProfileId !== currentDmSession.localProfileId) return

    const { contactBook, profile } = getProfileContext()
    await dmRuntime.acceptInviteAsRecipient({
      acceptedAt: Date.now(),
      contactBook,
      invite: message,
      recipientEncryptionKeyPair: profile.dmEncryptionKeyPair
    })

    state = { ...state, notice: 'Direct message ready.' }
    render()
    return
  }

  if (message.type === 'treehole.bootstrap') {
    if (message.ownerProfileId && homeJoinDetails) {
      homeJoinDetails = {
        ...homeJoinDetails,
        ownerProfileId: message.ownerProfileId
      }
      configureTreeholeRuntime()
    }
    await openTreehole(message.key)
    sendTreeholeWriter(peer)
    return
  }

  if (message.type === 'treehole.writer') {
    await treeholeRuntime.addWriter(message)
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
  if (!homeRuntime.isJoined() || !peer) return

  const payload = treeholeRuntime.createBootstrapControl(remoteProfileId)
  if (payload) homeRuntime.sendControl(peer, payload)
}

function sendTreeholeWriter(peer) {
  if (!homeRuntime.isJoined() || !peer) return

  const payload = treeholeRuntime.createWriterControl()
  if (payload) homeRuntime.sendControl(peer, payload)
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
  els.homeStatusLabel.textContent = getDesktopHomeStatus(state)
  els.roomKeyLabel.textContent = inRoom ? shorten(state.roomKey) : 'not joined'
  els.profileIdLabel.textContent = session?.profileId ? shorten(session.profileId) : 'not ready'
  els.peerLabel.textContent = String(state.peers)
  els.noticeLabel.textContent = state.notice
  els.errorDetailLabel.textContent = state.lastError || 'none'
  els.treeholeStatusLabel.textContent = getDesktopTreeholeStatus(state)
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
  renderMessageRequests()
  renderContacts()
  renderPosts()
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
  const messages = session?.messages || []
  els.messageList.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement('li')
      item.className = `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`
      item.innerHTML = `
        <p class="meta">${escapeHtml(message.nick)}</p>
        <p>${escapeHtml(message.text)}</p>
      `
      return item
    })
  )
}

function renderDirectMessages() {
  const messages = dmSession?.messages || []
  els.dmList.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement('li')
      item.className = `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`
      item.append(renderDirectMessageContent(message))
      return item
    })
  )
}

function renderDirectContacts() {
  if (!els.dmContactList) return

  const { contactBook } = getProfileContext()
  const contacts = listTrustedContacts(contactBook)
  const selectedProfileId = els.dmRecipientInput.value.trim()

  if (!contacts.length) {
    const empty = document.createElement('div')
    empty.className = 'contactEmpty'
    const title = document.createElement('p')
    title.className = 'contactEmptyTitle'
    title.textContent = 'No trusted friends yet'
    const copy = document.createElement('p')
    copy.className = 'contactEmptyCopy'
    copy.textContent = 'Add a trusted friend before starting a direct message.'
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Add trusted friend'
    button.addEventListener('click', () => setTab('people'))
    empty.append(title, copy, button)
    els.dmContactList.replaceChildren(empty)
    return
  }

  els.dmContactList.replaceChildren(
    ...contacts.map((contact) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'contactButton'
      button.classList.toggle('activeContactButton', contact.profileId === selectedProfileId)
      button.textContent = contact.alias
      button.addEventListener('click', () => {
        els.dmRecipientInput.value = contact.profileId
        renderDirectContacts()
        updateComposerButtons()
      })
      return button
    })
  )
}

function renderContacts() {
  if (!els.contactList) return

  const { contactBook } = getProfileContext()
  const contacts = listTrustedContacts(contactBook)

  if (contacts.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted smallText'
    empty.textContent = 'No trusted friends yet'
    els.contactList.replaceChildren(empty)
    return
  }

  els.contactList.replaceChildren(
    ...contacts.map((contact) => {
      const row = document.createElement('div')
      const label = document.createElement('div')
      const alias = document.createElement('p')
      const profileId = document.createElement('p')
      const meta = document.createElement('div')
      const status = document.createElement('span')
      const source = document.createElement('span')
      const trustedAt = document.createElement('span')
      const button = document.createElement('button')

      row.className = 'managedContact'
      alias.textContent = contact.alias
      profileId.className = 'mono muted smallText'
      profileId.textContent = shorten(contact.profileId)
      meta.className = 'trustMeta'
      status.textContent = 'Trusted'
      source.textContent = `From ${formatTrustSource(contact.source)}`
      trustedAt.textContent = `Trusted ${formatTrustTime(contact.trustedAt)}`
      meta.append(status, source, trustedAt)
      label.append(alias, profileId, meta)
      button.type = 'button'
      button.className = 'smallButton dangerButton'
      button.textContent = 'Revoke'
      button.addEventListener('click', () =>
        dispatchCommand('revokeContact', { profileId: contact.profileId })
      )
      row.append(label, button)
      return row
    })
  )
}

function formatTrustSource(source) {
  if (source === 'profile_qr' || source === 'person_qr') return 'Profile QR'
  if (source === 'home_room') return 'Home room'
  if (source === 'message_request') return 'Message request'
  return 'local trust'
}

function formatTrustTime(trustedAt) {
  if (!Number.isFinite(trustedAt)) return 'recently'
  return new Date(trustedAt).toLocaleDateString()
}

function renderMessageRequests() {
  if (!els.requestList) return

  const { contactBook } = getProfileContext()
  const requests = Array.from(contactBook.pendingRequestsByProfileId.values())

  if (requests.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted smallText'
    empty.textContent = 'No message requests'
    els.requestList.replaceChildren(empty)
    return
  }

  els.requestList.replaceChildren(
    ...requests.map((request) => {
      const row = document.createElement('div')
      const label = document.createElement('div')
      const title = document.createElement('p')
      const profileId = document.createElement('p')
      const preview = document.createElement('p')
      const actions = document.createElement('div')
      const ignoreButton = document.createElement('button')
      const button = document.createElement('button')

      row.className = 'managedContact'
      title.textContent = formatMessageRequestTitle(request)
      profileId.className = 'mono muted smallText'
      profileId.textContent = request.alias || shorten(request.profileId)
      preview.className = 'muted smallText'
      preview.textContent = formatRequestPreview(request.text)
      label.append(title, profileId, preview)
      actions.className = 'inlineActions'
      ignoreButton.type = 'button'
      ignoreButton.className = 'smallButton'
      ignoreButton.textContent = 'Ignore'
      ignoreButton.addEventListener('click', () =>
        dispatchCommand('ignoreMessageRequest', { profileId: request.profileId })
      )
      button.type = 'button'
      button.className = 'smallButton'
      button.textContent = 'Accept'
      button.addEventListener('click', () =>
        dispatchCommand('acceptMessageRequest', {
          message: {
            fromProfileId: request.profileId,
            nick: request.alias || '',
            type: 'kepos.message.request.v1'
          }
        })
      )
      actions.append(ignoreButton, button)
      row.append(label, actions)
      return row
    })
  )
}

function formatRequestPreview(text) {
  return text?.trim() || 'No message yet'
}

function formatMessageRequestTitle(request) {
  const name = request?.alias?.trim() || 'Someone'
  return `${name} wants to start a DM.`
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

function renderDirectMessageContent(message) {
  const fragment = document.createDocumentFragment()
  const meta = document.createElement('p')
  const text = document.createElement('p')

  meta.className = 'meta'
  meta.textContent = displayDirectMessageMeta(message)
  text.textContent = message.text
  fragment.append(meta, text)

  if (message.type === 'kepos.message.request.v1' && message.direction === 'in') {
    const actions = document.createElement('div')
    const ignoreButton = document.createElement('button')
    const button = document.createElement('button')
    actions.className = 'inlineActions'
    ignoreButton.type = 'button'
    ignoreButton.className = 'smallButton'
    ignoreButton.textContent = 'Ignore'
    ignoreButton.addEventListener('click', () => {
      dispatchCommand('ignoreMessageRequest', { message })
    })
    button.type = 'button'
    button.className = 'smallButton'
    button.textContent = 'Accept'
    button.addEventListener('click', () => {
      dispatchCommand('acceptMessageRequest', { message })
    })
    actions.append(ignoreButton, button)
    fragment.append(actions)
  }

  return fragment
}

function displayDirectMessageMeta(message) {
  if (message.type === 'kepos.message.request.v1') {
    return message.direction === 'out'
      ? 'You asked someone to start a DM'
      : formatMessageRequestTitle(message)
  }

  return message.direction === 'out'
    ? `You to ${displayDirectPeer(message.toProfileId)}`
    : `${displayDirectPeer(message.fromProfileId, message.nick)} to you`
}

function displayDirectPeer(profileId, displayName = '') {
  return displayName?.trim() || `Profile ${shorten(profileId)}`
}

async function acceptIncomingMessageRequest(message) {
  if (!homeRuntime.isJoined() || !dmSession) return

  const context = getProfileContext()
  const result = await dmRuntime.acceptMessageRequest({
    acceptedAt: Date.now(),
    book: context.contactBook,
    remoteProfileId: message.fromProfileId,
    threadId: createId()
  })

  if (!result) return

  context.saveContactBook(result.book)
  homeRuntime.broadcastControl(result.invite)
  state = { ...state, notice: 'Message request accepted.' }
  render()
}

function ignoreIncomingMessageRequest({ message = null, profileId = '' }) {
  const requestProfileId = profileId || message?.fromProfileId || message?.profileId
  if (!requestProfileId) return

  const context = getProfileContext()
  const book = ignoreMessageRequest(context.contactBook, {
    profileId: requestProfileId
  })

  context.saveContactBook(book)

  if (dmSession && message?.id) {
    dmRuntime.dismissMessage({ id: message.id })
  }

  state = { ...state, notice: 'Message request ignored.' }
  render()
}

function renderPosts() {
  els.treeholeList.replaceChildren(
    ...state.treeholePosts.map((post) => {
      const item = document.createElement('li')
      item.className = 'item post'
      item.innerHTML = `
        <div class="postHead">
          <p class="meta">${escapeHtml(displayPostAuthor(post))}</p>
          <p class="time">${formatTime(post.createdAt)}</p>
        </div>
        <p>${escapeHtml(post.text)}</p>
        <p class="stats">${post.commentCount || 0} comments · ${post.likeCount || 0} likes</p>
      `
      item.append(renderPostComments(post))
      item.append(renderPostActions(post))
      return item
    })
  )
}

function renderPostComments(post) {
  const comments = document.createElement('div')
  comments.className = 'comments'

  comments.replaceChildren(
    ...(post.comments || []).map((comment) => {
      const item = document.createElement('div')
      item.className = 'comment'
      item.innerHTML = `
        <p class="meta">${escapeHtml(displayPostAuthor(comment))}</p>
        <p>${escapeHtml(comment.text)}</p>
      `
      return item
    })
  )

  return comments
}

function renderPostActions(post) {
  const actions = document.createElement('div')
  actions.className = 'postActions'

  const likeButton = document.createElement('button')
  likeButton.type = 'button'
  likeButton.className = 'smallButton'
  likeButton.textContent = 'Like'
  likeButton.addEventListener('click', () => dispatchCommand('likeTreehole', { postId: post.id }))

  const form = document.createElement('form')
  form.className = 'commentForm'
  const input = document.createElement('input')
  input.placeholder = 'Write a comment'
  input.className = 'commentInput'
  const submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'smallButton'
  submit.textContent = 'Comment'
  submit.disabled = true
  input.addEventListener('input', () => {
    submit.disabled = !input.value.trim()
  })
  form.append(input, submit)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!input.value.trim()) return
    dispatchCommand('commentTreehole', { postId: post.id, text: input.value })
    input.value = ''
    submit.disabled = true
  })

  actions.append(likeButton, form)
  return actions
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

function displayPostAuthor(post) {
  return post.authorDisplayName || post.author || shortenProfileId(post.authorProfileId) || 'anon'
}

function shortenProfileId(value) {
  return value ? shorten(value) : ''
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

globalThis.Pear?.updates?.(() => globalThis.Pear.reload())
globalThis.Pear?.teardown?.(() => leaveRoom())
