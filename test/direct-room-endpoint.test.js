import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDirectRoomEndpoint } from '../src/direct-room-endpoint.ts'

test('direct room endpoint parser accepts host and port', () => {
  assert.deepEqual(parseDirectRoomEndpoint('192.168.1.203:40123'), {
    host: '192.168.1.203',
    port: 40123
  })
})

test('direct room endpoint parser ignores blank values and rejects invalid ports', () => {
  assert.equal(parseDirectRoomEndpoint('   '), null)
  assert.throws(() => parseDirectRoomEndpoint('192.168.1.203:not-a-port'), /valid host:port/)
  assert.throws(() => parseDirectRoomEndpoint('192.168.1.203:70000'), /valid host:port/)
})
