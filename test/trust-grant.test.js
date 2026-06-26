import assert from 'node:assert/strict'
import test from 'node:test'

import { createContactBook, getContact } from '../src/contact-book.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import {
  applyTrustGrantToContactBook,
  createTrustGrant,
  verifyTrustGrant
} from '../src/trust-grant.ts'

test('trust grants are signed by the owner identity', () => {
  const owner = createSigningKeyPair()
  const trusted = createSigningKeyPair()
  const grant = createTrustGrant({
    createdAt: 1000,
    ownerIdentity: owner,
    trustedProfileId: trusted.publicKey
  })

  assert.equal(grant.ownerProfileId, owner.publicKey)
  assert.equal(grant.trustedProfileId, trusted.publicKey)
  assert.equal(grant.scope, 'home')
  assert.equal(verifyTrustGrant(grant), true)
})

test('trust grants fail verification when payload is tampered', () => {
  const owner = createSigningKeyPair()
  const trusted = createSigningKeyPair()
  const grant = createTrustGrant({
    createdAt: 1000,
    ownerIdentity: owner,
    trustedProfileId: trusted.publicKey
  })

  assert.equal(
    verifyTrustGrant({
      ...grant,
      trustedProfileId: createSigningKeyPair().publicKey
    }),
    false
  )
})

test('trust grants can be stored as contact proof', () => {
  const owner = createSigningKeyPair()
  const trusted = createSigningKeyPair()
  const grant = createTrustGrant({
    createdAt: 1000,
    ownerIdentity: owner,
    trustedProfileId: trusted.publicKey
  })
  const book = createContactBook({ ownerProfileId: owner.publicKey })
  const next = applyTrustGrantToContactBook(book, {
    alias: 'Ada',
    grant
  })

  assert.equal(verifyTrustGrant(grant), true)
  assert.deepEqual(getContact(next, trusted.publicKey).proof, grant.proof)
})

test('tampered trust grants cannot be applied to a contact book', () => {
  const owner = createSigningKeyPair()
  const trusted = createSigningKeyPair()
  const grant = createTrustGrant({
    createdAt: 1000,
    ownerIdentity: owner,
    trustedProfileId: trusted.publicKey
  })
  const book = createContactBook({ ownerProfileId: owner.publicKey })

  assert.throws(
    () =>
      applyTrustGrantToContactBook(book, {
        alias: 'Ada',
        grant: {
          ...grant,
          trustedProfileId: createSigningKeyPair().publicKey
        }
      }),
    /Invalid trust grant/
  )
})
