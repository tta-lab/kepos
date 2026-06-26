import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import compact from 'compact-encoding'
import {
  createIdentityKeyPair,
  createIdentityKeyPairFromSeed,
  isIdentityKeyPair
} from '../src/identity.js'
import { createProfile } from '../src/profile.js'
import { createSignedRecord, verifySignedRecord } from '../src/signed-record.ts'

const identityProbeEncoding = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.value)
  },
  encode(state, payload) {
    compact.string.encode(state, payload.value)
  },
  decode(state) {
    return {
      value: compact.string.decode(state)
    }
  }
}

describe('identity key material', () => {
  test('generated identity has public and secret key-shaped hex strings', () => {
    const identity = createIdentityKeyPair()

    assert.match(identity.publicKey, /^[0-9a-f]{64}$/)
    assert.match(identity.secretKey, /^[0-9a-f]{128}$/)
    assert.notEqual(identity.publicKey, identity.secretKey)
    assert.equal(isIdentityKeyPair(identity), true)
  })

  test('generated identity can sign records under its profile id', () => {
    const identity = createIdentityKeyPair()
    const record = createSignedRecord({
      createdAt: 1000,
      identity,
      payload: {
        value: 'proof'
      },
      payloadEncoding: identityProbeEncoding,
      type: 'kepos.identity.probe',
      version: 1
    })

    assert.equal(record.signerProfileId, identity.publicKey)
    assert.equal(verifySignedRecord({ payloadEncoding: identityProbeEncoding, record }), true)
  })

  test('creates deterministic identity key pairs from secure random seed bytes', () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index)
    const first = createIdentityKeyPairFromSeed(seed)
    const second = createIdentityKeyPairFromSeed(seed)

    assert.deepEqual(first, second)
    assert.equal(isIdentityKeyPair(first), true)
  })

  test('rejects malformed identity seeds', () => {
    assert.throws(() => createIdentityKeyPairFromSeed(new Uint8Array(31)), /identity seed/i)
  })

  test('profile id is the identity public key', () => {
    const identity = {
      publicKey: 'a'.repeat(64),
      secretKey: 'b'.repeat(64)
    }
    const profile = createProfile({
      displayName: 'Ada',
      identity
    })

    assert.equal(profile.id, identity.publicKey)
    assert.deepEqual(profile.identity, identity)
    assert.equal(profile.homeRoom.ownerProfileId, identity.publicKey)
  })

  test('profile can be constructed from an existing identity key pair', () => {
    const profile = createProfile({
      identity: {
        publicKey: 'c'.repeat(64),
        secretKey: 'd'.repeat(128)
      }
    })

    assert.equal(profile.id, 'c'.repeat(64))
    assert.equal(profile.identity.publicKey, 'c'.repeat(64))
    assert.equal(profile.identity.secretKey, 'd'.repeat(128))
  })
})
