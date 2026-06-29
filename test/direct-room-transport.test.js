import assert from 'node:assert/strict'
import { once } from 'node:events'
import net from 'node:net'
import test from 'node:test'
import { createDirectRoomTransport } from '../src/direct-room-transport.ts'

test('direct room transport connects a guest socket to a host listener', async () => {
  const hostPeers = []
  const guestPeers = []
  let endpoint = null

  const host = createDirectRoomTransport({
    addPeer: (socket) => hostPeers.push(socket),
    listenHost: '127.0.0.1',
    mode: 'host',
    onEndpoint: (nextEndpoint) => {
      endpoint = nextEndpoint
    },
    tcpApi: net
  })
  await host.ready

  assert.equal(endpoint.host, '127.0.0.1')
  assert.equal(Number.isInteger(endpoint.port), true)

  const guest = createDirectRoomTransport({
    addPeer: (socket) => guestPeers.push(socket),
    endpoint,
    mode: 'guest',
    tcpApi: net
  })
  await guest.ready
  while (hostPeers.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  guestPeers[0].write('hello\n')
  const [chunk] = await once(hostPeers[0], 'data')

  assert.equal(chunk.toString(), 'hello\n')

  await guest.close()
  await host.close()
})

test('direct room transport reports advertised host for host listeners', async () => {
  let endpoint = null
  const host = createDirectRoomTransport({
    addPeer: () => {},
    advertisedHost: '192.168.1.203',
    listenHost: '127.0.0.1',
    mode: 'host',
    onEndpoint: (nextEndpoint) => {
      endpoint = nextEndpoint
    },
    tcpApi: net
  })
  await host.ready

  try {
    assert.equal(endpoint.host, '192.168.1.203')
    assert.equal(Number.isInteger(endpoint.port), true)
  } finally {
    await host.close()
  }
})

test('direct room transport reports guest connection errors without rejecting ready', async () => {
  const errors = []
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const endpoint = server.address()
  await new Promise((resolve) => server.close(resolve))

  const guest = createDirectRoomTransport({
    addPeer: () => {},
    endpoint: { host: '127.0.0.1', port: endpoint.port },
    mode: 'guest',
    onError: (error) => errors.push(error),
    tcpApi: net
  })

  assert.equal(await guest.ready, null)
  assert.equal(errors.length > 0, true)

  await guest.close()
})
