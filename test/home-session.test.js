import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createHomeJoinSession,
  createHomeJoinSessionFromAddress,
  createManualHomeJoinSession
} from '../src/home-session.ts'
import { createProfile } from '../src/profile.ts'

describe('home session binding', () => {
  test('owned home join session uses the profile home room transport key', () => {
    const identity = {
      publicKey: 'a'.repeat(64),
      secretKey: 'b'.repeat(128)
    }
    const profile = createProfile({
      displayName: 'Ada',
      identity
    })
    const join = createHomeJoinSession({
      nick: 'Ada',
      profile
    })

    assert.equal(join.ownerProfileId, identity.publicKey)
    assert.equal(join.profileId, identity.publicKey)
    assert.deepEqual(join.identity, identity)
    assert.equal(join.roomKey, profile.homeRoom.roomKey)
    assert.equal(join.address, profile.homeRoom.address)
    assert.equal(join.policy, profile.homeRoom.policy)
    assert.equal(join.session.roomKey, profile.homeRoom.roomKey)
    assert.equal(join.session.profileId, identity.publicKey)
  })

  test('manual home join keeps the 64-char key fallback with unknown owner', () => {
    const identity = {
      publicKey: 'c'.repeat(64),
      secretKey: 'd'.repeat(128)
    }
    const join = createManualHomeJoinSession({
      identity,
      nick: 'Neil',
      profileId: identity.publicKey,
      roomKey: 'b'.repeat(64)
    })

    assert.equal(join.ownerProfileId, null)
    assert.equal(join.profileId, identity.publicKey)
    assert.deepEqual(join.identity, identity)
    assert.equal(join.address, 'b'.repeat(64))
    assert.equal(join.roomKey, 'b'.repeat(64))
    assert.equal(join.policy, 'trusted_only')
    assert.equal(join.session.profileId, identity.publicKey)
  })

  test('signed home address join preserves owner and policy metadata', () => {
    const identity = {
      publicKey: 'c'.repeat(64),
      secretKey: 'd'.repeat(128)
    }
    const join = createHomeJoinSessionFromAddress({
      address: 'a'.repeat(64),
      identity,
      nick: 'Neil',
      ownerProfileId: 'b'.repeat(64),
      policy: 'public',
      profileId: identity.publicKey,
      roomKey: 'e'.repeat(64)
    })

    assert.equal(join.address, 'a'.repeat(64))
    assert.deepEqual(join.identity, identity)
    assert.equal(join.ownerProfileId, 'b'.repeat(64))
    assert.equal(join.policy, 'public')
    assert.equal(join.profileId, identity.publicKey)
    assert.equal(join.roomKey, 'e'.repeat(64))
    assert.equal(join.session.roomKey, 'e'.repeat(64))
  })
})
