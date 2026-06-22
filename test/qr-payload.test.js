import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { decodeQrPayload, encodeQrPayload } from '../src/qr-payload.js'

describe('QR payloads', () => {
  test('encodes and decodes person trust invites', () => {
    const encoded = encodeQrPayload({
      type: 'kepos.trust.invite.v1',
      profileId: 'profile-a'
    })

    assert.deepEqual(decodeQrPayload(encoded), {
      type: 'kepos.trust.invite.v1',
      profileId: 'profile-a'
    })
  })

  test('encodes and decodes home addresses without implying trust', () => {
    const encoded = encodeQrPayload({
      type: 'kepos.home.address.v1',
      ownerProfileId: 'profile-a',
      address: 'home-a',
      policy: 'public'
    })

    assert.deepEqual(decodeQrPayload(encoded), {
      type: 'kepos.home.address.v1',
      ownerProfileId: 'profile-a',
      address: 'home-a',
      policy: 'public'
    })
  })

  test('home address payloads default to trusted-only policy', () => {
    const encoded = encodeQrPayload({
      type: 'kepos.home.address.v1',
      ownerProfileId: 'profile-a',
      address: 'home-a'
    })

    assert.deepEqual(decodeQrPayload(encoded), {
      type: 'kepos.home.address.v1',
      ownerProfileId: 'profile-a',
      address: 'home-a',
      policy: 'trusted_only'
    })
  })

  test('rejects malformed and unsupported QR payloads', () => {
    assert.throws(() => decodeQrPayload('not json'), /Invalid QR payload/)
    assert.throws(
      () =>
        encodeQrPayload({
          type: 'kepos.home.address.v1',
          ownerProfileId: 'profile-a',
          address: 'home-a',
          policy: 'friends'
        }),
      /Invalid home policy/
    )
    assert.throws(
      () =>
        encodeQrPayload({
          type: 'kepos.room.key.v1',
          key: 'a'.repeat(64)
        }),
      /Unsupported QR payload/
    )
  })
})
