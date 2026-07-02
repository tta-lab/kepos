/* global BareKit */

import RPC from 'bare-rpc'
import b4a from 'b4a'
import * as fs from 'bare-fs/promises'
import tcp from 'bare-tcp'
import crypto from 'hypercore-crypto'
import Hyperswarm from 'hyperswarm'
import { createDmInvite, createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { acceptDmInviteAsRecipient } from '../src/dm-invite-acceptance.ts'
import { getOrCreateBackendDmEncryptionKeyPair } from '../src/backend-dm-key-storage.ts'
import {
  loadDmMessagesFromFileSystem,
  saveDmMessagesToFileSystem
} from '../src/dm-message-storage.ts'
import { acceptDmThread, createDmThread, revokeDmThread } from '../src/dm-thread.ts'
import { createDmThreadRuntime } from '../src/dm-thread-runtime.js'
import { loadDmThreadsFromFileSystem, saveDmThreadsToFileSystem } from '../src/dm-thread-storage.ts'
import { createMessageRequest, verifyMessageRequest } from '../src/message-request.ts'
import { createDirectRoomTransport } from '../src/direct-room-transport.ts'
import { createP2PRoom } from '../src/p2p-room.ts'
import { createHomeHello, verifyHomeHello } from '../src/home-presence.ts'
import { createTreeholeBase } from '../src/treehole-base.js'
import {
  canGrantTreeholeWriter,
  canShareTreeholeBootstrap,
  createTreeholeSessionOptions
} from '../src/treehole-policy.ts'
import { createTreeholeStoragePath } from '../src/treehole-storage.ts'
import { createTreeholeStatePublisher } from '../src/treehole-state-publisher.ts'
import { mergeTreeholeSnapshots } from '../src/treehole-snapshot-merge.ts'
import { serializeTreeholeState } from '../src/treehole-view.ts'
import {
  RPC_ERROR,
  RPC_DM_ACCEPT,
  RPC_DM_BODY_MESSAGE,
  RPC_DM_BODY_SEND,
  RPC_DM_INVITE,
  RPC_DM_INVITE_SEND,
  RPC_DM_MESSAGE,
  RPC_DM_REVOKE,
  RPC_DM_SEND,
  RPC_DM_THREAD,
  RPC_JOIN,
  RPC_LEAVE,
  RPC_MESSAGE,
  RPC_PEER_COUNT,
  RPC_AVATAR_MEDIA_BYTES,
  RPC_ROOM_DEBUG,
  RPC_SEND,
  RPC_STATUS,
  RPC_TREEHOLE_COMMENT,
  RPC_TREEHOLE_LIKE,
  RPC_TREEHOLE_POLICY,
  RPC_TREEHOLE_POST,
  RPC_TREEHOLE_STATE,
  RPC_TREEHOLE_STATUS
} from '../rpc-commands.mjs'

const rpc = new RPC(BareKit.IPC, (req) => {
  handleRequest(req).catch((error) => {
    sendToUI(RPC_ERROR, { message: error.message })
  })
})

let room = null
let treehole = null
let treeholeOpening = null
let treeholeSwarm = null
let treeholeStatePublisher = null
let roomKey = null
let homeAddress = null
let homeOwnerProfileId = null
let homePolicy = 'trusted_only'
let treeholeStorageBasePath = null
let remoteTreeholeSnapshot = null
let nick = 'anon'
let profileId = null
let identity = null
let dmEncryptionKeyPair = null
let dmRuntime = null
let treeholePolicy = null
let allowHomeDmBodyFallback = false
let localAvatarMediaControl = null
const addedWriters = new Set()
const outgoingMessageRequestsByProfileId = new Map()

async function handleRequest(req) {
  const payload = readPayload(req)

  if (req.command === RPC_JOIN) {
    await joinRoom(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_SEND) {
    sendHomeMessage(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_LEAVE) {
    await leaveRoom()
    sendToUI(RPC_STATUS, { status: 'left' })
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_TREEHOLE_POST) {
    await postTreehole(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_TREEHOLE_COMMENT) {
    await commentTreehole(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_TREEHOLE_LIKE) {
    await likeTreehole(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_DM_SEND) {
    sendMessageRequest(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_DM_ACCEPT) {
    await acceptMessageRequest(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_DM_BODY_SEND) {
    sendDmBody(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_DM_REVOKE) {
    await revokeDmByProfile(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_TREEHOLE_POLICY) {
    await updateTreeholePolicy(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_DM_INVITE_SEND) {
    sendDmInvite(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
  }
}

async function joinRoom(payload) {
  sendToUI(RPC_STATUS, { status: 'joining' })
  await leaveRoom()
  sendToUI(RPC_STATUS, { status: 'preparing' })
  roomKey = payload.roomKey || payload.address
  homeAddress = payload.address || roomKey
  homeOwnerProfileId = payload.ownerProfileId?.trim() || null
  homePolicy = payload.policy || 'trusted_only'
  treeholeStorageBasePath = payload.storageBasePath
  nick = payload.nick?.trim() || 'anon'
  profileId = payload.profileId?.trim() || null
  identity = payload.identity || null
  allowHomeDmBodyFallback = payload.allowHomeDmBodyFallback === true
  localAvatarMediaControl = payload.localAvatarMediaControl || null
  dmEncryptionKeyPair = await getOrCreateBackendDmEncryptionKeyPair({
    basePath: treeholeStorageBasePath,
    createKeyPair: createDmEncryptionKeyPair,
    fs
  })
  treeholePolicy = payload.treeholePolicy || null
  dmRuntime = createDmThreadRuntime({
    identity,
    loadMessages: (thread) => loadBackendDmMessages(thread),
    localProfileId: profileId,
    onMessage: (thread, message, direction) => {
      sendToUI(RPC_DM_BODY_MESSAGE, {
        ...message,
        direction,
        remoteProfileId: thread.remoteProfileId
      })
    },
    saveMessages: (thread, messages) => saveBackendDmMessages(thread, messages)
  })

  room = createP2PRoom({
    createDirectTransport: payload.directTransport
      ? ({ addPeer, roomKey }) =>
          createDirectRoomTransport({
            addPeer,
            ...payload.directTransport,
            roomKey,
            tcpApi: tcp
          })
      : undefined,
    onDiscoveryError: (error) => {
      sendToUI(RPC_ERROR, { message: `Home discovery unavailable: ${error.message}` })
    },
    onControl: (message, peer) => {
      handleControl(message, peer).catch((error) => {
        sendToUI(RPC_ERROR, { message: error.message })
      })
    },
    onDebugState: (debug) => sendToUI(RPC_ROOM_DEBUG, debug),
    onMessage: (message) => sendToUI(RPC_MESSAGE, message),
    onPeer: (peer) => {
      sendHomeHello(peer)
      requestHomeHello(peer)
      resendOutgoingMessageRequests(peer)
    },
    onPeerCount: (count) => sendToUI(RPC_PEER_COUNT, { count })
  })

  sendToUI(RPC_STATUS, { status: 'joining-swarm' })
  await room.join({
    roomKey,
    nick
  })
  sendToUI(RPC_STATUS, { status: 'opening-dm' })
  await openBackendDmThreads()

  if (payload.createTreehole) {
    sendToUI(RPC_STATUS, { status: 'opening-treehole' })
    await openTreehole()
    requestHomeHello()
  } else {
    sendToUI(RPC_TREEHOLE_STATUS, { status: 'waiting-for-bootstrap' })
  }

  sendToUI(RPC_STATUS, {
    address: homeAddress,
    ownerProfileId: homeOwnerProfileId,
    policy: homePolicy,
    status: 'joined'
  })
}

async function leaveRoom() {
  await dmRuntime?.closeAll()
  dmRuntime = null
  await room?.leave()
  room = null
  await closeTreehole()
  roomKey = null
  homeAddress = null
  homeOwnerProfileId = null
  homePolicy = 'trusted_only'
  treeholeStorageBasePath = null
  remoteTreeholeSnapshot = null
  profileId = null
  identity = null
  dmEncryptionKeyPair = null
  treeholePolicy = null
  allowHomeDmBodyFallback = false
  localAvatarMediaControl = null
  addedWriters.clear()
  outgoingMessageRequestsByProfileId.clear()
}

function openTreehole(bootstrapKey = null) {
  if (treehole) {
    return
  }
  if (treeholeOpening) {
    return treeholeOpening
  }

  treeholeOpening = openTreeholeOnce(bootstrapKey).finally(() => {
    treeholeOpening = null
  })
  return treeholeOpening
}

async function openTreeholeOnce(bootstrapKey = null) {
  sendToUI(RPC_STATUS, { status: 'opening-treehole-store' })
  sendToUI(RPC_TREEHOLE_STATUS, { status: 'opening-store' })
  treehole = await createTreeholeBase(
    createTreeholeSessionOptions({
      bootstrapKey,
      identity,
      nick,
      ownerProfileId: homeOwnerProfileId || profileId,
      profileId,
      storage: createTreeholeStoragePath({
        basePath: treeholeStorageBasePath,
        bootstrapKey,
        roomKey
      }),
      treeholePolicy
    })
  )
  sendToUI(RPC_STATUS, { status: 'opening-treehole-replication' })
  sendToUI(RPC_TREEHOLE_STATUS, { status: 'opening-replication' })
  startTreeholeReplication()
  sendToUI(RPC_STATUS, { status: 'opening-treehole-state' })
  sendToUI(RPC_TREEHOLE_STATUS, { status: 'sending-state' })
  sendToUI(RPC_TREEHOLE_STATUS, {
    canInteract: canInteractWithCurrentTreehole(),
    canPost: canPostToCurrentTreehole(),
    status: 'ready',
    key: treehole.key,
    writerKey: treehole.localWriterKey
  })
  startTreeholeStatePublisher()
}

async function closeTreehole() {
  treeholeOpening = null
  remoteTreeholeSnapshot = null
  await treeholeSwarm?.destroy()
  treeholeSwarm = null
  treeholeStatePublisher?.stop()
  treeholeStatePublisher = null
  await treehole?.close()
  treehole = null
}

function startTreeholeReplication() {
  treeholeSwarm = new Hyperswarm()
  treeholeSwarm.on('connection', (socket) => {
    treehole?.replicate(socket)
  })

  const discovery = treeholeSwarm.join(treehole.base.discoveryKey, {
    client: true,
    server: true
  })
  discovery.flushed().catch((error) => {
    sendToUI(RPC_ERROR, { message: `Treehole replication unavailable: ${error.message}` })
  })
}

async function handleControl(message, peer) {
  if (message.type === 'kepos.home.hello.request.v1') {
    sendHomeHello(peer)
    return
  }

  if (message.type === 'kepos.home.hello.v1') {
    if (!verifyHomeHello(message) || message.homeAddress !== homeAddress) {
      return
    }

    sendTreeholeBootstrap(peer, message.profileId)
    sendProfileAvatarMedia(peer)
    return
  }

  if (message.type === 'kepos.avatar.media.bytes.v1') {
    sendToUI(RPC_AVATAR_MEDIA_BYTES, message)
    return
  }

  if (message.type === 'kepos.message.request.v1') {
    if (message.toProfileId === profileId && verifyMessageRequest(message)) {
      sendToUI(RPC_DM_MESSAGE, message)
    }

    return
  }

  if (message.type === 'kepos.dm.invite.v1') {
    if (message.toProfileId === profileId) {
      await acceptDmInvite(message)
      sendToUI(RPC_DM_INVITE, message)
    }

    return
  }

  if (message.type === 'kepos.dm.body.v1') {
    if (!allowHomeDmBodyFallback) {
      return
    }

    dmRuntime?.receiveMessage(message.message)
    return
  }

  if (message.type === 'treehole.bootstrap') {
    homeOwnerProfileId = message.ownerProfileId?.trim() || homeOwnerProfileId
    await openTreehole(message.key)
    sendTreeholeWriter(peer)
    return
  }

  if (message.type === 'treehole.writer') {
    if (!treehole || addedWriters.has(message.key)) {
      return
    }

    if (
      !canGrantTreeholeWriter({
        ownerProfileId: homeOwnerProfileId || profileId,
        policy: treeholePolicy,
        writerProfileId: message.profileId
      })
    ) {
      return
    }

    addedWriters.add(message.key)
    await treehole.addWriter(message.key, { profileId: message.profileId })
    await sendTreeholeState()
  }

  if (message.type === 'treehole.state.v1') {
    remoteTreeholeSnapshot = mergeTreeholeSnapshots(remoteTreeholeSnapshot, message.snapshot)
    sendToUI(RPC_TREEHOLE_STATUS, {
      canInteract: canInteractWithCurrentTreehole(),
      canPost: canPostToCurrentTreehole(),
      status: 'ready'
    })
    sendToUI(RPC_TREEHOLE_STATE, createTreeholeSnapshotForUI())
  }
}

function sendHomeHello(peer = null) {
  if (!room || !identity || !homeAddress) {
    return
  }

  const hello = createHomeHello({
    homeAddress,
    identity
  })

  if (peer) {
    room.sendControl(peer, hello)
    return
  }

  room.broadcastControl(hello)
}

function requestHomeHello(peer = null) {
  if (!room) {
    return
  }

  const request = { type: 'kepos.home.hello.request.v1' }

  if (peer) {
    room.sendControl(peer, request)
    return
  }

  room.broadcastControl(request)
}

function resendOutgoingMessageRequests(peer) {
  if (!room || !peer) {
    return
  }

  for (const request of outgoingMessageRequestsByProfileId.values()) {
    room.sendControl(peer, request)
  }
}

function sendTreeholeBootstrap(peer, remoteProfileId) {
  if (!room || !treehole || !peer || homeOwnerProfileId !== profileId) {
    return
  }

  if (
    !canShareTreeholeBootstrap({
      localProfileId: profileId,
      ownerProfileId: profileId,
      policy: treeholePolicy,
      remoteProfileId
    })
  ) {
    return
  }

  room.sendControl(peer, {
    key: treehole.key,
    ownerProfileId: profileId,
    type: 'treehole.bootstrap'
  })
}

function sendProfileAvatarMedia(peer) {
  if (!room || !peer || !localAvatarMediaControl) {
    return
  }

  room.sendControl(peer, localAvatarMediaControl)
}

function sendTreeholeWriter(peer) {
  if (!room || !treehole || !peer) {
    return
  }

  room.sendControl(peer, {
    type: 'treehole.writer',
    key: treehole.localWriterKey,
    profileId
  })
}

function canPostToCurrentTreehole() {
  const ownerProfileId = homeOwnerProfileId || profileId
  return Boolean(profileId && ownerProfileId && profileId === ownerProfileId)
}

function canInteractWithCurrentTreehole() {
  return canGrantTreeholeWriter({
    ownerProfileId: homeOwnerProfileId || profileId,
    policy: treeholePolicy,
    writerProfileId: profileId
  })
}

function sendHomeMessage(payload) {
  if (!room) {
    throw new Error('Home is not ready')
  }

  const text = cleanRequiredText(payload.text)
  room.send({
    ...payload,
    text
  })
}

async function postTreehole(payload) {
  if (!treehole) {
    throw new Error('Treehole is not ready')
  }

  const text = cleanRequiredText(payload.text)
  await treehole.post({
    id: payload.id,
    text,
    createdAt: payload.createdAt
  })
  await sendTreeholeState()
}

async function commentTreehole(payload) {
  if (!treehole) {
    throw new Error('Treehole is not ready')
  }

  const text = cleanRequiredText(payload.text)
  await treehole.comment({
    id: payload.id,
    postId: payload.postId,
    text,
    createdAt: payload.createdAt
  })
  await sendTreeholeState()
}

async function likeTreehole(payload) {
  if (!treehole) {
    throw new Error('Treehole is not ready')
  }

  await treehole.like({
    action: payload.action || 'add',
    postId: payload.postId,
    createdAt: payload.createdAt
  })
  await sendTreeholeState()
}

function sendMessageRequest(payload) {
  if (!room) {
    throw new Error('Home is not ready')
  }

  if (!identity || !profileId) {
    throw new Error('Profile is not ready')
  }

  const text = cleanRequiredText(payload.text)
  const request = createMessageRequest({
    createdAt: payload.at || Date.now(),
    fromIdentity: identity,
    requestId: payload.id,
    senderEncryptionPublicKey: dmEncryptionKeyPair?.publicKey || payload.senderEncryptionPublicKey,
    text,
    toProfileId: payload.toProfileId
  })
  outgoingMessageRequestsByProfileId.set(request.toProfileId, request)
  room.broadcastControl(request)
}

async function acceptMessageRequest(payload) {
  if (!room) {
    throw new Error('Home is not ready')
  }

  if (!identity || !profileId || !dmEncryptionKeyPair) {
    throw new Error('Profile is not ready')
  }

  const request = payload.request || {}
  if (!canAcceptIncomingMessageRequest(request)) {
    throw new Error('Message request cannot be accepted')
  }

  const acceptedAt = payload.acceptedAt || Date.now()
  const threadId = payload.threadId || createId()
  const channelPublicKey = createKey()
  const channelDiscoveryKey = createKey()
  const thread = acceptDmThread(
    createDmThread({
      channelDiscoveryKey,
      channelPublicKey,
      createdAt: acceptedAt,
      localProfileId: profileId,
      remoteProfileId: request.fromProfileId,
      requestId: request.requestId,
      threadId
    }),
    { acceptedAt }
  )
  const invite = createDmInvite({
    channelDiscoveryKey,
    channelPublicKey,
    createdAt: acceptedAt,
    fromIdentity: identity,
    inviteId: `${threadId}:invite`,
    payload: {
      channelDiscoveryKey,
      channelPublicKey,
      threadId
    },
    recipientEncryptionPublicKey: request.senderEncryptionPublicKey,
    requestId: request.requestId,
    toProfileId: request.fromProfileId
  })

  room.broadcastControl(invite)
  await saveBackendDmThread(thread)
  await dmRuntime?.openThread(thread)
  sendToUI(RPC_DM_THREAD, thread)
}

function canAcceptIncomingMessageRequest(request) {
  if (!verifyMessageRequest(request) || request.toProfileId !== profileId) {
    return false
  }

  return !treeholePolicy?.revokedProfileIds?.includes(request.fromProfileId)
}

async function acceptDmInvite(invite) {
  if (!profileId || !dmEncryptionKeyPair) {
    throw new Error('Profile is not ready')
  }

  const thread = acceptDmInviteAsRecipient({
    acceptedAt: Date.now(),
    canAcceptInvite: canAcceptIncomingDmInvite,
    invite,
    localProfileId: profileId,
    recipientEncryptionKeyPair: dmEncryptionKeyPair
  })

  if (invite?.requestId?.trim()) {
    outgoingMessageRequestsByProfileId.delete(invite.fromProfileId)
  }

  await saveBackendDmThread(thread)
  await dmRuntime?.openThread(thread)
  sendToUI(RPC_DM_THREAD, thread)
}

function canAcceptIncomingDmInvite(invite) {
  const fromProfileId = invite?.fromProfileId?.trim()

  if (!fromProfileId) {
    return false
  }

  if (treeholePolicy?.revokedProfileIds?.includes(fromProfileId)) {
    return false
  }

  if (treeholePolicy?.trustedProfileIds?.includes(fromProfileId)) {
    return true
  }

  return (
    outgoingMessageRequestsByProfileId.get(fromProfileId)?.requestId === invite?.requestId?.trim()
  )
}

function sendDmBody(payload) {
  if (!dmRuntime) {
    throw new Error('DM runtime is not ready')
  }

  const text = cleanRequiredText(payload.text)
  const message = dmRuntime.sendMessage({
    createdAt: payload.createdAt || Date.now(),
    messageId: payload.messageId || createId(),
    text,
    threadId: payload.threadId
  })

  if (allowHomeDmBodyFallback) {
    room?.broadcastControl({
      message,
      type: 'kepos.dm.body.v1'
    })
  }
}

async function revokeDmByProfile(payload) {
  if (!treeholeStorageBasePath) {
    return
  }

  const remoteProfileId = payload.profileId?.trim()
  const revokedAt = payload.revokedAt || Date.now()

  if (!remoteProfileId) {
    throw new Error('Profile id is required')
  }

  const threads = await loadBackendDmThreads()
  const nextThreads = await Promise.all(
    threads.map(async (thread) => {
      if (thread.remoteProfileId !== remoteProfileId) {
        return thread
      }

      await dmRuntime?.closeThread(thread.threadId)
      return revokeDmThread(thread, { revokedAt })
    })
  )

  await saveDmThreadsToFileSystem({
    baseUri: normalizeBasePath(treeholeStorageBasePath),
    fileSystem: createBareFileSystem(),
    threads: nextThreads
  })
}

async function updateTreeholePolicy(payload) {
  treeholePolicy = payload.treeholePolicy || null
  treehole?.updateTreeholePolicy?.(treeholePolicy)
  await sendTreeholeState()
}

function sendDmInvite(payload) {
  if (!room) {
    throw new Error('Home is not ready')
  }

  if (payload?.type !== 'kepos.dm.invite.v1') {
    throw new Error('DM invite is required')
  }

  room.broadcastControl(payload)
}

function cleanRequiredText(text) {
  const cleanText = text?.trim()
  if (!cleanText) {
    throw new Error('Text is required')
  }

  return cleanText
}

async function openBackendDmThreads() {
  const threads = await loadBackendDmThreads()

  await Promise.all(
    threads
      .filter((thread) => thread.state === 'accepted' && thread.revokedAt === undefined)
      .map((thread) => dmRuntime?.openThread(thread))
  )
}

function loadBackendDmThreads() {
  if (!treeholeStorageBasePath) {
    return []
  }

  return loadDmThreadsFromFileSystem({
    baseUri: normalizeBasePath(treeholeStorageBasePath),
    fileSystem: createBareFileSystem()
  })
}

async function saveBackendDmThread(thread) {
  if (!treeholeStorageBasePath) {
    return
  }

  const threads = await loadBackendDmThreads()
  const nextThreads = [
    ...threads.filter((existing) => existing.threadId !== thread.threadId),
    thread
  ]

  await saveDmThreadsToFileSystem({
    baseUri: normalizeBasePath(treeholeStorageBasePath),
    fileSystem: createBareFileSystem(),
    threads: nextThreads
  })
}

function loadBackendDmMessages(thread) {
  if (!treeholeStorageBasePath) {
    return []
  }

  return loadDmMessagesFromFileSystem({
    baseUri: normalizeBasePath(treeholeStorageBasePath),
    fileSystem: createBareFileSystem(),
    threadId: thread.threadId
  })
}

function saveBackendDmMessages(thread, messages) {
  if (!treeholeStorageBasePath) {
    return
  }

  return saveDmMessagesToFileSystem({
    baseUri: normalizeBasePath(treeholeStorageBasePath),
    fileSystem: createBareFileSystem(),
    messages,
    threadId: thread.threadId
  })
}

function createBareFileSystem() {
  return {
    async makeDirectoryAsync(path, options = {}) {
      await fs.mkdir(path, { recursive: Boolean(options.intermediates) })
    },
    async readAsStringAsync(path) {
      return b4a.toString(await fs.readFile(path))
    },
    async writeAsStringAsync(path, value) {
      await fs.writeFile(path, b4a.from(value))
    }
  }
}

function normalizeBasePath(basePath) {
  return basePath.startsWith('file://') ? decodeURI(basePath.slice('file://'.length)) : basePath
}

function createKey() {
  return b4a.toString(crypto.randomBytes(32), 'hex')
}

function createId() {
  return b4a.toString(crypto.randomBytes(16), 'hex')
}

async function sendTreeholeState() {
  if (!treehole) {
    return
  }

  const state = await treehole.getState()
  sendToUI(RPC_TREEHOLE_STATE, createTreeholeSnapshotForUI(serializeTreeholeState(state)))
}

function startTreeholeStatePublisher() {
  treeholeStatePublisher?.stop()
  treeholeStatePublisher = createTreeholeStatePublisher({
    getSnapshot: async () => {
      const state = await treehole.getState()
      return serializeTreeholeState(state)
    },
    onError: (error) => {
      sendToUI(RPC_ERROR, { message: `Treehole state unavailable: ${error.message}` })
    },
    publish: (snapshot) => sendToUI(RPC_TREEHOLE_STATE, createTreeholeSnapshotForUI(snapshot))
  })
}

function createTreeholeSnapshotForUI(localSnapshot = null) {
  return mergeTreeholeSnapshots(remoteTreeholeSnapshot, localSnapshot)
}

function readPayload(req) {
  if (!req.data?.byteLength) {
    return {}
  }

  return JSON.parse(b4a.toString(req.data))
}

function sendToUI(command, payload) {
  const request = rpc.request(command)
  request.send(JSON.stringify(payload))
}
