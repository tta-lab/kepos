/* global document, navigator */

import Hyperswarm from 'hyperswarm'
import os from 'node:os'
import path from 'node:path'
import QRCode from 'qrcode'
import { appendLocalMessage, appendRemoteMessage } from '../src/chat-session.js'
import {
  appendLocalMessageRequest,
  appendLocalSignedDirectMessage,
  appendRemoteMessageRequest,
  appendRemoteSignedDirectMessage,
  createDirectMessageSession,
  dismissDirectMessage
} from '../src/dm-session.js'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { acceptDmInviteAsRecipient } from '../src/dm-invite-acceptance.js'
import { loadDmMessagesFromStorage, saveDmMessagesToStorage } from '../src/dm-message-storage.ts'
import { createDmThreadRuntime } from '../src/dm-thread-runtime.js'
import { loadDmThreadsFromStorage, saveDmThreadsToStorage } from '../src/dm-thread-storage.js'
import { applyMessageRequestToContactBook, createMessageRequest } from '../src/message-request.ts'
import { acceptMessageRequestWithInvite } from '../src/message-request-acceptance.js'
import {
  createTreeholePolicyFromContactBook,
  loadContactBookFromStorage,
  saveContactBookToStorage
} from '../src/contact-book-storage.js'
import { ignoreMessageRequest, listTrustedContacts } from '../src/contact-book.ts'
import {
  createHomeJoinSession,
  createHomeJoinSessionFromAddress,
  createManualHomeJoinSession
} from '../src/home-session.js'
import { createHomeHello, verifyHomeHello } from '../src/home-presence.ts'
import { createP2PRoom } from '../src/p2p-room.js'
import { applyLocalContactRevoke } from '../src/revoke-state.js'
import { applySignedQrUriToContactBook } from '../src/signed-qr-scan.js'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'
import { createTreeholeBase } from '../src/treehole-base.js'
import {
  canGrantTreeholeWriter,
  canShareTreeholeBootstrap,
  createTreeholeSessionOptions
} from '../src/treehole-policy.ts'
import { createTreeholeStatePublisher } from '../src/treehole-state-publisher.js'
import { serializeTreeholeState } from '../src/treehole-view.js'
import { getOrCreateLocalProfile } from '../src/local-profile.js'
import {
  createDesktopState,
  getDesktopHomeStatus,
  getDesktopTreeholeStatus,
  setDesktopRoom,
  setDesktopTab,
  setDesktopTreehole
} from '../src/desktop-state.js'
import { createDesktopCommandRegistry } from '../src/desktop-command-registry.ts'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

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
let dmRuntime = null
let room = null
let treehole = null
let treeholeSwarm = null
let treeholeStatePublisher = null
let homeJoinDetails = null
const addedWriters = new Set()
const commands = createDesktopCommandRegistry({
  handlers: {
    acceptMessageRequest: (payload) => {
      const { message } = readCommandPayload(payload)
      if (message) acceptIncomingMessageRequest(message)
    },
    commentTreehole: (payload) => commentTreeholePost(readCommandPayload(payload)),
    ignoreMessageRequest: (payload) => {
      const { message, profileId } = readCommandPayload(payload)
      return ignoreIncomingMessageRequest({ message, profileId })
    },
    joinHome: (payload) => joinRoom(readCommandPayload(payload)),
    joinHomeUri: () => joinHomeQr(),
    leaveHome: () => leaveRoom(),
    likeTreehole: (payload) => {
      const { postId } = readCommandPayload(payload)
      return likeTreeholePost(postId)
    },
    postTreehole: () => postTreehole(),
    revokeContact: (payload) => {
      const { profileId } = readCommandPayload(payload)
      if (profileId) return revokeLocalContact(profileId)
    },
    sendDmMessage: () => sendMessageRequest(),
    sendHomeMessage: () => sendChat(),
    sendMessageRequest: () => sendMessageRequest(),
    trustProfileUri: () => trustProfileQr()
  }
})

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
  showLargeQr({ title: 'Home QR', uri: els.homeQrOutput.value }).catch(showError)
})
els.showLargeProfileQrButton.addEventListener('click', () => {
  showLargeQr({ title: 'Profile QR', uri: els.profileQrOutput.value }).catch(showError)
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
  dispatchCommand('sendHomeMessage')
})

