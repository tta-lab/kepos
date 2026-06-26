import assert from 'node:assert/strict'
import test from 'node:test'

import { runCompatibilityProbes } from '../src/compatibility-probes.js'

test('compatibility probes cover signing encoding and sealed boxes', () => {
  const result = runCompatibilityProbes()

  assert.equal(result.signing.verified, true)
  assert.match(result.signing.publicKey, /^[0-9a-f]{64}$/)
  assert.match(result.signing.signature, /^[0-9a-f]{128}$/)

  assert.equal(result.encoding.roundTrip.type, 'kepos.probe.v1')
  assert.equal(result.encoding.roundTrip.signerProfileId, result.signing.publicKey)
  assert.match(result.encoding.encodedHex, /^[0-9a-f]+$/)

  assert.equal(result.sealedBox.decrypted, 'kepos sealed box probe')
  assert.equal(result.transport.dmTopicBytes, 32)
})
