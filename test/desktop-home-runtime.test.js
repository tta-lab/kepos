import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopHomeRuntime } from '../src/desktop-home-runtime.js'

const identity = { publicKey: 'a'.repeat(64), secretKey: 'b'.repeat(128) }
const homeJoinDetails = {
  address: 'home-address',
  identity,
  ownerProfileId: identity.publicKey,
  profileId: identity.publicKey,
  roomKey: 'c'.repeat(64),
  session: {
    messages: [],
    nick: 'Owner',
    profileId: identity.publicKey,
    roomKey: 'c'.repeat(64),
    seenMessageIds: new Set()
  }
}

function createFakeRoom() {
  const calls = []
  const room = {
    broadcastControl: (message) => calls.push(['broadcastControl', message]),
    join: (payload) => calls.push(['join', payload]),
    leave: () => calls.push(['leave']),
    send: (message) => calls.push(['send', message]),
    sendControl: (peer, message) => calls.push(['sendControl', peer, message])
  }

  return { calls, room }
}

function createRuntime({ createDirectTransport = undefined } = {}) {
  const { calls, room } = createFakeRoom()
  const controls = []
  const errors = []
  const debugStates = []
  const peerCounts = []
  const sessions = []
  const verifiedHellos = []
  const runtime = createDesktopHomeRuntime({
    createDirectTransport,
    createHomeHello: () => ({
      homeAddress: homeJoinDetails.address,
      profileId: identity.publicKey,
      type: 'kepos.home.hello.v1'
    }),
    createRoom: (options) => {
      room.options = options
      return room
    },
    onControl: (message, peer) => controls.push([message, peer]),
    onDebugState: (debug) => debugStates.push(debug),
    onError: (error) => errors.push(error.message),
    onPeerCount: (peers) => peerCounts.push(peers),
    onSessionChanged: (session) => sessions.push(session),
    onVerifiedHello: (message, peer) => verifiedHellos.push([message, peer]),
    verifyHomeHello: (message) => message.signature === 'sig'
  })

  return {
    calls,
    controls,
    debugStates,
    errors,
    peerCounts,
    room,
    runtime,
    sessions,
    verifiedHellos
  }
}

test('desktop home runtime wires configured direct transport into the room', async () => {
  const { debugStates, room, runtime } = createRuntime({
    createDirectTransport: (options) => options
  })
  const directTransport = { listenHost: '0.0.0.0', mode: 'host' }

  await runtime.join({ homeJoinDetails: { ...homeJoinDetails, directTransport } })

  assert.equal(typeof room.options.createDirectTransport, 'function')
  const transportOptions = room.options.createDirectTransport({
    addPeer: () => {},
    roomKey: 'room'
  })
  assert.equal(typeof transportOptions.addPeer, 'function')
  assert.deepEqual(
    {
      listenHost: transportOptions.listenHost,
      mode: transportOptions.mode,
      roomKey: transportOptions.roomKey
    },
    {
      listenHost: directTransport.listenHost,
      mode: directTransport.mode,
      roomKey: 'room'
    }
  )
  transportOptions.onEndpoint({ host: '192.168.1.203', port: 40123 })
  assert.deepEqual(debugStates.at(-1), {
    directEndpoint: { host: '192.168.1.203', port: 40123 },
    stage: 'direct-endpoint'
  })
  room.options.onDebugState({ connections: 0, stage: 'flushed' })
  assert.deepEqual(debugStates.at(-1), {
    connections: 0,
    directEndpoint: { host: '192.168.1.203', port: 40123 },
    stage: 'flushed'
  })
})

test('desktop home runtime joins and leaves a room lifecycle', async () => {
  const { calls, runtime } = createRuntime()

  await runtime.join({ homeJoinDetails })
  await runtime.leave()

  assert.deepEqual(calls, [
    ['join', { nick: 'Owner', roomKey: homeJoinDetails.roomKey }],
    ['leave']
  ])
  assert.equal(runtime.isJoined(), false)
})

test('desktop home runtime owns home hello request and verification', async () => {
  const { calls, room, runtime, verifiedHellos } = createRuntime()

  await runtime.join({ homeJoinDetails })
  room.options.onPeer('peer-1')
  room.options.onControl({ type: 'kepos.home.hello.request.v1' }, 'peer-1')
  room.options.onControl(
    {
      homeAddress: homeJoinDetails.address,
      profileId: identity.publicKey,
      signature: 'sig',
      signedAt: 1,
      type: 'kepos.home.hello.v1'
    },
    'peer-1'
  )

  assert.deepEqual(
    calls
      .filter(([name]) => name === 'sendControl')
      .map(([, peer, message]) => [peer, message.type]),
    [
      ['peer-1', 'kepos.home.hello.v1'],
      ['peer-1', 'kepos.home.hello.request.v1'],
      ['peer-1', 'kepos.home.hello.v1']
    ]
  )
  assert.equal(verifiedHellos.length, 1)
})

test('desktop home runtime updates chat session for local and remote messages', async () => {
  const { calls, room, runtime, sessions } = createRuntime()

  await runtime.join({ homeJoinDetails })
  const local = runtime.sendMessage({ at: 1, id: 'message-1', text: '  hello  ' })
  room.options.onMessage({ at: 2, id: 'message-2', nick: 'Peer', text: 'hi' })

  assert.equal(local.messages.length, 1)
  assert.equal(local.messages[0].text, 'hello')
  assert.equal(sessions.at(-1).messages.length, 2)
  assert.deepEqual(calls.at(-1), ['send', { at: 1, id: 'message-1', text: 'hello' }])
})

test('desktop home runtime ignores blank local messages', async () => {
  const { calls, runtime, sessions } = createRuntime()

  await runtime.join({ homeJoinDetails })
  const result = runtime.sendMessage({ at: 1, id: 'message-1', text: '   ' })

  assert.equal(result, null)
  assert.equal(sessions.length, 0)
  assert.equal(
    calls.some(([name]) => name === 'send'),
    false
  )
})

test('desktop home runtime forwards non-home control frames and peer counts', async () => {
  const { controls, peerCounts, room, runtime } = createRuntime()

  await runtime.join({ homeJoinDetails })
  room.options.onPeerCount(2)
  room.options.onControl({ type: 'treehole.bootstrap', key: 'tree-key' }, 'peer-1')

  assert.deepEqual(peerCounts, [2])
  assert.deepEqual(controls, [[{ type: 'treehole.bootstrap', key: 'tree-key' }, 'peer-1']])
})
