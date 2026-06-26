import assert from 'node:assert/strict'
import test from 'node:test'
import compact from 'compact-encoding'

import {
  createSigningKeyPair,
  createSignedRecord,
  verifySignedRecord
} from '../src/signed-record.ts'

const probePayloadEncoding = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.subjectProfileId)
    compact.string.preencode(state, payload.scope)
  },
  encode(state, payload) {
    compact.string.encode(state, payload.subjectProfileId)
    compact.string.encode(state, payload.scope)
  },
  decode(state) {
    return {
      subjectProfileId: compact.string.decode(state),
      scope: compact.string.decode(state)
    }
  }
}

test('signed records verify against the signer public key', () => {
  const identity = createSigningKeyPair()
  const record = createSignedRecord({
    createdAt: 1000,
    identity,
    payload: {
      subjectProfileId: 'b'.repeat(64),
      scope: 'home'
    },
    payloadEncoding: probePayloadEncoding,
    type: 'kepos.trust.grant',
    version: 1
  })

  assert.equal(record.signerProfileId, identity.publicKey)
  assert.match(record.signature, /^[0-9a-f]{128}$/)
  assert.equal(verifySignedRecord({ payloadEncoding: probePayloadEncoding, record }), true)
})

test('signed records fail verification after payload tampering', () => {
  const identity = createSigningKeyPair()
  const record = createSignedRecord({
    createdAt: 1000,
    identity,
    payload: {
      subjectProfileId: 'b'.repeat(64),
      scope: 'home'
    },
    payloadEncoding: probePayloadEncoding,
    type: 'kepos.trust.grant',
    version: 1
  })

  const tampered = {
    ...record,
    payload: {
      ...record.payload,
      scope: 'dm'
    }
  }

  assert.equal(
    verifySignedRecord({ payloadEncoding: probePayloadEncoding, record: tampered }),
    false
  )
})

test('signed records fail verification when signer does not match signature', () => {
  const identity = createSigningKeyPair()
  const otherIdentity = createSigningKeyPair()
  const record = createSignedRecord({
    createdAt: 1000,
    identity,
    payload: {
      subjectProfileId: 'b'.repeat(64),
      scope: 'home'
    },
    payloadEncoding: probePayloadEncoding,
    type: 'kepos.trust.grant',
    version: 1
  })

  assert.equal(
    verifySignedRecord({
      payloadEncoding: probePayloadEncoding,
      record: {
        ...record,
        signerProfileId: otherIdentity.publicKey
      }
    }),
    false
  )
})
