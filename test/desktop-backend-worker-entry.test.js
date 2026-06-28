import assert from 'node:assert/strict'
import { Duplex } from 'node:stream'
import test from 'node:test'
import { startDesktopBackendWorker } from '../src/desktop-backend-worker-entry.js'
import { createDesktopBackendWorkerIpcClient } from '../src/desktop-backend-worker-ipc.js'

test('desktop backend worker entry attaches a backend session to worker ipc', async () => {
  const calls = []
  const backendBridge = {
    dispatch: (command, payload) => `${command}:${payload.value}`,
    subscribe: () => () => {}
  }
  const { clientStream, workerStream } = createIpcStreamPair()

  const worker = startDesktopBackendWorker({
    createMainBackendSession: (options) => {
      calls.push(options)
      return {
        backendHost: { bridge: backendBridge },
        backendRuntime: { closeAll: () => calls.push(['closeAll']) }
      }
    },
    storageBasePath: '/user-data/kepos/v1',
    stream: workerStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })

  assert.equal(await client.bridge.dispatch('joinHome', { value: 'ok' }), 'joinHome:ok')
  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }])

  worker.close()

  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }, ['closeAll']])
})

function createIpcStreamPair() {
  const clientStream = createLinkedDuplex()
  const workerStream = createLinkedDuplex()
  clientStream.peer = workerStream
  workerStream.peer = clientStream
  return { clientStream, workerStream }
}

function createLinkedDuplex() {
  return new Duplex({
    read() {},
    write(chunk, _encoding, callback) {
      this.peer.push(Buffer.from(chunk))
      callback()
    },
    final(callback) {
      this.peer.push(null)
      callback()
    }
  })
}