els.dmForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('sendDmMessage')
})

els.treeholeForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('postTreehole')
})

els.trustForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('trustProfileUri')
})

els.homeQrForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatchCommand('joinHomeUri')
})

updateQrOutputs().catch(showError)
render()

function dispatchCommand(command, payload) {
  commands.dispatch(command, payload).catch(showError)
}

function readCommandPayload(payload) {
  return payload && typeof payload === 'object' ? payload : {}
}

async function joinRoom({ createTreehole, homeAddress = null, mode, roomKey }) {
  await leaveRoom()

  const nick = els.nickInput.value.trim() || 'Desktop'
  const profile = getDesktopProfile(nick)
  const contactBook = loadLocalContactBook(profile.id)
  const treeholePolicy = createTreeholePolicyFromContactBook(contactBook)
  const homeJoin = homeAddress
    ? createHomeJoinSessionFromAddress({
        address: homeAddress.address,
        identity: profile.identity,
        nick,
        ownerProfileId: homeAddress.ownerProfileId,
        policy: homeAddress.policy,
        profileId: profile.id,
        roomKey: homeAddress.roomKey
      })
    : roomKey
      ? createManualHomeJoinSession({
          identity: profile.identity,
          nick,
          profileId: profile.id,
          roomKey
        })
      : createHomeJoinSession({ nick, profile })

  els.roomKeyInput.value = homeJoin.roomKey
  homeJoinDetails = { ...homeJoin, treeholePolicy }
  session = homeJoin.session
  dmSession = createDirectMessageSession({ localProfileId: profile.id, nick })
  dmRuntime = createDmThreadRuntime({
    identity: profile.identity,
    loadMessages: (thread) =>
      loadDmMessagesFromStorage({
        ownerProfileId: profile.id,
        storage: globalThis.localStorage,
        threadId: thread.threadId
      }),
    localProfileId: profile.id,
    onMessage: (thread, message, direction) => {
      dmSession =
        direction === 'out'
          ? appendLocalSignedDirectMessage(dmSession, message, {
              remoteProfileId: thread.remoteProfileId
            })
          : appendRemoteSignedDirectMessage(dmSession, message)
      render()
    },
    saveMessages: (thread, messages) =>
      saveDmMessagesToStorage({
        messages,
        ownerProfileId: profile.id,
        storage: globalThis.localStorage,
        threadId: thread.threadId
      })
  })
  state = setDesktopRoom(state, { mode, nick, peers: 0, roomKey: homeJoin.roomKey })
  state = { ...state, notice: 'Joining home room...' }
  render()

  room = createP2PRoom({
    awaitDiscoveryFlush: false,
    onDiscoveryError: (error) => {
      showError(new Error(`Home discovery unavailable: ${error.message}`))
    },
    onControl: (message, peer) => handleControl(message, peer).catch(showError),
    onMessage: (message) => {
      session = appendRemoteMessage(session, message)
      render()
    },
    onPeer: (peer) => {
      sendHomeHello(peer)
      requestHomeHello(peer)
    },
    onPeerCount: (peers) => {
      state = { ...state, peers }
      render()
    }
  })

  await room.join({ nick, roomKey: homeJoin.roomKey })
  await openLocalDmThreads(profile.id)

  if (createTreehole) {
    await openTreehole()
    requestHomeHello()
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

async function joinHomeQr() {
  const uri = els.homeQrInput.value.trim()
  if (!uri) return

  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const result = applySignedQrUriToContactBook({
    book: loadLocalContactBook(profile.id),
    localProfileId: profile.id,
    uri
  })

  if (result.kind !== 'home') {
    throw new Error('Home QR is required')
  }

  if (!result.canEnter) {
    throw new Error('This trusted-only home is not trusted locally')
  }

  els.homeQrInput.value = ''
  await joinRoom({
    createTreehole: false,
    homeAddress: result,
    mode: 'peer'
  })
}

function trustProfileQr() {
  const uri = els.trustQrInput.value.trim()
  if (!uri) return

  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const result = applySignedQrUriToContactBook({
    alias: els.trustAliasInput.value,
    book: loadLocalContactBook(profile.id),
    localIdentity: profile.identity,
    source: 'profile_qr',
    uri
  })

  if (result.kind !== 'trust') {
    throw new Error('Profile QR is required')
  }

  saveContactBookToStorage({
    book: result.book,
    storage: globalThis.localStorage
  })

  const treeholePolicy = createTreeholePolicyFromContactBook(result.book)
  if (homeJoinDetails?.profileId === profile.id) {
    homeJoinDetails = {
      ...homeJoinDetails,
      treeholePolicy
    }
  }
  els.trustQrInput.value = ''
  els.trustAliasInput.value = ''
  state = { ...state, notice: 'Trusted friend added.' }
  render()
}

async function updateQrOutputs() {
  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
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

async function showLargeQr({ title, uri }) {
  if (!uri) return

  els.largeQrTitle.textContent = title
  els.largeQrCode.innerHTML = await QRCode.toString(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    type: 'svg',
    width: 520
  })
  els.largeQrDialog.classList.remove('hidden')
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
}

function loadLocalContactBook(ownerProfileId) {
  return loadContactBookFromStorage({
    ownerProfileId,
    storage: globalThis.localStorage
  })
}

function getDesktopProfile(displayName) {
  return getOrCreateLocalProfile({
    createDmEncryptionKeyPair,
    displayName
  })
}

async function leaveRoom() {
  await dmRuntime?.closeAll()
  dmRuntime = null
  await room?.leave()
  room = null

  await treeholeSwarm?.destroy()
  treeholeSwarm = null
  treeholeStatePublisher?.stop()
  treeholeStatePublisher = null
  await treehole?.close()
  treehole = null

  addedWriters.clear()
  session = null
  dmSession = null
  homeJoinDetails = null
  state = createDesktopState()
  render()
}

function sendChat() {
  const text = els.chatInput.value.trim()
  if (!room || !session || !text) return

  const message = {
    at: Date.now(),
    id: createId(),
    text
  }

  session = appendLocalMessage(session, text, message)
  room.send(message)
  els.chatInput.value = ''
  render()
}

function sendMessageRequest() {
  const toProfileId = els.dmRecipientInput.value.trim()
  const text = els.dmInput.value.trim()
  if (!room || !dmSession || !toProfileId || !text) return
  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const thread = findLocalDmThread(profile.id, toProfileId)

  if (thread && dmRuntime) {
    dmRuntime.sendMessage({
      createdAt: Date.now(),
      messageId: createId(),
      text,
      threadId: thread.threadId
    })
    els.dmInput.value = ''
    render()
    return
  }

  const request = createMessageRequest({
    createdAt: Date.now(),
    fromIdentity: profile.identity,
    requestId: createId(),
    senderEncryptionPublicKey: profile.dmEncryptionKeyPair.publicKey,
    text,
    toProfileId
  })

  dmSession = appendLocalMessageRequest(dmSession, request)
  room.broadcastControl(request)
  els.dmInput.value = ''
  render()
}

async function postTreehole() {
  const text = els.treeholeInput.value.trim()
  if (!treehole || !text || !state.treeholeCanPost) return

  await treehole.post({
    createdAt: Date.now(),
    id: createId(),
    text
  })
  els.treeholeInput.value = ''
  await renderTreeholeState()
}

async function handleControl(message, peer) {
  if (message.type === 'kepos.home.hello.request.v1') {
    sendHomeHello(peer)
    return
  }

  if (message.type === 'kepos.home.hello.v1') {
    if (!verifyHomeHello(message) || message.homeAddress !== homeJoinDetails?.address) {
      return
    }

    sendTreeholeBootstrap(peer, message.profileId)
    return
  }

  if (message.type === 'kepos.message.request.v1') {
    if (!dmSession || message.toProfileId !== dmSession.localProfileId) return

    const book = loadLocalContactBook(dmSession.localProfileId)
    const nextBook = applyMessageRequestToContactBook(book, {
      alias: shorten(message.fromProfileId),
      request: message,
      source: 'home_room'
    })

    saveContactBookToStorage({
      book: nextBook,
      storage: globalThis.localStorage
    })
    dmSession = appendRemoteMessageRequest(dmSession, message)
    state = { ...state, notice: 'Message request received.' }
    render()
    return
  }

  if (message.type === 'kepos.dm.invite.v1') {
    if (!dmSession || message.toProfileId !== dmSession.localProfileId) return

    const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
    const book = loadLocalContactBook(profile.id)
    const thread = acceptDmInviteAsRecipient({
      acceptedAt: Date.now(),
      contactBook: book,
      invite: message,
      localProfileId: profile.id,
      recipientEncryptionKeyPair: profile.dmEncryptionKeyPair
    })

    saveLocalDmThread(profile.id, thread)
    openLocalDmThread(thread).catch(showError)
    state = { ...state, notice: 'DM invite accepted.' }
    render()
    return
  }

  if (message.type === 'treehole.bootstrap') {
    if (message.ownerProfileId && homeJoinDetails) {
      homeJoinDetails = {
        ...homeJoinDetails,
        ownerProfileId: message.ownerProfileId
      }
    }
    await openTreehole(message.key)
    sendTreeholeWriter(peer)
    return
  }

  if (message.type === 'treehole.writer') {
    if (!treehole || addedWriters.has(message.key)) return

    if (
      !canGrantTreeholeWriter({
        ownerProfileId: homeJoinDetails?.ownerProfileId || session.profileId,
        policy: homeJoinDetails?.treeholePolicy,
        writerProfileId: message.profileId
      })
    ) {
      return
    }

    addedWriters.add(message.key)
    await treehole.addWriter(message.key, { profileId: message.profileId })
    await renderTreeholeState()
  }
}

async function openTreehole(bootstrapKey = null) {
  if (treehole) return

  treehole = await createTreeholeBase(
    createTreeholeSessionOptions({
      bootstrapKey,
      identity: homeJoinDetails?.identity,
      nick: session.nick,
      ownerProfileId: homeJoinDetails?.ownerProfileId || session.profileId,
      profileId: session.profileId,
      storage: treeholeStoragePath(session.roomKey, bootstrapKey),
      treeholePolicy: homeJoinDetails?.treeholePolicy
    })
  )

  treeholeSwarm = new Hyperswarm()
  treeholeSwarm.on('connection', (socket) => {
    treehole?.replicate(socket)
  })

  const discovery = treeholeSwarm.join(treehole.base.discoveryKey, {
    client: true,
    server: true
  })
  discovery.flushed().catch((error) => {
    showError(new Error(`Treehole replication unavailable: ${error.message}`))
  })
  startTreeholeStatePublisher()
  state = setDesktopTreehole(state, {
    canPost: canPostToCurrentTreehole(),
    posts: state.treeholePosts,
    status: state.treeholeStatus
  })
}

function sendHomeHello(peer = null) {
  if (!room || !homeJoinDetails?.identity || !homeJoinDetails?.address) return

  const hello = createHomeHello({
    homeAddress: homeJoinDetails.address,
    identity: homeJoinDetails.identity
  })

  if (peer) {
    room.sendControl(peer, hello)
    return
  }

  room.broadcastControl(hello)
}

function requestHomeHello(peer = null) {
  if (!room) return

  const request = { type: 'kepos.home.hello.request.v1' }

  if (peer) {
    room.sendControl(peer, request)
    return
  }

  room.broadcastControl(request)
}

function sendTreeholeBootstrap(peer, remoteProfileId) {
  if (!room || !treehole || !peer || homeJoinDetails?.ownerProfileId !== session.profileId) {
    return
  }

  if (
    !canShareTreeholeBootstrap({
      localProfileId: session.profileId,
      ownerProfileId: session.profileId,
      policy: homeJoinDetails?.treeholePolicy,
      remoteProfileId
    })
  ) {
    return
  }

  room.sendControl(peer, {
    key: treehole.key,
    ownerProfileId: session.profileId,
    type: 'treehole.bootstrap'
  })
}

function sendTreeholeWriter(peer) {
  if (!room || !treehole || !peer) return

  room.sendControl(peer, {
    key: treehole.localWriterKey,
    profileId: session.profileId,
    type: 'treehole.writer'
  })
}

async function renderTreeholeState() {
  if (!treehole) return

  const treeholeState = await treehole.getState()
  state = setDesktopTreehole(state, {
    canPost: canPostToCurrentTreehole(),
    posts: serializeTreeholeState(treeholeState).posts,
    status: 'ready'
  })
  render()
}

function canPostToCurrentTreehole() {
  if (!session) return true
  const ownerProfileId = homeJoinDetails?.ownerProfileId
  return !ownerProfileId || ownerProfileId === session.profileId
}

function startTreeholeStatePublisher() {
  treeholeStatePublisher?.stop()
  treeholeStatePublisher = createTreeholeStatePublisher({
    getSnapshot: async () => {
      const treeholeState = await treehole.getState()
      return serializeTreeholeState(treeholeState)
    },
    onError: (error) => showError(new Error(`Treehole state unavailable: ${error.message}`)),
    publish: (snapshot) => {
      state = setDesktopTreehole(state, {
        canPost: canPostToCurrentTreehole(),
        posts: snapshot.posts,
        status: 'ready'
      })
      render()
    }
  })
}

function setTab(tab) {
  state = setDesktopTab(state, tab)
  render()
}

function render() {
  const inRoom = state.view === 'room'
  els.leaveButton.disabled = !inRoom
  els.createButton.disabled = inRoom
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

  renderMessages()
  renderDirectMessages()
  renderDirectContacts()
  renderMessageRequests()
  renderContacts()
  renderPosts()
}

function updateActionButtons() {
  const inRoom = state.view === 'room'
  els.joinButton.disabled = inRoom || !ROOM_KEY_PATTERN.test(els.roomKeyInput.value.trim())
  els.joinHomeQrButton.disabled = inRoom || !els.homeQrInput.value.trim()
  els.trustButton.disabled = !els.trustQrInput.value.trim()
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

  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const contacts = listTrustedContacts(loadLocalContactBook(profile.id))
  const selectedProfileId = els.dmRecipientInput.value.trim()

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

  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const contacts = listTrustedContacts(loadLocalContactBook(profile.id))

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

  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const requests = Array.from(loadLocalContactBook(profile.id).pendingRequestsByProfileId.values())

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
  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const threads = loadDmThreadsFromStorage({
    ownerProfileId: profile.id,
    storage: globalThis.localStorage
  })
  const result = applyLocalContactRevoke({
    book: loadLocalContactBook(profile.id),
    profileId,
    threads
  })

  saveContactBookToStorage({
    book: result.book,
    storage: globalThis.localStorage
  })
  saveDmThreadsToStorage({
    ownerProfileId: profile.id,
    storage: globalThis.localStorage,
    threads: result.nextThreads
  })

  await Promise.all(result.revokedThreadIds.map((threadId) => dmRuntime?.closeThread(threadId)))

  if (homeJoinDetails?.profileId === profile.id) {
    homeJoinDetails = {
      ...homeJoinDetails,
      treeholePolicy: result.treeholePolicy
    }
  }

  if (els.dmRecipientInput.value.trim() === profileId) {
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
      : 'Someone wants to start a DM'
  }

  return message.direction === 'out'
    ? `You to ${displayDirectPeer(message.toProfileId)}`
    : `${displayDirectPeer(message.fromProfileId, message.nick)} to you`
}

function displayDirectPeer(profileId, displayName = '') {
  return displayName?.trim() || `Profile ${shorten(profileId)}`
}

function acceptIncomingMessageRequest(message) {
  if (!room || !dmSession) return

  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const result = acceptMessageRequestWithInvite({
    acceptedAt: Date.now(),
    acceptorIdentity: profile.identity,
    book: loadLocalContactBook(profile.id),
    remoteProfileId: message.fromProfileId,
    threadId: createId()
  })

  saveContactBookToStorage({
    book: result.book,
    storage: globalThis.localStorage
  })
  saveLocalDmThread(profile.id, result.thread)
  openLocalDmThread(result.thread).catch(showError)
  room.broadcastControl(result.invite)
  state = { ...state, notice: 'Message request accepted.' }
  render()
}

function ignoreIncomingMessageRequest({ message = null, profileId = '' }) {
  const requestProfileId = profileId || message?.fromProfileId || message?.profileId
  if (!requestProfileId) return

  const profile = getDesktopProfile(els.nickInput.value.trim() || 'Desktop')
  const book = ignoreMessageRequest(loadLocalContactBook(profile.id), {
    profileId: requestProfileId
  })

  saveContactBookToStorage({
    book,
    storage: globalThis.localStorage
  })

  if (dmSession && message?.id) {
    dmSession = dismissDirectMessage(dmSession, { id: message.id })
  }

  state = { ...state, notice: 'Message request ignored.' }
  render()
}

function saveLocalDmThread(ownerProfileId, thread) {
  const threads = loadDmThreadsFromStorage({
    ownerProfileId,
    storage: globalThis.localStorage
  })
  const nextThreads = [
    ...threads.filter((existing) => existing.threadId !== thread.threadId),
    thread
  ]

  saveDmThreadsToStorage({
    ownerProfileId,
    storage: globalThis.localStorage,
    threads: nextThreads
  })
}

function findLocalDmThread(ownerProfileId, remoteProfileId) {
  return loadDmThreadsFromStorage({
    ownerProfileId,
    storage: globalThis.localStorage
  }).find(
    (thread) =>
      thread.remoteProfileId === remoteProfileId &&
      thread.state === 'accepted' &&
      thread.revokedAt === undefined
  )
}

async function openLocalDmThreads(ownerProfileId) {
  const threads = loadDmThreadsFromStorage({
    ownerProfileId,
    storage: globalThis.localStorage
  })

  await Promise.all(threads.map((thread) => openLocalDmThread(thread)))
}

async function openLocalDmThread(thread) {
  if (thread.state !== 'accepted' || thread.revokedAt !== undefined) {
    return
  }

  await dmRuntime?.openThread(thread)
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
  if (!treehole || !text.trim()) return

  await treehole.comment({
    createdAt: Date.now(),
    id: createId(),
    postId,
    text
  })
  await renderTreeholeState()
}

async function likeTreeholePost(postId) {
  if (!treehole) return

  await treehole.like({
    createdAt: Date.now(),
    postId
  })
  await renderTreeholeState()
}

function showError(error) {
  console.error(error)
  state = { ...state, lastError: error.message, notice: 'Something went wrong.' }
  render()
}

function displayPostAuthor(post) {
  return post.authorDisplayName || post.author || shortenProfileId(post.authorProfileId) || 'anon'
}

function shortenProfileId(value) {
  return value ? shorten(value) : ''
}

function treeholeStoragePath(roomKey, bootstrapKey) {
  const suffix = bootstrapKey ? bootstrapKey.slice(0, 16) : 'host'
  return path.join(os.homedir(), `.kepos-treehole-${roomKey.slice(0, 16)}-${suffix}`)
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
