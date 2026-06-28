import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopBackendWorkerHost } from '../src/desktop-backend-worker-host.js'

test('desktop backend worker host exposes a worker bridge', () => {
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

  assert.equal(workerHost.bridge, bridge)
  assert.equal(workerHost.backendHost, undefined)
  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }])

  workerHost.close()

  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }, ['closeAll']])
})
