import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createHomeRoom, isHomePolicy } from '../src/home-room.js'
import { createProfile } from '../src/profile.js'
import {
  canEnterHome,
  createTrustState,
  isTrusted,
  trustProfilesBidirectional
} from '../src/trust.js'

const PUBLIC_KEY_A = 'a'.repeat(64)
const PUBLIC_KEY_B = 'b'.repeat(64)

describe('profile home model', () => {
  test('a profile owns one transport-addressable home room with trusted-only policy by default', () => {
    const profile = createProfile({
      identity: createIdentity(PUBLIC_KEY_A),
      displayName: 'Ada'
    })

    assert.equal(profile.id, PUBLIC_KEY_A)
    assert.equal(profile.displayName, 'Ada')
    assert.equal(profile.homeRoom.ownerProfileId, PUBLIC_KEY_A)
    assert.match(profile.homeRoom.address, /^[0-9a-f]{64}$/)
    assert.equal(profile.homeRoom.roomKey, profile.homeRoom.address)
    assert.equal(profile.homeRoom.policy, 'trusted_only')
  })

  test('home room binds owner profile to address, room key, and policy', () => {
    const room = createHomeRoom({
      ownerProfileId: PUBLIC_KEY_A,
      roomKey: 'c'.repeat(64),
      policy: 'public'
    })

    assert.deepEqual(room, {
      ownerProfileId: PUBLIC_KEY_A,
      address: 'c'.repeat(64),
      roomKey: 'c'.repeat(64),
      policy: 'public'
    })
    assert.equal(isHomePolicy('trusted_only'), true)
    assert.equal(isHomePolicy('public'), true)
    assert.equal(isHomePolicy('friends'), false)
  })

  test('home room creation requires an owner profile id', () => {
    assert.throws(
      () =>
        createHomeRoom({
          roomKey: 'c'.repeat(64)
        }),
      /Home owner profile id is required/
    )
  })

  test('a profile can be reconstructed with its existing home room key', () => {
    const profile = createProfile({
      identity: createIdentity(PUBLIC_KEY_A),
      homeRoomKey: 'c'.repeat(64)
    })

    assert.equal(profile.homeRoom.ownerProfileId, PUBLIC_KEY_A)
    assert.equal(profile.homeRoom.address, 'c'.repeat(64))
    assert.equal(profile.homeRoom.roomKey, 'c'.repeat(64))
  })
})

function createIdentity(publicKey) {
  return {
    publicKey,
    secretKey: 'd'.repeat(128)
  }
}

describe('home trust access', () => {
  test('person QR trust creates bidirectional access between identity public keys', () => {
    const trust = trustProfilesBidirectional(createTrustState(), PUBLIC_KEY_A, PUBLIC_KEY_B)

    assert.equal(isTrusted(trust, PUBLIC_KEY_A, PUBLIC_KEY_B), true)
    assert.equal(isTrusted(trust, PUBLIC_KEY_B, PUBLIC_KEY_A), true)
    assert.equal(
      canEnterHome({
        ownerProfileId: PUBLIC_KEY_A,
        viewerProfileId: PUBLIC_KEY_B,
        policy: 'trusted_only',
        trust
      }),
      true
    )
  })

  test('trusted-only homes reject untrusted viewers and public homes allow address holders', () => {
    const trust = createTrustState()

    assert.equal(
      canEnterHome({
        ownerProfileId: PUBLIC_KEY_A,
        viewerProfileId: PUBLIC_KEY_B,
        policy: 'trusted_only',
        trust
      }),
      false
    )
    assert.equal(
      canEnterHome({
        ownerProfileId: PUBLIC_KEY_A,
        viewerProfileId: PUBLIC_KEY_B,
        policy: 'public',
        trust
      }),
      true
    )
  })
})
