import { Duplex } from 'node:stream'
import { createDesktopBackendWorkerIpcClient } from './desktop-backend-worker-ipc.ts'
import type { IpcStream } from './desktop-backend-worker-ipc.ts'
import { startDesktopBackendWorker } from './desktop-backend-worker-entry.ts'

export function createDesktopBackendWorkerHost({
  createBackendWorkerStream,
  createIpcClient = createDesktopBackendWorkerIpcClient,
  createIpcStreamPair = createLinkedDuplexPair,
  createMainBackendSession,
  startBackendWorker = startDesktopBackendWorker as unknown as WorkerStarter,
  storageBasePath,
  workerEntryPath = new URL('./desktop-backend-worker-bare-entry.ts', import.meta.url).pathname
}: DesktopBackendWorkerHostOptions = {}): DesktopBackendWorkerHost {
  let client: DesktopBackendWorkerIpcClient | null = null
  let worker: WorkerHandle | null = null

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
      if (!client) throw new Error('Desktop backend worker client is unavailable')
      return client.bridge
    }
  }
}

function createWorkerStreamHandle(stream: ClosableStream): WorkerHandle {
  return {
    close() {
      if (typeof stream.destroy === 'function') return stream.destroy()
      if (typeof stream.end === 'function') return stream.end()
      return undefined
    }
  }
}

function createLinkedDuplexPair(): IpcStreamPair {
  const clientStream = createLinkedDuplex()
  const workerStream = createLinkedDuplex()
  clientStream.peer = workerStream
  workerStream.peer = clientStream
  return { clientStream, workerStream }
}

function createLinkedDuplex(): LinkedDuplex {
  let stream: LinkedDuplex
  stream = new Duplex({
    read() {},
    write(chunk: Uint8Array, _encoding: string, callback: () => void) {
      stream.peer.push(chunk)
      callback()
    },
    final(callback: () => void) {
      stream.peer.push(null)
      callback()
    }
  }) as LinkedDuplex

  return stream
}

type DesktopBackendWorkerHostOptions = {
  createBackendWorkerStream?: (options: {
    storageBasePath?: string | null
    workerEntryPath: string
  }) => IpcStream | Promise<IpcStream>
  createIpcClient?: (options: { stream: IpcStream }) => DesktopBackendWorkerIpcClient
  createIpcStreamPair?: () => IpcStreamPair
  createMainBackendSession?: unknown
  startBackendWorker?: WorkerStarter
  storageBasePath?: string | null
  workerEntryPath?: string
}

type WorkerStarter = (options: {
  createMainBackendSession?: unknown
  storageBasePath?: string | null
  stream: IpcStream
}) => WorkerHandle

type DesktopBackendWorkerHost = {
  readonly bridge: DesktopBackendWorkerBridge | null
  close(): unknown
  start(): Promise<DesktopBackendWorkerBridge>
}

type DesktopBackendWorkerBridge = {
  dispatch(command: string, payload?: unknown): Promise<unknown>
  subscribe(event: string, handler: (payload: unknown) => void): () => void
}

type DesktopBackendWorkerIpcClient = {
  bridge: DesktopBackendWorkerBridge
  close(): void
}

type WorkerHandle = {
  close?: () => unknown
}

type ClosableStream = IpcStream & {
  end?: () => unknown
}

type IpcStreamPair = {
  clientStream: IpcStream
  workerStream: IpcStream
}

type LinkedDuplex = Duplex &
  IpcStream & {
    peer: LinkedDuplex
    push(chunk: Uint8Array | null): boolean
  }
