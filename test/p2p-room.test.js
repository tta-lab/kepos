import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createP2PRoom } from '../src/p2p-room.js'

describe('p2p room backend', () => {
  test('join starts discovery with a derived room topic', async () => {
    const joins = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(joins)
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })

    assert.equal(joins.length, 1)
    assert.equal(joins[0].topic.byteLength, 32)
    assert.deepEqual(joins[0].options, { client: true, server: true })
  })

  test('join can skip waiting for discovery flush in UI runtimes', async () => {
    const joins = []
    const room = createP2PRoom({
      awaitDiscoveryFlush: false,
      createSwarm: () => new FakeSwarm(joins, { pendingFlush: true })
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })

    assert.equal(joins.length, 1)
  })

  test('send broadcasts a chat frame to connected peers', async () => {
    const socket = new FakeSocket()
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm()
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    room.send({
      id: 'local-1',
      text: 'hello',
      at: 1_797_331_200_000
    })

    assert.equal(socket.writes.length, 1)
    assert.deepEqual(JSON.parse(socket.writes[0]), {
      type: 'chat',
      id: 'local-1',
      nick: 'Neil',
      text: 'hello',
      at: 1_797_331_200_000
    })
  })

  test('incoming chat frames are emitted once', async () => {
    const messages = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onMessage: (message) => messages.push(message)
    })
    const socket = new FakeSocket()

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    socket.emitData('{"type":"chat","id":"remote-1","nick":"Ada","text":"hi","at":1}\n')
    socket.emitData('{"type":"chat","id":"remote-1","nick":"Ada","text":"hi","at":1}\n')

    assert.equal(messages.length, 1)
    assert.equal(messages[0].nick, 'Ada')
  })

  test('incoming direct message body frames are ignored', async () => {
    const controls = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onControl: (message) => controls.push(message)
    })
    const socket = new FakeSocket()

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    socket.emitData(
      '{"type":"dm","id":"dm-1","fromProfileId":"profile-a","toProfileId":"profile-b","nick":"Ada","text":"hi","at":1}\n'
    )
    socket.emitData(
      '{"type":"dm","id":"dm-1","fromProfileId":"profile-a","toProfileId":"profile-b","nick":"Ada","text":"hi","at":1}\n'
    )

    assert.deepEqual(controls, [])
  })

  test('unsupported direct message frames do not suppress later treehole controls', async () => {
    const controls = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onControl: (message) => controls.push(message)
    })
    const socket = new FakeSocket()

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    socket.emitData(
      '{"type":"dm","fromProfileId":"profile-a","toProfileId":"profile-b","nick":"Ada","text":"missing id","at":1}\n'
    )
    socket.emitData(`{"type":"treehole.bootstrap","key":"${'b'.repeat(64)}"}\n`)

    assert.deepEqual(controls, [
      {
        type: 'treehole.bootstrap',
        key: 'b'.repeat(64)
      }
    ])
  })

  test('incoming treehole frames are routed as control messages', async () => {
    const controls = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onControl: (message) => controls.push(message)
    })
    const socket = new FakeSocket()

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    socket.emitData(`{"type":"treehole.bootstrap","key":"${'b'.repeat(64)}"}\n`)

    assert.deepEqual(controls, [
      {
        type: 'treehole.bootstrap',
        key: 'b'.repeat(64)
      }
    ])
  })

  test('incoming control frames include the sending peer', async () => {
    const controls = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onControl: (message, peer) => controls.push({ message, peer })
    })
    const socket = new FakeSocket()

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    socket.emitData('{"type":"kepos.home.hello.request.v1"}\n')

    assert.equal(controls.length, 1)
    assert.equal(controls[0].peer, socket)
    assert.deepEqual(controls[0].message, {
      type: 'kepos.home.hello.request.v1'
    })
  })

  test('broadcastControl sends a treehole frame to connected peers', async () => {
    const socket = new FakeSocket()
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm()
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    room.broadcastControl({
      type: 'treehole.writer',
      key: 'c'.repeat(64)
    })

    assert.deepEqual(JSON.parse(socket.writes[0]), {
      type: 'treehole.writer',
      key: 'c'.repeat(64)
    })
  })

  test('sendControl writes a control frame only to one peer', async () => {
    const left = new FakeSocket()
    const right = new FakeSocket()
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm()
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(left)
    room.addPeer(right)
    room.sendControl(left, {
      type: 'kepos.home.hello.request.v1'
    })

    assert.deepEqual(JSON.parse(left.writes[0]), {
      type: 'kepos.home.hello.request.v1'
    })
    assert.equal(right.writes.length, 0)
  })

  test('incoming message request and DM invite frames are routed as control messages', async () => {
    const controls = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onControl: (message) => controls.push(message)
    })
    const socket = new FakeSocket()

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    socket.emitData('{"type":"kepos.message.request.v1","requestId":"request-1"}\n')
    socket.emitData('{"type":"kepos.dm.invite.v1","inviteId":"invite-1"}\n')

    assert.deepEqual(controls, [
      {
        type: 'kepos.message.request.v1',
        requestId: 'request-1'
      },
      {
        type: 'kepos.dm.invite.v1',
        inviteId: 'invite-1'
      }
    ])
  })

  test('onPeer is called for newly connected peers', async () => {
    const peers = []
    const socket = new FakeSocket()
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onPeer: (peer) => peers.push(peer)
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)

    assert.deepEqual(peers, [socket])
  })

  test('join emits transport debug snapshots', async () => {
    const debugStates = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onDebugState: (debug) => debugStates.push(debug)
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })

    assert.deepEqual(
      debugStates.map((state) => state.stage),
      ['created', 'joined-topic', 'flushed']
    )
    assert.deepEqual(debugStates.at(-1), {
      activeQuery: false,
      connections: 0,
      connecting: 0,
      discovered: 0,
      destroyed: false,
      dhtFirewalled: false,
      dhtNodes: 0,
      dhtOnline: false,
      isClient: true,
      isServer: true,
      knownPeers: 0,
      lastPeerClient: false,
      lastPeerSelf: false,
      lastPeerTopics: 0,
      listening: false,
      localPeers: 0,
      refreshes: 1,
      stage: 'flushed',
      topics: 1
    })
  })
})

class FakeSwarm {
  constructor(joins = [], options = {}) {
    this.joins = joins
    this.options = options
    this.connections = new Set()
    this.connecting = 0
    this.dht = {
      firewalled: false,
      nodes: [],
      online: false
    }
    this.handlers = new Map()
    this.peers = new Map()
    this.joinedTopics = new Map()
    this.destroyed = false
  }

  on(event, handler) {
    this.handlers.set(event, handler)
  }

  join(topic, options) {
    this.joins.push({ topic, options })
    this.joinedTopics.set(topic.toString('hex'), {
      _activeQuery: null,
      _discovered: new Set(),
      _refreshes: 1,
      isClient: Boolean(options.client),
      isServer: Boolean(options.server),
      topic
    })
    return {
      flushed: () => (this.options.pendingFlush ? new Promise(() => {}) : Promise.resolve())
    }
  }

  status(topic) {
    return this.joinedTopics.get(topic.toString('hex')) || null
  }

  topics() {
    return Array.from(this.joinedTopics.values(), (discovery) => discovery.topic).values()
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
}
