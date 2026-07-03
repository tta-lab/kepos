import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { decodeQrPayload, encodeQrPayload } from '../src/qr-payload.ts'

const PUBLIC_KEY_A = 'a'.repeat(64)

describe('QR payloads', () => {
  test('encodes and decodes person trust invites with identity public key profile ids', () => {
    const encoded = encodeQrPayload({
      type: 'kepos.trust.invite.v1',
      profileId: PUBLIC_KEY_A
    })

    assert.deepEqual(decodeQrPayload(encoded), {
      type: 'kepos.trust.invite.v1',
      profileId: PUBLIC_KEY_A
    })
  })

  test('encodes and decodes home addresses without implying trust', () => {
    const encoded = encodeQrPayload({
      type: 'kepos.home.address.v1',
      ownerProfileId: PUBLIC_KEY_A,
      address: 'c'.repeat(64),
      roomKey: 'c'.repeat(64),
      policy: 'public'
    })

    assert.deepEqual(decodeQrPayload(encoded), {
      type: 'kepos.home.address.v1',
      ownerProfileId: PUBLIC_KEY_A,
      address: 'c'.repeat(64),
      roomKey: 'c'.repeat(64),
      policy: 'public'
    })
  })

  test('home address payloads default to trusted-only policy and use address as room key', () => {
    const encoded = encodeQrPayload({
      type: 'kepos.home.address.v1',
      ownerProfileId: PUBLIC_KEY_A,
      address: 'b'.repeat(64)
    })

    assert.deepEqual(decodeQrPayload(encoded), {
      type: 'kepos.home.address.v1',
      ownerProfileId: PUBLIC_KEY_A,
      address: 'b'.repeat(64),
      roomKey: 'b'.repeat(64),
      policy: 'trusted_only'
    })
  })

  test('rejects malformed and unsupported QR payloads', () => {
    assert.throws(() => decodeQrPayload('not json'), /Invalid QR payload/)
    assert.throws(
      () =>
        encodeQrPayload({
          type: 'kepos.home.address.v1',
          ownerProfileId: PUBLIC_KEY_A,
          address: 'c'.repeat(64),
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
