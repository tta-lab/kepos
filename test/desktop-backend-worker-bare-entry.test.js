import assert from 'node:assert/strict'
import { Duplex } from 'node:stream'
import test from 'node:test'
import { startDesktopBackendBareWorker } from '../src/desktop-backend-worker-bare-entry.js'
import {
  createDesktopBackendWorkerIpcClient,
  createDesktopBackendWorkerIpcServer
} from '../src/desktop-backend-worker-ipc.js'

test('desktop backend bare worker entry attaches Bare IPC to the backend worker', async () => {
  const calls = []
  const backendBridge = {
    dispatch: (command, payload) => `${command}:${payload.value}`,
    subscribe: () => () => {}
  }
  const { clientStream, workerStream } = createIpcStreamPair()
  const bareHandlers = new Map()

  const worker = startDesktopBackendBareWorker({
    BareRuntime: {
      IPC: workerStream,
      argv: ['bare', '/app/src/desktop-backend-worker-bare-entry.js', '/user-data/kepos/v1'],
      on: (event, handler) => bareHandlers.set(event, handler)
    },
    startBackendWorker: ({ storageBasePath, stream }) => {
      calls.push({ storageBasePath, stream })
      const server = createDesktopBackendWorkerIpcServer({
        bridge: backendBridge,
        stream
      })
      return {
        close: () => {
          server.close()
          calls.push(['close'])
        }
      }
    }
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })

  assert.equal(worker.close instanceof Function, true)
  assert.equal(await client.bridge.dispatch('joinHome', { value: 'ok' }), 'joinHome:ok')
  assert.equal(calls[0].storageBasePath, '/user-data/kepos/v1')
  assert.equal(calls[0].stream, workerStream)

  await bareHandlers.get('beforeExit')()

  assert.deepEqual(calls.slice(1), [['close']])
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
