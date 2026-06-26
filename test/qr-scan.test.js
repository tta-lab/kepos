import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { applyDecodedQrPayload } from '../src/qr-scan.js'
import { createTrustState, isTrusted } from '../src/trust.js'

const PUBLIC_KEY_A = 'a'.repeat(64)
const PUBLIC_KEY_B = 'b'.repeat(64)

describe('QR scan model bridge', () => {
  test('trust invite scans create bidirectional trust', () => {
    const result = applyDecodedQrPayload({
      payload: {
        type: 'kepos.trust.invite.v1',
        profileId: PUBLIC_KEY_B
      },
      scannerProfileId: PUBLIC_KEY_A,
      trust: createTrustState()
    })

    assert.equal(result.kind, 'trust')
    assert.equal(isTrusted(result.trust, PUBLIC_KEY_A, PUBLIC_KEY_B), true)
    assert.equal(isTrusted(result.trust, PUBLIC_KEY_B, PUBLIC_KEY_A), true)
  })

  test('home address scans check access without creating trust', () => {
    const trust = createTrustState()
    const blocked = applyDecodedQrPayload({
      payload: {
        type: 'kepos.home.address.v1',
        ownerProfileId: PUBLIC_KEY_B,
        address: 'c'.repeat(64),
        roomKey: 'c'.repeat(64),
        policy: 'trusted_only'
      },
      scannerProfileId: PUBLIC_KEY_A,
      trust
    })
    const allowed = applyDecodedQrPayload({
      payload: {
        type: 'kepos.home.address.v1',
        ownerProfileId: PUBLIC_KEY_B,
        address: 'c'.repeat(64),
        roomKey: 'c'.repeat(64),
        policy: 'public'
      },
      scannerProfileId: PUBLIC_KEY_A,
      trust
    })

    assert.equal(blocked.kind, 'home')
    assert.equal(blocked.roomKey, 'c'.repeat(64))
    assert.equal(blocked.canEnter, false)
    assert.equal(allowed.canEnter, true)
    assert.equal(isTrusted(blocked.trust, PUBLIC_KEY_A, PUBLIC_KEY_B), false)
    assert.equal(isTrusted(allowed.trust, PUBLIC_KEY_A, PUBLIC_KEY_B), false)
  })
})
