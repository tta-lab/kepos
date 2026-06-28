export function createDirectRoomTransport({
  addPeer,
  endpoint = null,
  advertisedHost = null,
  listenHost = '0.0.0.0',
  mode,
  onEndpoint = () => {},
  onError = () => {},
  tcpApi = null
} = {}) {
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

function loadTcpApi() {
  const require = Function('return typeof require === "function" ? require : null')()
  if (!require) throw new Error('Direct transport TCP API is unavailable')
  return require('bare-tcp')
}

function createHostTransport({ addPeer, advertisedHost, listenHost, onEndpoint, onError, tcpApi }) {
  const server = tcpApi.createServer((socket) => addPeer(socket))
  server.on?.('error', onError)

  const ready = new Promise((resolve, reject) => {
    server.on?.('error', reject)
    server.listen(0, listenHost, () => {
      const address = server.address()
      const endpoint = {
        host: advertisedHost || address.address,
        port: address.port
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

function createGuestTransport({ addPeer, endpoint, onError, tcpApi }) {
  if (!endpoint?.host || !endpoint?.port) {
    return {
      ready: Promise.resolve(null),
      close: () => {}
    }
  }

  const socket = tcpApi.createConnection(endpoint.port, endpoint.host)
  socket.on?.('error', onError)

  const ready = new Promise((resolve) => {
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

function closeServer(server) {
  return new Promise((resolve) => {
    server.close?.(() => resolve())
  })
}

function closeSocket(socket) {
  return new Promise((resolve) => {
    socket.on?.('close', resolve)
    socket.end?.()
    socket.destroy?.()
    setTimeout(resolve, 50)
  })
}
