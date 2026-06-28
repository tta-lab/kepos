import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Duplex } from 'node:stream'
import test from 'node:test'
import { createDesktopBackendWorkerHost } from '../src/desktop-backend-worker-host.js'
import { createDesktopBackendWorkerIpcServer } from '../src/desktop-backend-worker-ipc.js'

test('desktop backend worker host starts and exposes an ipc worker bridge', async () => {
  const backendHandlers = new Map()
  const backendBridge = {
    dispatch: (command, payload) => `${command}:${payload.value}`,
    subscribe: (event, handler) => {
      backendHandlers.set(event, handler)
      return () => backendHandlers.delete(event)
    }
  }
  const calls = []

  const workerHost = createDesktopBackendWorkerHost({
    createIpcStreamPair,
    startBackendWorker: ({ storageBasePath, stream }) => {
      calls.push({ storageBasePath })
      const server = createDesktopBackendWorkerIpcServer({
        bridge: backendBridge,
        stream
      })
      return {
        close: () => {
          server.close()
          calls.push(['closeAll'])
        }
      }
    },
    storageBasePath: '/user-data/kepos/v1'
  })

  assert.equal(workerHost.bridge, null)
  assert.deepEqual(calls, [])

  const startedBridge = await workerHost.start()

  assert.notEqual(startedBridge, backendBridge)
  assert.equal(workerHost.bridge, startedBridge)
  assert.equal(workerHost.backendHost, undefined)
  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }])
  assert.equal(await startedBridge.dispatch('joinHome', { value: 'ok' }), 'joinHome:ok')

  const events = []
  const unsubscribe = startedBridge.subscribe('treeholeStateChanged', (payload) => {
    events.push(payload)
  })
  backendHandlers.get('treeholeStateChanged')({ status: 'ready' })
  await waitFor(() => events.length === 1)
  unsubscribe()

  workerHost.close()

  assert.deepEqual(calls, [{ storageBasePath: '/user-data/kepos/v1' }, ['closeAll']])
  assert.deepEqual(events, [{ status: 'ready' }])
})

test('desktop backend worker host starts only once', async () => {
  const bridge = { dispatch: () => undefined }
  const calls = []
  const workerHost = createDesktopBackendWorkerHost({
    startBackendWorker: () => {
      calls.push('create')
      return {
        close: () => calls.push('close')
      }
    }
  })

  const firstBridge = await workerHost.start()
  const secondBridge = await workerHost.start()

  assert.notEqual(firstBridge, bridge)
  assert.equal(secondBridge, firstBridge)
  assert.deepEqual(calls, ['create'])
})

test('desktop backend worker host delegates session creation to worker entry', async () => {
  const source = await readFile(
    new URL('../src/desktop-backend-worker-host.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /desktop-backend-worker-entry\.js/)
  assert.doesNotMatch(source, /desktop-main-backend-session\.js/)
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

async function waitFor(predicate) {
  for (let index = 0; index < 20; index += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error('Timed out waiting for condition')
}
