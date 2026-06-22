import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { applyDecodedQrPayload } from '../src/qr-scan.js'
import { createTrustState, isTrusted } from '../src/trust.js'

describe('QR scan model bridge', () => {
  test('trust invite scans create bidirectional trust', () => {
    const result = applyDecodedQrPayload({
      payload: {
        type: 'kepos.trust.invite.v1',
        profileId: 'profile-b'
      },
      scannerProfileId: 'profile-a',
      trust: createTrustState()
    })

    assert.equal(result.kind, 'trust')
    assert.equal(isTrusted(result.trust, 'profile-a', 'profile-b'), true)
    assert.equal(isTrusted(result.trust, 'profile-b', 'profile-a'), true)
  })

  test('home address scans check access without creating trust', () => {
    const trust = createTrustState()
    const blocked = applyDecodedQrPayload({
      payload: {
        type: 'kepos.home.address.v1',
        ownerProfileId: 'profile-b',
        address: 'home-b',
        policy: 'trusted_only'
      },
      scannerProfileId: 'profile-a',
      trust
    })
    const allowed = applyDecodedQrPayload({
      payload: {
        type: 'kepos.home.address.v1',
        ownerProfileId: 'profile-b',
        address: 'home-b',
        policy: 'public'
      },
      scannerProfileId: 'profile-a',
      trust
    })

    assert.equal(blocked.kind, 'home')
    assert.equal(blocked.canEnter, false)
    assert.equal(allowed.canEnter, true)
    assert.equal(isTrusted(blocked.trust, 'profile-a', 'profile-b'), false)
    assert.equal(isTrusted(allowed.trust, 'profile-a', 'profile-b'), false)
  })
})
