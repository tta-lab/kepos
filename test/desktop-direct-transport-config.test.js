import assert from 'node:assert/strict'
import test from 'node:test'
import { getDesktopDirectTransportConfig } from '../src/desktop-direct-transport-config.ts'

test('desktop direct transport config enables host listener from env', () => {
  assert.deepEqual(
    getDesktopDirectTransportConfig({
      env: {
        KEPOS_DIRECT_ADVERTISED_HOST: '192.168.1.203',
        KEPOS_DIRECT_LISTEN_HOST: '0.0.0.0'
      },
      mode: 'host'
    }),
    {
      advertisedHost: '192.168.1.203',
      listenHost: '0.0.0.0',
      mode: 'host'
    }
  )
})

test('desktop direct transport config stays off without advertised host or peer mode', () => {
  assert.equal(
    getDesktopDirectTransportConfig({
      env: { KEPOS_DIRECT_LISTEN_HOST: '0.0.0.0' },
      mode: 'host'
    }),
    null
  )
  assert.equal(
    getDesktopDirectTransportConfig({
      env: { KEPOS_DIRECT_ADVERTISED_HOST: '192.168.1.203' },
      mode: 'peer'
    }),
    null
  )
})
