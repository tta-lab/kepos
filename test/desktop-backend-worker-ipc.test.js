import assert from 'node:assert/strict'
import { Duplex } from 'node:stream'
import test from 'node:test'
import {
  createDesktopBackendWorkerIpcClient,
  createDesktopBackendWorkerIpcServer
} from '../src/desktop-backend-worker-ipc.ts'

test('desktop backend worker ipc dispatches commands over a stream', async () => {
  const calls = []
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: (command, payload) => {
        calls.push([command, payload])
        return `${command}:${payload.value}`
      },
      subscribe: () => () => {}
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })

  const result = await client.bridge.dispatch('joinHome', { value: 'ok' })

  assert.equal(result, 'joinHome:ok')
  assert.deepEqual(calls, [['joinHome', { value: 'ok' }]])
})

test('desktop backend worker ipc rejects dispatch errors', async () => {
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: () => {
        throw new Error('join failed')
      },
      subscribe: () => () => {}
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })

  await assert.rejects(() => client.bridge.dispatch('joinHome', {}), /join failed/)
})

test('desktop backend worker ipc forwards backend events over a stream', async () => {
  const backendHandlers = new Map()
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: () => undefined,
      subscribe: (event, handler) => {
        backendHandlers.set(event, handler)
        return () => backendHandlers.delete(event)
      }
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })
  const events = []
  const unsubscribe = client.bridge.subscribe('treeholeStateChanged', (payload) => {
    events.push(payload)
  })

  backendHandlers.get('treeholeStateChanged')({ status: 'ready' })
  await waitFor(() => events.length === 1)
  unsubscribe()
  backendHandlers.get('treeholeStateChanged')({ status: 'ignored' })
  await Promise.resolve()

  assert.deepEqual(events, [{ status: 'ready' }])
})

test('desktop backend worker ipc replays latest snapshot events to late subscribers', async () => {
  const backendHandlers = new Map()
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: () => undefined,
      subscribe: (event, handler) => {
        backendHandlers.set(event, handler)
        return () => backendHandlers.delete(event)
      }
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })

  backendHandlers.get('shareQrOutputsChanged')({ profileUri: 'kepos://profile' })
  await new Promise((resolve) => setTimeout(resolve, 0))

  const events = []
  client.bridge.subscribe('shareQrOutputsChanged', (payload) => {
    events.push(payload)
  })

  assert.deepEqual(events, [{ profileUri: 'kepos://profile' }])
})

test('desktop backend worker ipc replays latest DM thread snapshots to late subscribers', async () => {
  const backendHandlers = new Map()
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: () => undefined,
      subscribe: (event, handler) => {
        backendHandlers.set(event, handler)
        return () => backendHandlers.delete(event)
      }
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })

  backendHandlers.get('dmThreadChanged')([{ threadId: 'thread-1' }])
  await new Promise((resolve) => setTimeout(resolve, 0))

  const events = []
  client.bridge.subscribe('dmThreadChanged', (payload) => {
    events.push(payload)
  })

  assert.deepEqual(events, [[{ threadId: 'thread-1' }]])
})

test('desktop backend worker ipc replays latest transport debug event to late subscribers', async () => {
  const backendHandlers = new Map()
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: () => undefined,
      subscribe: (event, handler) => {
        backendHandlers.set(event, handler)
        return () => backendHandlers.delete(event)
      }
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })

  backendHandlers.get('transportDebugChanged')({ stage: 'flushed' })
  await new Promise((resolve) => setTimeout(resolve, 0))

  const events = []
  client.bridge.subscribe('transportDebugChanged', (payload) => {
    events.push(payload)
  })

  assert.deepEqual(events, [{ stage: 'flushed' }])
})

test('desktop backend worker ipc preserves map payloads across the json stream', async () => {
  const backendHandlers = new Map()
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: () => undefined,
      subscribe: (event, handler) => {
        backendHandlers.set(event, handler)
        return () => backendHandlers.delete(event)
      }
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })
  const events = []
  client.bridge.subscribe('contactBookChanged', (payload) => {
    events.push(payload)
  })

  backendHandlers.get('contactBookChanged')({
    contactsByProfileId: new Map([['profile-1', { alias: 'Ada' }]])
  })
  await waitFor(() => events.length === 1)

  assert.equal(events[0].contactsByProfileId instanceof Map, true)
  assert.deepEqual([...events[0].contactsByProfileId.entries()], [['profile-1', { alias: 'Ada' }]])
})

test('desktop backend worker ipc preserves error event messages across the json stream', async () => {
  const backendHandlers = new Map()
  const { clientStream, serverStream } = createDuplexPair()
  createDesktopBackendWorkerIpcServer({
    bridge: {
      dispatch: () => undefined,
      subscribe: (event, handler) => {
        backendHandlers.set(event, handler)
        return () => backendHandlers.delete(event)
      }
    },
    stream: serverStream
  })
  const client = createDesktopBackendWorkerIpcClient({ stream: clientStream })
  const events = []
  client.bridge.subscribe('errorReceived', (payload) => {
    events.push(payload)
  })

  backendHandlers.get('errorReceived')(new Error('QR render failed'))
  await waitFor(() => events.length === 1)

  assert.equal(events[0] instanceof Error, true)
  assert.equal(events[0].message, 'QR render failed')
})

function createDuplexPair() {
  const clientStream = createLinkedDuplex()
  const serverStream = createLinkedDuplex()
  clientStream.peer = serverStream
  serverStream.peer = clientStream
  return { clientStream, serverStream }
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
