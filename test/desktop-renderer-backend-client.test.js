import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopRendererBackendClient } from '../src/desktop-renderer-backend-client.js'

function createBackend(label, calls) {
  return {
    dispatch(command, payload) {
      calls.push([label, 'dispatch', command, payload])
      return `${label}:${command}`
    },
    subscribe(event, handler) {
      calls.push([label, 'subscribe', event])
      handler({ label, event })
      return () => calls.push([label, 'unsubscribe', event])
    }
  }
}

test('desktop renderer backend client falls back to local bridge by default', async () => {
  const calls = []
  const client = createDesktopRendererBackendClient({
    localBackend: createBackend('local', calls),
    preloadBackend: createBackend('preload', calls)
  })

  assert.equal(await client.dispatch('joinHome', { mode: 'host' }), 'local:joinHome')
  const unsubscribe = client.subscribe('statusChanged', () => {})
  unsubscribe()

  assert.deepEqual(calls, [
    ['local', 'dispatch', 'joinHome', { mode: 'host' }],
    ['local', 'subscribe', 'statusChanged'],
    ['local', 'unsubscribe', 'statusChanged']
  ])
})

test('desktop renderer backend client uses connected preload bridge in auto mode', async () => {
  const calls = []
  const preload = createBackend('preload', calls)
  preload.isConnected = () => true
  const client = createDesktopRendererBackendClient({
    localBackend: createBackend('local', calls),
    preloadBackend: preload
  })

  assert.equal(await client.dispatch('joinHome', { mode: 'host' }), 'preload:joinHome')
  const unsubscribe = client.subscribe('statusChanged', () => {})
  unsubscribe()

  assert.deepEqual(calls, [
    ['preload', 'dispatch', 'joinHome', { mode: 'host' }],
    ['preload', 'subscribe', 'statusChanged'],
    ['preload', 'unsubscribe', 'statusChanged']
  ])
})

test('desktop renderer backend client reports whether auto mode has connected preload', () => {
  let connected = false
  const preload = createBackend('preload', [])
  preload.isConnected = () => connected
  const client = createDesktopRendererBackendClient({
    localBackend: createBackend('local', []),
    preloadBackend: preload
  })

  assert.equal(client.isPreloadConnected(), false)

  connected = true

  assert.equal(client.isPreloadConnected(), true)
})

test('desktop renderer backend client reports whether auto mode has a managed preload bridge', () => {
  const unmanagedPreload = createBackend('preload', [])
  const managedPreload = createBackend('preload', [])
  managedPreload.onConnected = () => () => {}
  const unmanagedClient = createDesktopRendererBackendClient({
    localBackend: createBackend('local', []),
    preloadBackend: unmanagedPreload
  })
  const managedClient = createDesktopRendererBackendClient({
    localBackend: createBackend('local', []),
    preloadBackend: managedPreload
  })
  const explicitPreloadClient = createDesktopRendererBackendClient({
    localBackend: createBackend('local', []),
    mode: 'preload',
    preloadBackend: managedPreload
  })

  assert.equal(unmanagedClient.hasPreloadBackend(), false)
  assert.equal(managedClient.hasPreloadBackend(), true)
  assert.equal(explicitPreloadClient.hasPreloadBackend(), false)
})

test('desktop renderer backend client reports disconnected preload outside auto mode', () => {
  const preload = createBackend('preload', [])
  preload.isConnected = () => true
  const client = createDesktopRendererBackendClient({
    localBackend: createBackend('local', []),
    mode: 'preload',
    preloadBackend: preload
  })

  assert.equal(client.isPreloadConnected(), false)
})

test('desktop renderer backend client does not create local fallback when preload is connected', async () => {
  const calls = []
  const preload = createBackend('preload', calls)
  preload.isConnected = () => true
  const client = createDesktopRendererBackendClient({
    createLocalBackend: () => {
      calls.push(['local', 'create'])
      return createBackend('local', calls)
    },
    preloadBackend: preload
  })

  assert.equal(await client.dispatch('joinHome', { mode: 'host' }), 'preload:joinHome')
  const unsubscribe = client.subscribe('statusChanged', () => {})
  unsubscribe()

  assert.deepEqual(calls, [
    ['preload', 'dispatch', 'joinHome', { mode: 'host' }],
    ['preload', 'subscribe', 'statusChanged'],
    ['preload', 'unsubscribe', 'statusChanged']
  ])
})

