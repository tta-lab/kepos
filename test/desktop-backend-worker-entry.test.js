import assert from 'node:assert/strict'
import { Duplex } from 'node:stream'
import test from 'node:test'
import { startDesktopBackendWorker } from '../src/desktop-backend-worker-entry.ts'
import { createDesktopBackendWorkerIpcClient } from '../src/desktop-backend-worker-ipc.ts'

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

test('desktop backend worker entry publishes initial snapshots after ipc subscribes', async () => {
  const backendHandlers = new Map()
  const { clientStream, workerStream } = createIpcStreamPair()

  startDesktopBackendWorker({
    createMainBackendSession: () => ({
      backendHost: {
        bridge: {
          dispatch: () => undefined,
          emit: (event, payload) => backendHandlers.get(event)?.(payload),
          subscribe: (event, handler) => {
            backendHandlers.set(event, handler)
            return () => backendHandlers.delete(event)
          }
        }
      },
      publishSnapshots() {
        this.backendHost.bridge.emit('shareQrOutputsChanged', {
          profileUri: 'kepos://profile/worker'
        })
      }
    }),
    stream: workerStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })
  const events = []
  await new Promise((resolve) => setTimeout(resolve, 0))
  client.bridge.subscribe('shareQrOutputsChanged', (payload) => {
    events.push(payload)
  })

  assert.deepEqual(events, [{ profileUri: 'kepos://profile/worker' }])
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
