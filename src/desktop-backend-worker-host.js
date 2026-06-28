import { Duplex } from 'node:stream'
import { createDesktopMainBackendSession } from './desktop-main-backend-session.js'
import {
  createDesktopBackendWorkerIpcClient,
  createDesktopBackendWorkerIpcServer
} from './desktop-backend-worker-ipc.js'

export function createDesktopBackendWorkerHost({
  createIpcClient = createDesktopBackendWorkerIpcClient,
  createIpcServer = createDesktopBackendWorkerIpcServer,
  createIpcStreamPair = createLinkedDuplexPair,
  createMainBackendSession = createDesktopMainBackendSession,
  storageBasePath
} = {}) {
  let client = null
  let server = null
  let session = null

  return {
    get bridge() {
      return client?.bridge || null
    },
    close: () => {
      const currentSession = session
      const currentClient = client
      const currentServer = server
      client = null
      server = null
      session = null
      currentClient?.close()
      currentServer?.close()
      return currentSession?.backendRuntime?.closeAll?.()
    },
    start() {
      if (!session) {
        session = createMainBackendSession({ storageBasePath })
        const { clientStream, workerStream } = createIpcStreamPair()
        server = createIpcServer({ bridge: session.backendHost.bridge, stream: workerStream })
        client = createIpcClient({ stream: clientStream })
      }
      return Promise.resolve(client.bridge)
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