test('desktop renderer backend client creates local fallback only when needed', async () => {
  const calls = []
  const client = createDesktopRendererBackendClient({
    createLocalBackend: () => {
      calls.push(['local', 'create'])
      return createBackend('local', calls)
    },
    preloadBackend: createBackend('preload', calls)
  })

  assert.equal(await client.dispatch('joinHome', { mode: 'host' }), 'local:joinHome')
  const unsubscribe = client.subscribe('statusChanged', () => {})
  unsubscribe()

  assert.deepEqual(calls, [
    ['local', 'create'],
    ['local', 'dispatch', 'joinHome', { mode: 'host' }],
    ['local', 'subscribe', 'statusChanged'],
    ['local', 'unsubscribe', 'statusChanged']
  ])
})

test('desktop renderer backend client waits for managed preload subscriptions before using fallback', () => {
  const calls = []
  let connected = false
  let connectedHandler = null
  const preload = createBackend('preload', calls)
  preload.isConnected = () => connected
  preload.onConnected = (handler) => {
    calls.push(['preload', 'onConnected'])
    connectedHandler = handler
    return () => calls.push(['preload', 'offConnected'])
  }
  const client = createDesktopRendererBackendClient({
    localBackend: createBackend('local', calls),
    preloadBackend: preload
  })

  const received = []
  const unsubscribe = client.subscribe('statusChanged', (payload) => received.push(payload))

  assert.deepEqual(calls, [['preload', 'onConnected']])

  connected = true
  connectedHandler(true)
  unsubscribe()

  assert.deepEqual(calls, [
    ['preload', 'onConnected'],
    ['preload', 'subscribe', 'statusChanged'],
    ['preload', 'unsubscribe', 'statusChanged'],
    ['preload', 'offConnected']
  ])
  assert.deepEqual(received, [{ label: 'preload', event: 'statusChanged' }])
})

test('desktop renderer backend client dispatches through managed preload before it connects', async () => {
  const calls = []
  const preload = createBackend('preload', calls)
  preload.isConnected = () => false
  preload.onConnected = () => () => {}
  const client = createDesktopRendererBackendClient({
    createLocalBackend: () => {
      calls.push(['local', 'create'])
      return createBackend('local', calls)
    },
    preloadBackend: preload
  })

  assert.equal(await client.dispatch('joinHome', { mode: 'host' }), 'preload:joinHome')

  assert.deepEqual(calls, [['preload', 'dispatch', 'joinHome', { mode: 'host' }]])
})

test('desktop renderer backend client can explicitly use preload bridge', async () => {
  const calls = []
  const client = createDesktopRendererBackendClient({
    localBackend: createBackend('local', calls),
    mode: 'preload',
    preloadBackend: createBackend('preload', calls)
  })

  assert.equal(await client.dispatch('joinHome', { mode: 'host' }), 'preload:joinHome')

  assert.deepEqual(calls, [['preload', 'dispatch', 'joinHome', { mode: 'host' }]])
})

test('desktop renderer backend client fails closed when auto backend is unavailable', async () => {
  const client = createDesktopRendererBackendClient({
    preloadBackend: null
  })

  await assert.rejects(() => client.dispatch('joinHome'), /Desktop local backend is unavailable/)
  assert.throws(
    () => client.subscribe('statusChanged', () => {}),
    /Desktop local backend is unavailable/
  )
})

test('desktop renderer backend client fails closed when preload bridge is required but missing', async () => {
  const client = createDesktopRendererBackendClient({
    localBackend: createBackend('local', []),
    mode: 'preload'
  })

  await assert.rejects(() => client.dispatch('joinHome'), /Desktop preload backend is unavailable/)
  assert.throws(
    () => client.subscribe('statusChanged', () => {}),
    /Desktop preload backend is unavailable/
  )
})
