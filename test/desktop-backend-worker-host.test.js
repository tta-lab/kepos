import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopBackendWorkerHost } from '../src/desktop-backend-worker-host.js'

test('desktop backend worker host starts and exposes a worker bridge', async () => {
  const bridge = { dispatch: () => undefined }
  const calls = []

  const workerHost = createDesktopBackendWorkerHost({
    createMainBackendSession: (options) => {
      calls.push(options)
      return {
        backendHost: { bridge },
        backendRuntime: { closeAll: () => calls.push(['closeAll']) }
      }
    },
    storageBasePath: '/user-data/kepos/v1'
  })

  assert.equal(workerHost.bridge, null)
  assert.deepEqual(calls, [])

  const startedBridge = await workerHost.start()

  assert.equal(startedBridge, bridge)
  assert.equal(workerHost.bridge, bridge)
  assert.equal(workerHost.backendHost, undefined)
  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }])

  workerHost.close()

  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }, ['closeAll']])
})

test('desktop backend worker host starts only once', async () => {
  const bridge = { dispatch: () => undefined }
  const calls = []
  const workerHost = createDesktopBackendWorkerHost({
    createMainBackendSession: () => {
      calls.push('create')
      return {
        backendHost: { bridge },
        backendRuntime: { closeAll: () => calls.push('close') }
      }
    }
  })

  assert.equal(await workerHost.start(), bridge)
  assert.equal(await workerHost.start(), bridge)

  assert.deepEqual(calls, ['create'])
})
