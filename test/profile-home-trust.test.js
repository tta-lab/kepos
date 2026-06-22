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

describe('profile home model', () => {
  test('a profile owns one home room with trusted-only policy by default', () => {
    const profile = createProfile({
      id: 'profile-a',
      displayName: 'Ada'
    })

    assert.equal(profile.id, 'profile-a')
    assert.equal(profile.displayName, 'Ada')
    assert.deepEqual(profile.homeRoom, {
      ownerProfileId: 'profile-a',
      address: 'profile-a',
      policy: 'trusted_only'
    })
  })

  test('home room belongs to its owner profile and validates policy', () => {
    const room = createHomeRoom({
      ownerProfileId: 'profile-a',
      address: 'home-a',
      policy: 'public'
    })

    assert.deepEqual(room, {
      ownerProfileId: 'profile-a',
      address: 'home-a',
      policy: 'public'
    })
    assert.equal(isHomePolicy('trusted_only'), true)
    assert.equal(isHomePolicy('public'), true)
    assert.equal(isHomePolicy('friends'), false)
  })
})

describe('home trust access', () => {
  test('person QR trust creates bidirectional home access', () => {
    const trust = trustProfilesBidirectional(createTrustState(), 'profile-a', 'profile-b')

    assert.equal(isTrusted(trust, 'profile-a', 'profile-b'), true)
    assert.equal(isTrusted(trust, 'profile-b', 'profile-a'), true)
    assert.equal(
      canEnterHome({
        ownerProfileId: 'profile-a',
        viewerProfileId: 'profile-b',
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
        ownerProfileId: 'profile-a',
        viewerProfileId: 'profile-b',
        policy: 'trusted_only',
        trust
      }),
      false
    )
    assert.equal(
      canEnterHome({
        ownerProfileId: 'profile-a',
        viewerProfileId: 'profile-b',
        policy: 'public',
        trust
      }),
      true
    )
  })
})
