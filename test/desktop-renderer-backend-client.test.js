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

test('desktop renderer backend client moves auto subscriptions to preload when it connects', () => {
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

  connected = true
  connectedHandler(true)
  unsubscribe()

  assert.deepEqual(calls, [
    ['local', 'subscribe', 'statusChanged'],
    ['preload', 'onConnected'],
    ['local', 'unsubscribe', 'statusChanged'],
    ['preload', 'subscribe', 'statusChanged'],
    ['preload', 'unsubscribe', 'statusChanged'],
    ['preload', 'offConnected']
  ])
  assert.deepEqual(received, [
    { label: 'local', event: 'statusChanged' },
    { label: 'preload', event: 'statusChanged' }
  ])
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
