import assert from 'node:assert/strict'
import test from 'node:test'
import { createDmEncryptionKeyPair, createDmInvite } from '../src/dm-invite.ts'
import { createMessageRequest } from '../src/message-request.ts'
import {
  createProfileHomeDescriptorFrame,
  createProfileFriendRequestRuntime,
  createQueuedProfileFriendRequestTransport,
  deriveProfileFriendRequestTopic,
  sendProfileFriendRequest,
  verifyProfileHomeDescriptorFrame
} from '../src/profile-friend-request-transport.ts'
import {
  formatProfileFriendAcceptanceDeliveryNotice,
  formatProfileFriendRequestDeliveryState
} from '../src/profile-friend-request-delivery.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import { createSignedHomeAddressPayload } from '../src/signed-qr-payload.ts'

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

test('profile friend request delivery state copy stays transport-specific', () => {
  assert.equal(formatProfileFriendRequestDeliveryState('queued'), 'Request pending')
  assert.equal(formatProfileFriendRequestDeliveryState('searching'), 'Looking for profile')
  assert.equal(formatProfileFriendRequestDeliveryState('sent'), 'Request sent')
  assert.equal(formatProfileFriendRequestDeliveryState('delivered'), 'Request delivered')
  assert.equal(formatProfileFriendRequestDeliveryState('accepted'), 'Request accepted')
  assert.equal(formatProfileFriendRequestDeliveryState('failed'), 'Request failed')
  assert.equal(formatProfileFriendRequestDeliveryState('unknown'), 'Request pending')
  assert.equal(formatProfileFriendRequestDeliveryState(null), 'Request pending')
})

