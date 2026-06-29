import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createContactBook,
  getContact,
  isContactTrusted,
  revokeContact,
  trustContact
} from '../src/contact-book.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import { applySignedQrUriToContactBook } from '../src/signed-qr-scan.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'

describe('signed QR scan to ContactBook', () => {
  test('profile QR creates a trusted contact with local alias', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        identity: remote
      })
    )

    const result = applySignedQrUriToContactBook({
      alias: 'Ada',
      book,
      source: 'profile_qr',
      uri
    })

    assert.equal(result.kind, 'trust')
    assert.equal(result.profileId, remote.publicKey)
    assert.equal(isContactTrusted(result.book, remote.publicKey), true)
    assert.deepEqual(getContact(result.book, remote.publicKey), {
      profileId: remote.publicKey,
      aliases: ['Ada'],
      alias: 'Ada',
      displayNameSnapshot: 'Ada Lovelace',
      trustedAt: 1000,
      trustScope: 'home',
      source: 'profile_qr'
    })
  })

  test('profile QR creates a local owner-signed trust proof when identity is available', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        identity: remote
      })
    )

    const result = applySignedQrUriToContactBook({
      alias: 'Ada',
      book,
      localIdentity: scanner,
      now: 2000,
      source: 'profile_qr',
      uri
    })
    const contact = getContact(result.book, remote.publicKey)

    assert.equal(contact.trustedAt, 2000)
    assert.equal(contact.proof.signerProfileId, scanner.publicKey)
    assert.equal(contact.proof.type, 'kepos.trust.grant.v1')
  })

  test('profile QR falls back to signed display name as alias', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        identity: remote
      })
    )

    const result = applySignedQrUriToContactBook({
      book,
      uri
    })

    assert.equal(getContact(result.book, remote.publicKey).alias, 'Ada Lovelace')
  })

  test('profile QR display name refresh does not overwrite an existing local alias', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = trustContact(createContactBook({ ownerProfileId: scanner.publicKey }), {
      alias: 'Ada local',
      displayNameSnapshot: 'Ada Lovelace',
      profileId: remote.publicKey,
      trustedAt: 900
    })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Ada Remote',
        identity: remote
      })
    )

    const result = applySignedQrUriToContactBook({
      book,
      uri
    })

    assert.equal(result.kind, 'trust')
    assert.equal(getContact(result.book, remote.publicKey).alias, 'Ada local')
    assert.equal(getContact(result.book, remote.publicKey).displayNameSnapshot, 'Ada Remote')
    assert.deepEqual(getContact(result.book, remote.publicKey).aliases, ['Ada local'])
  })

  test('tampered profile QR is rejected before writing contacts', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const payload = createSignedTrustInvitePayload({
      createdAt: 1000,
      displayName: 'Ada Lovelace',
      identity: remote
    })
    const uri = encodeQrUri({
      ...payload,
      displayName: 'Mallory'
    })

    assert.throws(
      () =>
        applySignedQrUriToContactBook({
          book,
          uri
        }),
      /Invalid signed profile QR/
    )
    assert.equal(book.contactsByProfileId.size, 0)
  })

  test('expired profile QR is rejected before writing contacts', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        expiresAt: 1500,
        identity: remote
      })
    )

    assert.throws(
      () =>
        applySignedQrUriToContactBook({
          book,
          now: 1500,
          uri
        }),
      /Invalid signed profile QR/
    )
    assert.equal(book.contactsByProfileId.size, 0)
  })

  test('public home QR returns join data without creating trust', () => {
    const scanner = createSigningKeyPair()
    const owner = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        createdAt: 1000,
        identity: owner,
        policy: 'public',
        roomKey: 'd'.repeat(64)
      })
    )

    const result = applySignedQrUriToContactBook({
      book,
      localProfileId: scanner.publicKey,
      uri
    })

    assert.deepEqual(result, {
      address: 'c'.repeat(64),
      book,
      canEnter: true,
      kind: 'home',
      ownerProfileId: owner.publicKey,
      policy: 'public',
      roomKey: 'd'.repeat(64)
    })
    assert.equal(book.contactsByProfileId.size, 0)
  })

  test('trusted-only home QR requires local trust toward the owner before joining', () => {
    const scanner = createSigningKeyPair()
    const owner = createSigningKeyPair()
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        createdAt: 1000,
        identity: owner,
        policy: 'trusted_only',
        roomKey: 'd'.repeat(64)
      })
    )
    const untrustedBook = createContactBook({ ownerProfileId: scanner.publicKey })
    const trustedBook = trustContact(untrustedBook, {
      alias: 'Ada',
      profileId: owner.publicKey,
      trustedAt: 900
    })

    assert.equal(
      applySignedQrUriToContactBook({
        book: untrustedBook,
        localProfileId: scanner.publicKey,
        uri
      }).canEnter,
      false
    )
    assert.equal(
      applySignedQrUriToContactBook({
        book: trustedBook,
        localProfileId: scanner.publicKey,
        uri
      }).canEnter,
      true
    )
  })

  test('trusted-only home QR rejects revoked owners before joining', () => {
    const scanner = createSigningKeyPair()
    const owner = createSigningKeyPair()
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        createdAt: 1000,
        identity: owner,
        policy: 'trusted_only',
        roomKey: 'd'.repeat(64)
      })
    )
    const trustedBook = trustContact(createContactBook({ ownerProfileId: scanner.publicKey }), {
      alias: 'Ada',
      profileId: owner.publicKey,
      trustedAt: 900
    })
    const revokedBook = revokeContact(trustedBook, {
      profileId: owner.publicKey,
      revokedAt: 1100
    })

    assert.equal(
      applySignedQrUriToContactBook({
        book: revokedBook,
        localProfileId: scanner.publicKey,
        uri
      }).canEnter,
      false
    )
  })

  test('expired home QR is rejected before joining', () => {
    const scanner = createSigningKeyPair()
    const owner = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        createdAt: 1000,
        expiresAt: 1500,
        identity: owner,
        policy: 'public',
        roomKey: 'd'.repeat(64)
      })
    )

    assert.throws(
      () =>
        applySignedQrUriToContactBook({
          book,
          localProfileId: scanner.publicKey,
          now: 1500,
          uri
        }),
      /Invalid signed home QR/
    )
  })
})
