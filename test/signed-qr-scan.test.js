import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  createContactBook,
  getContact,
  isContactTrusted,
  revokeContact,
  trustContact
} from '../src/contact-book.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import {
  applySignedQrUriToContactBook,
  readTrustedContactHomeDescriptor,
  readSignedProfileQrRequestTarget
} from '../src/signed-qr-scan.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'

describe('signed QR scan to ContactBook', () => {
  test('profile QR can be read as a friend request target without trusting the contact', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const homeDescriptor = createSignedHomeAddressPayload({
      address: 'c'.repeat(64),
      createdAt: 1001,
      identity: remote,
      policy: 'trusted_only',
      roomKey: 'd'.repeat(64)
    })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        avatarUri: 'kepos://avatar/ada',
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        homeDescriptor,
        identity: remote
      })
    )

    const result = readSignedProfileQrRequestTarget({ uri })

    assert.deepEqual(result, {
      createdAt: 1000,
      avatarUri: 'kepos://avatar/ada',
      displayName: 'Ada Lovelace',
      homeDescriptor,
      kind: 'profile_request_target',
      profileId: remote.publicKey
    })
    assert.equal(isContactTrusted(book, remote.publicKey), false)
    assert.equal(book.contactsByProfileId.size, 0)
  })

  test('profile QR request target carries signed avatar media metadata', () => {
    const remote = createSigningKeyPair()
    const avatarMedia = createAvatarMediaReference({
      bytes: Uint8Array.from([1, 2, 3]),
      createdAt: 1002,
      mimeType: 'image/webp',
      sha256Hex: () => 'b'.repeat(64)
    })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        avatarMedia,
        avatarUri: avatarMedia.uri,
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        identity: remote
      })
    )

    const result = readSignedProfileQrRequestTarget({ uri })

    assert.deepEqual(result.avatarMediaSnapshot, avatarMedia)
    assert.equal(result.avatarUri, avatarMedia.uri)
  })

  test('profile request target rejects signed home QR', () => {
    const remote = createSigningKeyPair()
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        identity: remote,
        roomKey: 'd'.repeat(64)
      })
    )

    assert.throws(() => readSignedProfileQrRequestTarget({ uri }), /profile QR is required/i)
  })

  test('profile QR creates a trusted contact with local alias', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        avatarUri: 'kepos://avatar/ada',
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
      avatarUriSnapshot: 'kepos://avatar/ada',
      displayNameSnapshot: 'Ada Lovelace',
      profileSnapshots: [
        {
          avatarUriSnapshot: 'kepos://avatar/ada',
          capturedAt: 1000,
          displayNameSnapshot: 'Ada Lovelace',
          profileId: remote.publicKey,
          source: 'profile_qr',
          version: 1
        }
      ],
      trustedAt: 1000,
      trustScope: 'home',
      source: 'profile_qr'
    })
  })

  test('profile QR stores signed avatar media metadata on the trusted contact', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const avatarMedia = createAvatarMediaReference({
      bytes: Uint8Array.from([1, 2, 3]),
      createdAt: 1002,
      mimeType: 'image/jpeg',
      sha256Hex: () => 'c'.repeat(64)
    })
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        avatarMedia,
        avatarUri: avatarMedia.uri,
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        identity: remote
      })
    )

    const result = applySignedQrUriToContactBook({
      book,
      uri
    })

    assert.equal(result.kind, 'trust')
    assert.deepEqual(getContact(result.book, remote.publicKey).avatarMediaSnapshot, avatarMedia)
    assert.equal(getContact(result.book, remote.publicKey).avatarUriSnapshot, avatarMedia.uri)
  })

  test('trusted profile QR stores and refreshes the profile-owned Home descriptor', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = trustContact(createContactBook({ ownerProfileId: scanner.publicKey }), {
      alias: 'Ada local',
      profileId: remote.publicKey,
      trustedAt: 900
    })
    const homeDescriptor = createSignedHomeAddressPayload({
      address: 'c'.repeat(64),
      createdAt: 1001,
      identity: remote,
      policy: 'trusted_only',
      roomKey: 'd'.repeat(64)
    })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Ada Lovelace',
        homeDescriptor,
        identity: remote
      })
    )

    const result = applySignedQrUriToContactBook({
      book,
      localProfileId: scanner.publicKey,
      uri
    })

    assert.equal(result.kind, 'trust')
    assert.deepEqual(
      readTrustedContactHomeDescriptor({ book: result.book, profileId: remote.publicKey }),
      {
        address: 'c'.repeat(64),
        ownerProfileId: remote.publicKey,
        policy: 'trusted_only',
        roomKey: 'd'.repeat(64)
      }
    )
    assert.equal(getContact(result.book, remote.publicKey).alias, 'Ada local')
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

  test('tampered profile QR avatar is rejected before writing contacts', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const payload = createSignedTrustInvitePayload({
      avatarUri: 'kepos://avatar/ada',
      createdAt: 1000,
      displayName: 'Ada Lovelace',
      identity: remote
    })
    const uri = encodeQrUri({
      ...payload,
      avatarUri: 'kepos://avatar/mallory'
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

  test('tampered profile QR avatar media metadata is rejected before writing contacts', () => {
    const scanner = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const avatarMedia = createAvatarMediaReference({
      bytes: Uint8Array.from([1, 2, 3]),
      createdAt: 1002,
      mimeType: 'image/png',
      sha256Hex: () => 'd'.repeat(64)
    })
    const book = createContactBook({ ownerProfileId: scanner.publicKey })
    const payload = createSignedTrustInvitePayload({
      avatarMedia,
      avatarUri: avatarMedia.uri,
      createdAt: 1000,
      displayName: 'Ada Lovelace',
      identity: remote
    })
    const uri = encodeQrUri({
      ...payload,
      avatarMedia: {
        ...avatarMedia,
        digest: 'e'.repeat(64),
        uri: `kepos://avatar/sha256/${'e'.repeat(64)}`
      }
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

  test('trusted-only home QR stores a descriptor only for an already trusted owner', () => {
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

    const untrustedResult = applySignedQrUriToContactBook({
      book: untrustedBook,
      localProfileId: scanner.publicKey,
      uri
    })
    const trustedResult = applySignedQrUriToContactBook({
      book: trustedBook,
      localProfileId: scanner.publicKey,
      uri
    })

    assert.equal(getContact(untrustedResult.book, owner.publicKey), null)
    assert.deepEqual(getContact(trustedResult.book, owner.publicKey), {
      alias: 'Ada',
      aliases: ['Ada'],
      homeAddress: 'c'.repeat(64),
      homePolicy: 'trusted_only',
      homeRoomKey: 'd'.repeat(64),
      profileId: owner.publicKey,
      proof: createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        createdAt: 1000,
        identity: owner,
        policy: 'trusted_only',
        roomKey: 'd'.repeat(64)
      }).proof,
      trustedAt: 900,
      trustScope: 'home'
    })
  })

  test('saved trusted contact descriptor must still be trusted and signed by the owner', () => {
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
    const savedBook = applySignedQrUriToContactBook({
      book: trustedBook,
      localProfileId: scanner.publicKey,
      uri
    }).book

    assert.deepEqual(
      readTrustedContactHomeDescriptor({ book: savedBook, profileId: owner.publicKey }),
      {
        address: 'c'.repeat(64),
        ownerProfileId: owner.publicKey,
        policy: 'trusted_only',
        roomKey: 'd'.repeat(64)
      }
    )

    const tamperedBook = structuredClone(savedBook)
    tamperedBook.contactsByProfileId.get(owner.publicKey).homeRoomKey = 'e'.repeat(64)
    assert.throws(
      () => readTrustedContactHomeDescriptor({ book: tamperedBook, profileId: owner.publicKey }),
      /Invalid saved Home descriptor/
    )

    const revokedBook = revokeContact(savedBook, {
      profileId: owner.publicKey,
      revokedAt: 1100
    })
    assert.throws(
      () => readTrustedContactHomeDescriptor({ book: revokedBook, profileId: owner.publicKey }),
      /Trusted contact/
    )
  })

  test('saved trusted contact descriptor preserves expiration for later verification', () => {
    const scanner = createSigningKeyPair()
    const owner = createSigningKeyPair()
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        createdAt: 1000,
        expiresAt: 1500,
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

    const savedBook = applySignedQrUriToContactBook({
      book: trustedBook,
      localProfileId: scanner.publicKey,
      now: 1200,
      uri
    }).book

    assert.equal(getContact(savedBook, owner.publicKey).homeExpiresAt, 1500)
    assert.equal(
      readTrustedContactHomeDescriptor({
        book: savedBook,
        now: 1499,
        profileId: owner.publicKey
      }).roomKey,
      'd'.repeat(64)
    )
    assert.throws(
      () =>
        readTrustedContactHomeDescriptor({
          book: savedBook,
          now: 1500,
          profileId: owner.publicKey
        }),
      /Invalid saved Home descriptor/
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
