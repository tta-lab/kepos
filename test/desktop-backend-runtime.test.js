import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopBackendRuntime } from '../src/desktop-backend-runtime.js'

function createFakeRuntime(name) {
  return function (options = {}) {
    const broadcasts = []
    return {
      name,
      options,
      broadcasts,
      closeAll: () => `${name}:closeAll`,
      close: () => `${name}:close`,
      leave: () => `${name}:leave`,
      broadcastControl: (message) => broadcasts.push(message),
      configure: (context) => {
        options.context = context
      }
    }
  }
}

test('desktop backend runtime wires Home DM and Treehole runtimes to backend events', () => {
  const events = []
  const sessions = []
  const runtime = createDesktopBackendRuntime({
    createDmRuntime: createFakeRuntime('dm'),
    createHomeRuntime: createFakeRuntime('home'),
    createTreeholeRuntime: createFakeRuntime('treehole'),
    emit: (event, payload) => events.push([event, payload]),
    onDmSessionChanged: (session) => sessions.push(['dm', session]),
    onHomeControl: (message, peer) => events.push(['control', message, peer]),
    onHomeSessionChanged: (session) => sessions.push(['home', session]),
    onTreeholeStateChanged: (snapshot) => events.push(['treehole-callback', snapshot]),
    onVerifiedHello: (message, peer) => events.push(['hello', message, peer])
  })

  runtime.dm.options.onSessionChanged({ messages: ['dm'] })
  runtime.home.options.onPeerCount(2)
  runtime.home.options.onSessionChanged({ messages: ['home'] })
  runtime.home.options.onControl({ type: 'treehole.bootstrap' }, 'peer-1')
  runtime.home.options.onVerifiedHello({ profileId: 'friend' }, 'peer-1')
  runtime.home.options.onError(new Error('home failed'))
  runtime.treehole.options.onStateChanged({ status: 'ready' })
  runtime.treehole.options.onError(new Error('treehole failed'))

  assert.deepEqual(events, [
    ['dmMessageReceived', { messages: ['dm'] }],
    ['peerCountChanged', { peers: 2 }],
    ['homeMessageReceived', { messages: ['home'] }],
    ['control', { type: 'treehole.bootstrap' }, 'peer-1'],
    ['hello', { profileId: 'friend' }, 'peer-1'],
    ['errorReceived', new Error('home failed')],
    ['treeholeStateChanged', { status: 'ready' }],
    ['treehole-callback', { status: 'ready' }],
    ['errorReceived', new Error('treehole failed')]
  ])
  assert.deepEqual(runtime.home.broadcasts, [
    { snapshot: { status: 'ready' }, type: 'treehole.state.v1' }
  ])
  assert.deepEqual(sessions, [
    ['dm', { messages: ['dm'] }],
    ['home', { messages: ['home'] }]
  ])
})

test('desktop backend runtime configures and closes composed runtimes', async () => {
  const runtime = createDesktopBackendRuntime({
    createDmRuntime: createFakeRuntime('dm'),
    createHomeRuntime: createFakeRuntime('home'),
    createTreeholeRuntime: createFakeRuntime('treehole')
  })
  const context = { homeJoinDetails: { roomKey: 'room' }, session: { nick: 'Owner' } }

  runtime.configure(context)
  const closed = await runtime.closeAll()

  assert.deepEqual(runtime.home.options.context, context)
  assert.deepEqual(runtime.treehole.options.context, context)
  assert.deepEqual(closed, ['dm:closeAll', 'home:leave', 'treehole:close'])
})

test('desktop backend runtime passes storage base path to treehole runtime', () => {
  const runtime = createDesktopBackendRuntime({
    createDmRuntime: createFakeRuntime('dm'),
    createHomeRuntime: createFakeRuntime('home'),
    createTreeholeRuntime: createFakeRuntime('treehole'),
    storageBasePath: '/app/user-data/kepos/v1'
  })

  assert.equal(runtime.treehole.options.storageBasePath, '/app/user-data/kepos/v1')
})

test('desktop backend runtime passes direct transport factory to Home runtime', () => {
  const createDirectTransport = () => ({ close: () => {} })
  const runtime = createDesktopBackendRuntime({
    createDirectTransport,
    createDmRuntime: createFakeRuntime('dm'),
    createHomeRuntime: createFakeRuntime('home'),
    createTreeholeRuntime: createFakeRuntime('treehole')
  })

  assert.equal(runtime.home.options.createDirectTransport, createDirectTransport)
})
