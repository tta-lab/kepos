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

  test('incoming direct message frames are routed separately and deduped', async () => {
    const directMessages = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onDirectMessage: (message) => directMessages.push(message)
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

    assert.equal(directMessages.length, 1)
    assert.equal(directMessages[0].toProfileId, 'profile-b')
  })

  test('id-less direct message frames do not suppress later treehole controls', async () => {
    const controls = []
    const directMessages = []
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm(),
      onControl: (message) => controls.push(message),
      onDirectMessage: (message) => directMessages.push(message)
    })
    const socket = new FakeSocket()

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    socket.emitData(
      '{"type":"dm","fromProfileId":"profile-a","toProfileId":"profile-b","nick":"Ada","text":"missing id","at":1}\n'
    )
    socket.emitData(`{"type":"treehole.bootstrap","key":"${'b'.repeat(64)}"}\n`)

    assert.deepEqual(directMessages, [])
    assert.deepEqual(controls, [
      {
        type: 'treehole.bootstrap',
        key: 'b'.repeat(64)
      }
    ])
  })

  test('sendDirectMessage broadcasts a direct message frame to connected peers', async () => {
    const socket = new FakeSocket()
    const room = createP2PRoom({
      createSwarm: () => new FakeSwarm()
    })

    await room.join({ roomKey: 'a'.repeat(64), nick: 'Neil' })
    room.addPeer(socket)
    room.sendDirectMessage({
      id: 'dm-1',
      fromProfileId: 'profile-a',
      toProfileId: 'profile-b',
      text: 'hello',
      at: 1_797_331_200_000
    })

    assert.deepEqual(JSON.parse(socket.writes[0]), {
      type: 'dm',
      id: 'dm-1',
      fromProfileId: 'profile-a',
      toProfileId: 'profile-b',
      nick: 'Neil',
      text: 'hello',
      at: 1_797_331_200_000
    })
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
})

class FakeSwarm {
  constructor(joins = []) {
    this.joins = joins
    this.handlers = new Map()
    this.destroyed = false
  }

  on(event, handler) {
    this.handlers.set(event, handler)
  }

  join(topic, options) {
    this.joins.push({ topic, options })
    return {
      flushed: () => Promise.resolve()
    }
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
