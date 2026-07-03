declare const require:
  | undefined
  | ((id: string) => {
      createConnection: TcpApi['createConnection']
      createServer: TcpApi['createServer']
    })

type DirectRoomMode = 'host' | 'guest'

type DirectRoomEndpoint = {
  host: string
  port: number
}

type DirectRoomPeer = {
  destroy?: () => unknown
  end?: () => unknown
  on?: (event: string, handler: (...args: unknown[]) => void) => unknown
}

type TcpServer = {
  address: () => { address: string; port: number } | string | null
  close?: (callback?: () => void) => unknown
  listen: (port: number, host: string, callback: () => void) => unknown
  on?: (event: string, handler: (...args: unknown[]) => void) => unknown
}

type TcpApi = {
  createConnection: (port: number, host: string) => DirectRoomPeer
  createServer: (handler: (socket: DirectRoomPeer) => void) => TcpServer
}

type DirectRoomTransport = {
  close: () => Promise<void> | void
  ready: Promise<DirectRoomEndpoint | null>
}

type DirectRoomTransportOptions = {
  addPeer?: (socket: DirectRoomPeer) => void
  advertisedHost?: string | null
  endpoint?: DirectRoomEndpoint | null
  listenHost?: string
  mode?: DirectRoomMode
  onEndpoint?: (endpoint: DirectRoomEndpoint) => void
  onError?: (error: Error) => void
  tcpApi?: TcpApi | null
}

export function createDirectRoomTransport({
  addPeer,
  endpoint = null,
  advertisedHost = null,
  listenHost = '0.0.0.0',
  mode,
  onEndpoint = () => {},
  onError = () => {},
  tcpApi = null
}: DirectRoomTransportOptions = {}): DirectRoomTransport {
  if (typeof addPeer !== 'function') {
    throw new Error('Direct transport peer handler is required')
  }

  if (mode === 'host') {
    return createHostTransport({
      addPeer,
      advertisedHost,
      listenHost,
      onEndpoint,
      onError,
      tcpApi: tcpApi || loadTcpApi()
    })
  }

  if (mode === 'guest') {
    return createGuestTransport({
      addPeer,
      endpoint,
      onError,
      tcpApi: tcpApi || loadTcpApi()
    })
  }

  return {
    ready: Promise.resolve(null),
    close: () => {}
  }
}

function loadTcpApi(): TcpApi {
  if (typeof require !== 'function') throw new Error('Direct transport TCP API is unavailable')
  return require('bare-tcp')
}

function createHostTransport({
  addPeer,
  advertisedHost,
  listenHost,
  onEndpoint,
  onError,
  tcpApi
}: {
  addPeer: (socket: DirectRoomPeer) => void
  advertisedHost: string | null
  listenHost: string
  onEndpoint: (endpoint: DirectRoomEndpoint) => void
  onError: (error: Error) => void
  tcpApi: TcpApi
}): DirectRoomTransport {
  const server = tcpApi.createServer((socket) => addPeer(socket))
  server.on?.('error', (error) => onError(toError(error)))

  const ready = new Promise<DirectRoomEndpoint>((resolve, reject) => {
    server.on?.('error', reject)
    server.listen(0, listenHost, () => {
      const address = server.address()
      const endpoint = {
        host: advertisedHost || getAddressHost(address),
        port: getAddressPort(address)
      }
      onEndpoint(endpoint)
      resolve(endpoint)
    })
  })

  return {
    ready,
    close: () => closeServer(server)
  }
}

function createGuestTransport({
  addPeer,
  endpoint,
  onError,
  tcpApi
}: {
  addPeer: (socket: DirectRoomPeer) => void
  endpoint: DirectRoomEndpoint | null
  onError: (error: Error) => void
  tcpApi: TcpApi
}): DirectRoomTransport {
  if (!endpoint?.host || !endpoint?.port) {
    return {
      ready: Promise.resolve(null),
      close: () => {}
    }
  }

  const socket = tcpApi.createConnection(endpoint.port, endpoint.host)
  socket.on?.('error', (error) => onError(toError(error)))

  const ready = new Promise<DirectRoomEndpoint | null>((resolve) => {
    socket.on?.('error', () => resolve(null))
    socket.on?.('connect', () => {
      addPeer(socket)
      resolve(endpoint)
    })
  })

  return {
    ready,
    close: () => closeSocket(socket)
  }
}

function closeServer(server: TcpServer): Promise<void> {
  return new Promise((resolve) => {
    if (!server.close) {
      resolve()
      return
    }

    server.close(() => resolve())
  })
}

function closeSocket(socket: DirectRoomPeer): Promise<void> {
  return new Promise((resolve) => {
    socket.on?.('close', () => resolve())
    socket.end?.()
    socket.destroy?.()
    setTimeout(resolve, 50)
  })
}

function getAddressHost(address: ReturnType<TcpServer['address']>): string {
  if (!address || typeof address === 'string') {
    throw new Error('Direct transport host address is unavailable')
  }

  return address.address
}

function getAddressPort(address: ReturnType<TcpServer['address']>): number {
  if (!address || typeof address === 'string') {
    throw new Error('Direct transport port is unavailable')
  }

  return address.port
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