test('profile friend request acceptance copy is honest about invite delivery', () => {
  assert.equal(
    formatProfileFriendAcceptanceDeliveryNotice('queued'),
    'Friend request accepted locally. Waiting for profile delivery.'
  )
  assert.equal(
    formatProfileFriendAcceptanceDeliveryNotice('searching'),
    'Friend request accepted locally. Waiting for profile delivery.'
  )
  assert.equal(
    formatProfileFriendAcceptanceDeliveryNotice('sent'),
    'Friend request accepted. Invite sent.'
  )
  assert.equal(
    formatProfileFriendAcceptanceDeliveryNotice('delivered'),
    'Friend request accepted. Invite delivered.'
  )
  assert.equal(
    formatProfileFriendAcceptanceDeliveryNotice('failed'),
    'Friend request accepted locally. Invite delivery failed.'
  )
  assert.equal(formatProfileFriendAcceptanceDeliveryNotice(null), 'Friend request accepted.')
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

test('profile friend request runtime sends without opening the local inbox', async () => {
  const swarms = []
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const request = createRequest({ from, to })
  const runtime = createProfileFriendRequestRuntime({
    createSwarm: () => {
      const swarm = new FakeSwarm()
      swarms.push(swarm)
      return swarm
    },
    localProfileId: from.publicKey
  })

  const result = await runtime.send(request)

  assert.equal(result.state, 'searching')
  assert.equal(swarms.length, 1)
  assert.deepEqual(swarms[0].joins, [
    {
      options: { client: true, server: false },
      topic: deriveProfileFriendRequestTopic(to.publicKey)
    }
  ])
})

test('profile friend request runtime marks sent frames delivered after receiver ack', async () => {
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

  await runtime.send(request)
  const socket = new FakeSocket()
  swarms[0].connect(socket)
  socket.emitData(
    `${JSON.stringify({
      fromProfileId: to.publicKey,
      requestId: request.requestId,
      toProfileId: from.publicKey,
      type: 'kepos.profile.request.ack.v1'
    })}\n`
  )
  socket.emitData(
    `${JSON.stringify({
      fromProfileId: to.publicKey,
      requestId: request.requestId,
      toProfileId: from.publicKey,
      type: 'kepos.profile.request.ack.v1'
    })}\n`
  )

  assert.deepEqual(delivery.at(-1), {
    requestId: request.requestId,
    state: 'delivered',
    toProfileId: to.publicKey
  })
  assert.equal(delivery.filter((entry) => entry.state === 'delivered').length, 1)
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
  assert.deepEqual(JSON.parse(socket.writes[0]), {
    fromProfileId: local.publicKey,
    requestId: request.requestId,
    toProfileId: remote.publicKey,
    type: 'kepos.profile.request.ack.v1'
  })
})

test('profile friend request runtime receives verified DM invites once', async () => {
  const received = []
  const local = createSigningKeyPair()
  const remote = createSigningKeyPair()
  const invite = createInvite({ from: remote, to: local })
  const swarm = new FakeSwarm()
  const runtime = createProfileFriendRequestRuntime({
    createSwarm: () => swarm,
    localProfileId: local.publicKey,
    onInvite: (nextInvite) => received.push(nextInvite)
  })
  const socket = new FakeSocket()

  await runtime.open()
  swarm.connect(socket)
  socket.emitData(`${JSON.stringify({ ...invite, channelPublicKey: '0'.repeat(64) })}\n`)
  socket.emitData(`${JSON.stringify(invite)}\n`)
  socket.emitData(`${JSON.stringify(invite)}\n`)

  assert.deepEqual(received, [JSON.parse(JSON.stringify(invite))])
})

test('profile friend request runtime receives verified Home descriptors once', async () => {
  const received = []
  const local = createSigningKeyPair()
  const remote = createSigningKeyPair()
  const frame = createHomeDescriptorFrame({ from: remote, to: local })
  const swarm = new FakeSwarm()
  const runtime = createProfileFriendRequestRuntime({
    createSwarm: () => swarm,
    localProfileId: local.publicKey,
    onHomeDescriptor: (nextFrame) => received.push(nextFrame)
  })
  const socket = new FakeSocket()

  await runtime.open()
  swarm.connect(socket)
  socket.emitData(
    `${JSON.stringify({
      ...frame,
      descriptor: { ...frame.descriptor, roomKey: '0'.repeat(64) }
    })}\n`
  )
  socket.emitData(`${JSON.stringify(frame)}\n`)
  socket.emitData(`${JSON.stringify(frame)}\n`)

  assert.deepEqual(received, [JSON.parse(JSON.stringify(frame))])
  assert.deepEqual(JSON.parse(socket.writes[0]), {
    fromProfileId: local.publicKey,
    requestId: frame.descriptorId,
    toProfileId: remote.publicKey,
    type: 'kepos.profile.request.ack.v1'
  })
})

test('profile Home descriptor frame requires a matching signed owner', () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const other = createSigningKeyPair()
  const frame = createHomeDescriptorFrame({ from, to })

  assert.equal(verifyProfileHomeDescriptorFrame(frame), true)
  assert.equal(
    verifyProfileHomeDescriptorFrame({ ...frame, fromProfileId: other.publicKey }),
    false
  )
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

function createInvite({ from, to, requestId = 'request-1' }) {
  const channelDiscoveryKey = 'a'.repeat(64)
  const channelPublicKey = 'b'.repeat(64)
  return createDmInvite({
    channelDiscoveryKey,
    channelPublicKey,
    createdAt: 1001,
    fromIdentity: from,
    inviteId: `${requestId}:invite`,
    payload: {
      channelDiscoveryKey,
      channelPublicKey,
      threadId: 'thread-1'
    },
    recipientEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    requestId,
    toProfileId: to.publicKey
  })
}

function createHomeDescriptorFrame({ from, to }) {
  return createProfileHomeDescriptorFrame({
    descriptor: createSignedHomeAddressPayload({
      address: 'c'.repeat(64),
      createdAt: 1002,
      identity: from,
      policy: 'trusted_only',
      roomKey: 'c'.repeat(64)
    }),
    descriptorId: 'home-descriptor-1',
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
