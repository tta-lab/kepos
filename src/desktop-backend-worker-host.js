import { Duplex } from 'node:stream'
import { createDesktopBackendWorkerIpcClient } from './desktop-backend-worker-ipc.js'
import { startDesktopBackendWorker } from './desktop-backend-worker-entry.js'

export function createDesktopBackendWorkerHost({
  createBackendWorkerStream,
  createIpcClient = createDesktopBackendWorkerIpcClient,
  createIpcStreamPair = createLinkedDuplexPair,
  createMainBackendSession,
  startBackendWorker = startDesktopBackendWorker,
  storageBasePath,
  workerEntryPath = new URL('./desktop-backend-worker-bare-entry.js', import.meta.url).pathname
} = {}) {
  let client = null
  let worker = null

  return {
    get bridge() {
      return client?.bridge || null
    },
    close: () => {
      const currentClient = client
      const currentWorker = worker
      client = null
      worker = null
      currentClient?.close()
      return currentWorker?.close?.()
    },
    async start() {
      if (!worker) {
        if (createBackendWorkerStream) {
          const stream = await createBackendWorkerStream({
            storageBasePath,
            workerEntryPath
          })
          worker = createWorkerStreamHandle(stream)
          client = createIpcClient({ stream })
        } else {
          const { clientStream, workerStream } = createIpcStreamPair()
          worker = startBackendWorker({
            createMainBackendSession,
            storageBasePath,
            stream: workerStream
          })
          client = createIpcClient({ stream: clientStream })
        }
      }
      return client.bridge
    }
  }
}

function createWorkerStreamHandle(stream) {
  return {
    close() {
      if (typeof stream.destroy === 'function') return stream.destroy()
      if (typeof stream.end === 'function') return stream.end()
      return undefined
    }
  }
}

function createLinkedDuplexPair() {
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
