import assert from 'node:assert/strict'
import test from 'node:test'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { createMessageRequest } from '../src/message-request.ts'
import {
  createProfileFriendRequestRuntime,
  createQueuedProfileFriendRequestTransport,
  deriveProfileFriendRequestTopic,
  formatProfileFriendRequestDeliveryState,
  sendProfileFriendRequest
} from '../src/profile-friend-request-transport.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

test('profile friend request transport validates profile-to-profile request shape', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })
  const sent = []

  const result = await sendProfileFriendRequest({
    localProfile: {
      identity: from,
      profileId: from.publicKey
    },
    request,
    targetProfileId: to.publicKey,
    transport: {
      send(nextRequest) {
        sent.push(nextRequest)
        return { state: 'sent' }
      }
    }
  })

  assert.equal(result.state, 'sent')
  assert.deepEqual(sent, [request])
})

test('profile friend request transport defaults to queued without a connected P2P route', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  const result = await sendProfileFriendRequest({
    localProfile: {
      identity: from,
      profileId: from.publicKey
    },
    request,
    targetProfileId: to.publicKey,
    transport: createQueuedProfileFriendRequestTransport()
  })

  assert.equal(result.state, 'queued')
  assert.equal(formatProfileFriendRequestDeliveryState(result.state), 'Request pending')
})

test('profile friend request transport rejects Home-style mismatched targets', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const other = createSigningKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  await assert.rejects(
    sendProfileFriendRequest({
      localProfile: {
        identity: from,
        profileId: from.publicKey
      },
      request,
      targetProfileId: other.publicKey
    }),
    /target mismatch/
  )
})

test('profile friend request runtime listens on the local profile request topic', async () => {
  const joins = []
  const local = createSigningKeyPair()
  const runtime = createProfileFriendRequestRuntime({
    createSwarm: () => new FakeSwarm(joins),
    localProfileId: local.publicKey
  })

  await runtime.open()

  assert.equal(joins.length, 1)
  assert.deepEqual(joins[0].topic, deriveProfileFriendRequestTopic(local.publicKey))
  assert.deepEqual(joins[0].options, { client: true, server: true })
})

test('profile friend request runtime sends through a target profile topic', async () => {
  const swarms = []
  const delivery = []
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const request = createRequest({ from, to })
  const runtime = createProfileFriendRequestRuntime({
    createSwarm: () => {
      const swarm = new FakeSwarm()
      swarms.push(swarm)
      return swarm
    },
    localProfileId: from.publicKey,
    onDeliveryState: (state) => delivery.push(state)
  })

  const result = await runtime.send(request)
  const socket = new FakeSocket()
  swarms[0].connect(socket)

  assert.equal(result.state, 'searching')
  assert.deepEqual(swarms[0].joins[0].topic, deriveProfileFriendRequestTopic(to.publicKey))
  assert.deepEqual(swarms[0].joins[0].options, { client: true, server: false })
  assert.deepEqual(JSON.parse(socket.writes[0]), request)
  assert.deepEqual(delivery, [
    {
      requestId: request.requestId,
      state: 'searching',
      toProfileId: to.publicKey
    },
    {
      requestId: request.requestId,
      state: 'sent',
      toProfileId: to.publicKey
    }
  ])
})

test('profile friend request runtime receives verified requests once', async () => {
  const received = []
  const local = createSigningKeyPair()
  const remote = createSigningKeyPair()
  const request = createRequest({ from: remote, to: local })
  const swarm = new FakeSwarm()
  const runtime = createProfileFriendRequestRuntime({
    createSwarm: () => swarm,
    localProfileId: local.publicKey,
    onRequest: (nextRequest) => received.push(nextRequest)
  })
  const socket = new FakeSocket()

  await runtime.open()
  swarm.connect(socket)
  socket.emitData('not json\n')
  socket.emitData(`${JSON.stringify({ ...request, text: 'tampered' })}\n`)
  socket.emitData(`${JSON.stringify(request)}\n`)
  socket.emitData(`${JSON.stringify(request)}\n`)

  assert.deepEqual(received, [request])
})

test('profile friend request runtime closes inbox and send swarms', async () => {
  const swarms = []
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const runtime = createProfileFriendRequestRuntime({
    createSwarm: () => {
      const swarm = new FakeSwarm()
      swarms.push(swarm)
      return swarm
    },
    localProfileId: from.publicKey
  })

  await runtime.open()
  await runtime.send(createRequest({ from, to }))
  await runtime.close()

  assert.deepEqual(
    swarms.map((swarm) => swarm.destroyed),
    [true, true]
  )
})

function createRequest({ from, to, requestId = 'request-1' }) {
  return createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId,
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })
}

class FakeSwarm {
  constructor(joins = []) {
    this.destroyed = false
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

  connect(socket) {
    this.handlers.get('connection')?.(socket)
  }

  destroy() {
    this.destroyed = true
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

  destroy() {
    this.destroyed = true
  }
}
