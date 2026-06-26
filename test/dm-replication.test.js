import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createDmReplicationChannel, deriveDmTopic } from '../src/dm-replication.js'
import { createSignedDmMessage } from '../src/dm-message.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

const CHANNEL_DISCOVERY_KEY = 'a'.repeat(64)
const CHANNEL_PUBLIC_KEY = 'b'.repeat(64)
const LOCAL_PROFILE_ID = '1'.repeat(64)
const REMOTE_PROFILE_ID = '2'.repeat(64)

describe('DM replication channel', () => {
  test('joins a dedicated topic derived from the DM channel discovery key', async () => {
    const joins = []
    const channel = createDmReplicationChannel({
      createSwarm: () => new FakeSwarm(joins),
      identity: createSigningKeyPair(),
      localProfileId: LOCAL_PROFILE_ID
    })

    await channel.joinThread(createThread())

    assert.equal(joins.length, 1)
    assert.equal(joins[0].topic.byteLength, 32)
    assert.deepEqual(joins[0].topic, deriveDmTopic(CHANNEL_DISCOVERY_KEY))
    assert.deepEqual(joins[0].options, { client: true, server: true })
  })

  test('sends signed DM messages only to peers on the DM channel', async () => {
    const socket = new FakeSocket()
    const identity = createSigningKeyPair()
    const channel = createDmReplicationChannel({
      createSwarm: () => new FakeSwarm(),
      identity,
      localProfileId: identity.publicKey
    })

    await channel.joinThread(createThread({ localProfileId: identity.publicKey }))
    channel.addPeer(socket)
    const message = channel.sendMessage({
      createdAt: 1000,
      messageId: 'message-1',
      text: 'hello',
      threadId: 'thread-1'
    })

    assert.equal(socket.writes.length, 1)
    assert.deepEqual(JSON.parse(socket.writes[0]), message)
    assert.equal(message.type, 'kepos.dm.message.v1')
    assert.equal(message.fromProfileId, identity.publicKey)
  })

  test('emits verified incoming messages once for the joined thread', async () => {
    const messages = []
    const sender = createSigningKeyPair()
    const channel = createDmReplicationChannel({
      createSwarm: () => new FakeSwarm(),
      identity: createSigningKeyPair(),
      localProfileId: LOCAL_PROFILE_ID,
      onMessage: (message) => messages.push(message)
    })
    const socket = new FakeSocket()
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'message-1',
      text: 'hello',
      threadId: 'thread-1'
    })

    await channel.joinThread(createThread({ remoteProfileId: sender.publicKey }))
    channel.addPeer(socket)
    socket.emitData(`${JSON.stringify(message)}\n`)
    socket.emitData(`${JSON.stringify(message)}\n`)

    assert.deepEqual(messages, [message])
  })

  test('ignores tampered or wrong-thread messages without closing the channel', async () => {
    const messages = []
    const sender = createSigningKeyPair()
    const channel = createDmReplicationChannel({
      createSwarm: () => new FakeSwarm(),
      identity: createSigningKeyPair(),
      localProfileId: LOCAL_PROFILE_ID,
      onMessage: (message) => messages.push(message)
    })
    const socket = new FakeSocket()
    const tampered = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'message-1',
      text: 'hello',
      threadId: 'thread-1'
    })
    const valid = createSignedDmMessage({
      createdAt: 1100,
      identity: sender,
      messageId: 'message-2',
      text: 'after bad frame',
      threadId: 'thread-1'
    })

    await channel.joinThread(createThread({ remoteProfileId: sender.publicKey }))
    channel.addPeer(socket)
    socket.emitData(`${JSON.stringify({ ...tampered, text: 'edited' })}\n`)
    socket.emitData(
      `${JSON.stringify({
        ...createSignedDmMessage({
          createdAt: 1200,
          identity: sender,
          messageId: 'message-3',
          text: 'wrong thread',
          threadId: 'other-thread'
        })
      })}\n`
    )
    socket.emitData(`${JSON.stringify(valid)}\n`)

    assert.deepEqual(messages, [valid])
  })

  test('ignores valid messages that are not from the remote thread profile', async () => {
    const messages = []
    const thirdParty = createSigningKeyPair()
    const channel = createDmReplicationChannel({
      createSwarm: () => new FakeSwarm(),
      identity: createSigningKeyPair(),
      localProfileId: LOCAL_PROFILE_ID,
      onMessage: (message) => messages.push(message)
    })
    const socket = new FakeSocket()
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity: thirdParty,
      messageId: 'message-1',
      text: 'valid but not this peer',
      threadId: 'thread-1'
    })

    await channel.joinThread(createThread())
    channel.addPeer(socket)
    socket.emitData(`${JSON.stringify(message)}\n`)

    assert.deepEqual(messages, [])
  })

  test('broadcastMessages replays verified stored messages for the joined thread', async () => {
    const socket = new FakeSocket()
    const identity = createSigningKeyPair()
    const channel = createDmReplicationChannel({
      createSwarm: () => new FakeSwarm(),
      identity,
      localProfileId: identity.publicKey
    })
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity,
      messageId: 'message-1',
      text: 'stored',
      threadId: 'thread-1'
    })

    await channel.joinThread(createThread({ localProfileId: identity.publicKey }))
    channel.addPeer(socket)
    channel.broadcastMessages([message])

    assert.deepEqual(
      socket.writes.map((frame) => JSON.parse(frame)),
      [message]
    )
  })
})

function createThread(overrides = {}) {
  return {
    acceptedAt: 1000,
    channelDiscoveryKey: CHANNEL_DISCOVERY_KEY,
    channelPublicKey: CHANNEL_PUBLIC_KEY,
    createdAt: 1000,
    localProfileId: LOCAL_PROFILE_ID,
    remoteProfileId: REMOTE_PROFILE_ID,
    state: 'accepted',
    threadId: 'thread-1',
    ...overrides
  }
}

class FakeSwarm {
  constructor(joins = []) {
    this.handlers = new Map()
    this.joins = joins
  }

  on(event, handler) {
    this.handlers.set(event, handler)
  }

  join(topic, options) {
    this.joins.push({ options, topic })
    return {
      flushed: () => Promise.resolve()
    }
  }

  destroy() {
    return Promise.resolve()
  }
}

class FakeSocket {
  constructor() {
    this.destroyed = false
    this.handlers = new Map()
    this.writes = []
  }

  on(event, handler) {
    this.handlers.set(event, handler)
  }

  write(frame) {
    this.writes.push(frame)
  }

  emitData(data) {
    this.handlers.get('data')?.(Buffer.from(data))
  }
}
