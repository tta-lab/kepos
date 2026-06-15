/* global BareKit */

import RPC from 'bare-rpc'
import b4a from 'b4a'
import Hyperswarm from 'hyperswarm'
import { createP2PRoom } from '../src/p2p-room.js'
import { createTreeholeBase } from '../src/treehole-base.js'
import { createTreeholeStoragePath } from '../src/treehole-storage.js'
import {
  RPC_ERROR,
  RPC_JOIN,
  RPC_LEAVE,
  RPC_MESSAGE,
  RPC_PEER_COUNT,
  RPC_SEND,
  RPC_STATUS,
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
let treeholeSwarm = null
let roomKey = null
let treeholeStorageBasePath = null
let nick = 'anon'
const addedWriters = new Set()

async function handleRequest(req) {
  const payload = readPayload(req)

  if (req.command === RPC_JOIN) {
    await joinRoom(payload)
    req.reply?.(b4a.from(JSON.stringify({ ok: true })))
    return
  }

  if (req.command === RPC_SEND) {
    room?.send(payload)
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
  }
}

async function joinRoom(payload) {
  await leaveRoom()
  roomKey = payload.roomKey
  treeholeStorageBasePath = payload.storageBasePath
  nick = payload.nick?.trim() || 'anon'

  room = createP2PRoom({
    onControl: (message) => {
      handleControl(message).catch((error) => {
        sendToUI(RPC_ERROR, { message: error.message })
      })
    },
    onMessage: (message) => sendToUI(RPC_MESSAGE, message),
    onPeer: () => announceTreehole(),
    onPeerCount: (count) => sendToUI(RPC_PEER_COUNT, { count })
  })

  await room.join({
    roomKey,
    nick
  })

  if (payload.createTreehole) {
    await openTreehole()
    announceTreehole()
  } else {
    sendToUI(RPC_TREEHOLE_STATUS, { status: 'waiting-for-bootstrap' })
  }

  sendToUI(RPC_STATUS, { status: 'joined' })
}

async function leaveRoom() {
  await room?.leave()
  room = null
  await closeTreehole()
  roomKey = null
  treeholeStorageBasePath = null
  addedWriters.clear()
}

async function openTreehole(bootstrapKey = null) {
  if (treehole) {
    return
  }

  treehole = await createTreeholeBase({
    bootstrapKey,
    nick,
    storage: createTreeholeStoragePath({
      basePath: treeholeStorageBasePath,
      bootstrapKey,
      roomKey
    })
  })
  await startTreeholeReplication()
  sendToUI(RPC_TREEHOLE_STATUS, {
    status: 'ready',
    key: treehole.key,
    writerKey: treehole.localWriterKey
  })
  await sendTreeholeState()
}

async function closeTreehole() {
  await treeholeSwarm?.destroy()
  treeholeSwarm = null
  await treehole?.close()
  treehole = null
}

async function startTreeholeReplication() {
  treeholeSwarm = new Hyperswarm()
  treeholeSwarm.on('connection', (socket) => {
    treehole?.replicate(socket)
  })

  const discovery = treeholeSwarm.join(treehole.base.discoveryKey, {
    client: true,
    server: true
  })
  await discovery.flushed()
}

async function handleControl(message) {
  if (message.type === 'treehole.bootstrap') {
    await openTreehole(message.key)
    announceTreehole()
    return
  }

  if (message.type === 'treehole.writer') {
    if (!treehole || addedWriters.has(message.key)) {
      return
    }

    addedWriters.add(message.key)
    await treehole.addWriter(message.key)
    announceTreehole()
    await sendTreeholeState()
  }
}

function announceTreehole() {
  if (!room || !treehole) {
    return
  }

  room.broadcastControl({
    type: 'treehole.bootstrap',
    key: treehole.key
  })
  room.broadcastControl({
    type: 'treehole.writer',
    key: treehole.localWriterKey
  })
}

async function postTreehole(payload) {
  if (!treehole) {
    throw new Error('Treehole is not ready')
  }

  await treehole.post({
    id: payload.id,
    text: payload.text,
    createdAt: payload.createdAt
  })
  announceTreehole()
  await sendTreeholeState()
}

async function sendTreeholeState() {
  if (!treehole) {
    return
  }

  const state = await treehole.getState()
  sendToUI(RPC_TREEHOLE_STATE, { posts: state.posts })
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
