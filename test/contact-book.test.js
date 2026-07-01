import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  acceptMessageRequest,
  allowContactRequests,
  canAcceptDmInviteFromContactBook,
  canContactAccessHome,
  canContactSeePresence,
  canSendMessageRequest,
  acceptOutgoingFriendRequest,
  createContactBook,
  createTreeholePolicyFromContactBook,
  deserializeContactBook,
  getContact,
  ignoreMessageRequest,
  isContactTrusted,
  listTrustedContacts,
  recordOutgoingFriendRequest,
  recordMessageRequest,
  revokeContact,
  serializeContactBook,
  trustContact,
  upsertContact
} from '../src/contact-book.ts'

describe('contact book', () => {
  test('contact books are local to one owner profile', () => {
    const book = createContactBook({ ownerProfileId: ' owner-a ' })

    assert.equal(book.ownerProfileId, 'owner-a')
    assert.deepEqual(book.contactsByProfileId, new Map())
    assert.deepEqual(book.pendingRequestsByProfileId, new Map())
    assert.deepEqual(book.outgoingRequestsByProfileId, new Map())
  })

  test('contacts require a profile id and alias or display name snapshot', () => {
    const book = createContactBook({ ownerProfileId: 'owner-a' })

    assert.throws(
      () =>
        upsertContact(book, {
          profileId: 'profile-b'
        }),
      /Contact alias or display name is required/
    )
    assert.throws(
      () =>
        upsertContact(book, {
          alias: 'Ada'
        }),
      /Contact profile id is required/
    )
  })

  test('upserting a contact trims values and does not mutate the input book', () => {
    const book = createContactBook({ ownerProfileId: 'owner-a' })

    const next = upsertContact(book, {
      profileId: ' profile-b ',
      alias: ' Ada ',
      avatarUriSnapshot: ' kepos://avatar/profile-b ',
      displayNameSnapshot: ' Ada Lovelace ',
      source: 'qr'
    })

    assert.equal(book.contactsByProfileId.size, 0)
    assert.deepEqual(getContact(next, 'profile-b'), {
      profileId: 'profile-b',
      aliases: ['Ada'],
      alias: 'Ada',
      avatarUriSnapshot: 'kepos://avatar/profile-b',
      displayNameSnapshot: 'Ada Lovelace',
      source: 'qr'
    })
  })

  test('upserting a second alias keeps prior aliases', () => {
    const book = upsertContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada'
    })

    const next = upsertContact(book, {
      profileId: 'profile-b',
      alias: 'A.'
    })

    assert.deepEqual(getContact(next, 'profile-b').aliases, ['Ada', 'A.'])
    assert.equal(getContact(next, 'profile-b').alias, 'A.')
  })

  test('remote display name updates do not overwrite local alias', () => {
    const book = upsertContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada local',
      displayNameSnapshot: 'Ada Lovelace'
    })

    const next = upsertContact(book, {
      profileId: 'profile-b',
      displayNameSnapshot: 'Ada Remote'
    })

    assert.equal(getContact(next, 'profile-b').alias, 'Ada local')
    assert.equal(getContact(next, 'profile-b').displayNameSnapshot, 'Ada Remote')
    assert.deepEqual(getContact(next, 'profile-b').aliases, ['Ada local'])
  })

  test('explicit local alias updates still replace the active alias', () => {
    const book = upsertContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada local',
      displayNameSnapshot: 'Ada Lovelace'
    })

    const next = upsertContact(book, {
      profileId: 'profile-b',
      alias: 'Ada chosen',
      displayNameSnapshot: 'Ada Remote'
    })

    assert.equal(getContact(next, 'profile-b').alias, 'Ada chosen')
    assert.equal(getContact(next, 'profile-b').displayNameSnapshot, 'Ada Remote')
    assert.deepEqual(getContact(next, 'profile-b').aliases, ['Ada local', 'Ada chosen'])
  })

  test('trusting a contact records V1 home trust and access', () => {
    const book = createContactBook({ ownerProfileId: 'owner-a' })

    const next = trustContact(book, {
      profileId: 'profile-b',
      alias: 'Ada',
      displayNameSnapshot: 'Ada Lovelace',
      homeAddress: 'home-b',
      homePolicy: 'trusted_only',
      trustedAt: 1000,
      proof: { type: 'qr' },
      source: 'person_qr'
    })

    assert.deepEqual(getContact(next, 'profile-b'), {
      profileId: 'profile-b',
      aliases: ['Ada'],
      alias: 'Ada',
      displayNameSnapshot: 'Ada Lovelace',
      homeAddress: 'home-b',
      homePolicy: 'trusted_only',
      trustedAt: 1000,
      trustScope: 'home',
      source: 'person_qr',
      profileSnapshots: [
        {
          capturedAt: 1000,
          displayNameSnapshot: 'Ada Lovelace',
          profileId: 'profile-b',
          source: 'person_qr',
          version: 1
        }
      ],
      proof: { type: 'qr' }
    })
    assert.equal(isContactTrusted(next, 'profile-b'), true)
    assert.equal(canContactAccessHome(next, 'profile-b'), true)
    assert.equal(canContactSeePresence(next, 'profile-b'), true)
  })

  test('avatar media snapshots survive trust storage and trusted contact listing', () => {
    const avatarMediaSnapshot = createAvatarMediaReference({
      bytes: new Uint8Array([1, 2, 3]),
      createdAt: 1000,
      mimeType: 'image/png',
      sha256Hex: () => 'a'.repeat(64)
    })
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      avatarMediaSnapshot,
      avatarUriSnapshot: avatarMediaSnapshot.uri,
      trustedAt: 1000
    })
    const restored = deserializeContactBook(serializeContactBook(trusted))

    assert.deepEqual(getContact(restored, 'profile-b').avatarMediaSnapshot, avatarMediaSnapshot)
    assert.deepEqual(listTrustedContacts(restored), [
      {
        alias: 'Ada',
        avatarMediaSnapshot,
        avatarUriSnapshot: avatarMediaSnapshot.uri,
        profileId: 'profile-b'
      }
    ])
  })

  test('friend request and trust paths keep versioned local profile snapshots', () => {
    const requested = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      alias: 'Ada local',
      avatarUriSnapshot: 'kepos://avatar/ada-v1',
      displayNameSnapshot: 'Ada Remote',
      profileId: 'profile-b',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'profile_qr'
    })
    const trusted = acceptMessageRequest(requested, {
      acceptedAt: 2000,
      alias: 'Ada local',
      profileId: 'profile-b'
    })
    const updated = trustContact(trusted, {
      alias: 'Ada local',
      avatarUriSnapshot: 'kepos://avatar/ada-v2',
      displayNameSnapshot: 'Ada New',
      profileId: 'profile-b',
      source: 'profile_qr',
      trustedAt: 3000
    })
    const restored = deserializeContactBook(serializeContactBook(updated))

    assert.deepEqual(getContact(restored, 'profile-b').profileSnapshots, [
      {
        avatarUriSnapshot: 'kepos://avatar/ada-v2',
        capturedAt: 3000,
        displayNameSnapshot: 'Ada New',
        profileId: 'profile-b',
        source: 'profile_qr',
        version: 1
      },
      {
        avatarUriSnapshot: 'kepos://avatar/ada-v1',
        capturedAt: 1000,
        displayNameSnapshot: 'Ada Remote',
        profileId: 'profile-b',
        source: 'profile_qr',
        version: 1
      }
    ])
  })

  test('trust checks can evaluate a point in time before revoke', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 1000
    })
    const revoked = revokeContact(trusted, {
      profileId: 'profile-b',
      revokedAt: 2000
    })

    assert.equal(isContactTrusted(revoked, 'profile-b'), false)
    assert.equal(isContactTrusted(revoked, 'profile-b', 1500), true)
    assert.equal(isContactTrusted(revoked, 'profile-b', 2000), false)
    assert.equal(canContactAccessHome(revoked, 'profile-b'), false)
    assert.equal(canContactSeePresence(revoked, 'profile-b'), false)
  })

  test('trusting a revoked or ignored contact clears blocked states', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 0
    })
    const ignored = ignoreMessageRequest(
      recordMessageRequest(trusted, {
        alias: 'Ada',
        profileId: 'profile-c',
        requestedAt: 1000,
        requestId: 'request-1'
      }),
      {
        ignoredAt: 1500,
        profileId: 'profile-c'
      }
    )
    const revoked = revokeContact(ignored, {
      profileId: 'profile-b',
      revokedAt: 2000
    })
    const trustedAgain = trustContact(revoked, {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 3000
    })
    const acceptedAfterIgnore = trustContact(revoked, {
      profileId: 'profile-c',
      alias: 'Grace',
      trustedAt: 3000
    })

    assert.equal(isContactTrusted(trusted, 'profile-b'), true)
    assert.equal(isContactTrusted(trustedAgain, 'profile-b'), true)
    assert.equal(getContact(trustedAgain, 'profile-b').revokedAt, undefined)
    assert.equal(getContact(ignored, 'profile-c').requestIgnoredAt, 1500)
    assert.equal(getContact(acceptedAfterIgnore, 'profile-c').requestIgnoredAt, undefined)
  })

  test('message requests grant no access and are bounded to one pending request', () => {
    const book = createContactBook({ ownerProfileId: 'owner-a' })

    const once = recordMessageRequest(book, {
      profileId: 'profile-b',
      alias: 'Ada',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'home_qr',
      text: 'can we talk?'
    })
    const twice = recordMessageRequest(once, {
      profileId: 'profile-b',
      alias: 'Ada',
      requestedAt: 1001,
      requestId: 'request-2',
      source: 'home_qr',
      text: 'newer request should not replace the first preview'
    })

    assert.equal(canContactAccessHome(twice, 'profile-b'), false)
    assert.equal(canContactSeePresence(twice, 'profile-b'), false)
    assert.equal(canSendMessageRequest(twice, 'profile-b'), false)
    assert.deepEqual(Array.from(twice.pendingRequestsByProfileId.values()), [
      {
        profileId: 'profile-b',
        alias: 'Ada',
        requestedAt: 1000,
        requestId: 'request-1',
        source: 'home_qr',
        text: 'can we talk?'
      }
    ])
  })

  test('outgoing friend requests are pending relationship state without trust', () => {
    const book = createContactBook({ ownerProfileId: 'owner-a' })

    const requested = recordOutgoingFriendRequest(book, {
      alias: 'Ada',
      profileId: 'profile-b',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'profile_qr',
      text: 'let me in'
    })
    const repeated = recordOutgoingFriendRequest(requested, {
      alias: 'Ada newer',
      profileId: 'profile-b',
      requestedAt: 1001,
      requestId: 'request-2',
      source: 'profile_qr',
      text: 'newer request should not replace the first preview'
    })

    assert.equal(isContactTrusted(repeated, 'profile-b'), false)
    assert.equal(canContactAccessHome(repeated, 'profile-b'), false)
    assert.deepEqual(getContact(repeated, 'profile-b'), {
      profileId: 'profile-b',
      aliases: ['Ada'],
      alias: 'Ada',
      source: 'profile_qr'
    })
    assert.deepEqual(Array.from(repeated.outgoingRequestsByProfileId.values()), [
      {
        profileId: 'profile-b',
        alias: 'Ada',
        requestedAt: 1000,
        requestId: 'request-1',
        source: 'profile_qr',
        text: 'let me in'
      }
    ])
  })

  test('accepting an outgoing friend request creates the requester side of mutual trust', () => {
    const requested = recordOutgoingFriendRequest(
      createContactBook({ ownerProfileId: 'owner-a' }),
      {
        alias: 'Ada',
        displayNameSnapshot: 'Ada Remote',
        profileId: 'profile-b',
        requestedAt: 1000,
        requestId: 'request-1',
        source: 'profile_qr'
      }
    )

    const trusted = acceptOutgoingFriendRequest(requested, {
      acceptedAt: 2000,
      profileId: 'profile-b'
    })

    assert.equal(isContactTrusted(trusted, 'profile-b'), true)
    assert.equal(trusted.outgoingRequestsByProfileId.has('profile-b'), false)
    assert.equal(getContact(trusted, 'profile-b').alias, 'Ada')
    assert.equal(getContact(trusted, 'profile-b').displayNameSnapshot, 'Ada Remote')
    assert.equal(getContact(trusted, 'profile-b').trustedAt, 2000)
    assert.equal(getContact(trusted, 'profile-b').source, 'profile_qr')
  })

  test('accepting an outgoing friend request preserves the scanned Home descriptor snapshot', () => {
    const homeProof = {
      createdAt: 1000,
      signature: 'signed-home',
      signerProfileId: 'profile-b',
      type: 'kepos.home.address.v1',
      version: 1
    }
    const requested = recordOutgoingFriendRequest(
      createContactBook({ ownerProfileId: 'owner-a' }),
      {
        alias: 'Ada',
        homeAddress: 'c'.repeat(64),
        homePolicy: 'trusted_only',
        homeRoomKey: 'd'.repeat(64),
        profileId: 'profile-b',
        proof: homeProof,
        requestedAt: 1000,
        requestId: 'request-1',
        source: 'profile_qr'
      }
    )

    const trusted = acceptOutgoingFriendRequest(requested, {
      acceptedAt: 2000,
      profileId: 'profile-b'
    })

    assert.deepEqual(getContact(trusted, 'profile-b'), {
      profileId: 'profile-b',
      aliases: ['Ada'],
      alias: 'Ada',
      homeAddress: 'c'.repeat(64),
      homePolicy: 'trusted_only',
      homeRoomKey: 'd'.repeat(64),
      proof: homeProof,
      trustedAt: 2000,
      trustScope: 'home',
      source: 'profile_qr'
    })
  })

  test('trust and revoke clear pending friend request state for the same profile', () => {
    const requested = recordOutgoingFriendRequest(
      recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
        alias: 'Ada',
        profileId: 'profile-b',
        requestedAt: 900,
        requestId: 'incoming-1',
        source: 'home_room'
      }),
      {
        alias: 'Ada',
        profileId: 'profile-b',
        requestedAt: 1000,
        requestId: 'outgoing-1',
        source: 'profile_qr'
      }
    )

    const trusted = trustContact(requested, {
      alias: 'Ada',
      profileId: 'profile-b',
      trustedAt: 1500
    })
    const requestedAgain = recordOutgoingFriendRequest(trusted, {
      alias: 'Ada',
      profileId: 'profile-b',
      requestedAt: 1600,
      requestId: 'outgoing-2',
      source: 'profile_qr'
    })
    const revoked = revokeContact(requestedAgain, {
      profileId: 'profile-b',
      revokedAt: 2000
    })

    assert.equal(trusted.pendingRequestsByProfileId.has('profile-b'), false)
    assert.equal(trusted.outgoingRequestsByProfileId.has('profile-b'), false)
    assert.equal(requestedAgain.outgoingRequestsByProfileId.has('profile-b'), false)
    assert.equal(revoked.pendingRequestsByProfileId.has('profile-b'), false)
    assert.equal(revoked.outgoingRequestsByProfileId.has('profile-b'), false)
  })

  test('revoked contacts cannot create new pending message requests', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 1000
    })
    const revoked = revokeContact(trusted, {
      profileId: 'profile-b',
      revokedAt: 2000
    })

    assert.equal(canSendMessageRequest(revoked, 'profile-b'), false)
    assert.throws(
      () =>
        recordMessageRequest(revoked, {
          profileId: 'profile-b',
          requestedAt: 3000,
          requestId: 'request-1',
          source: 'home_room'
        }),
      /revoked contact/i
    )
  })

  test('revoking a contact clears any pending message request', () => {
    const requested = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'home_room'
    })

    const revoked = revokeContact(requested, {
      profileId: 'profile-b',
      revokedAt: 2000
    })

    assert.equal(requested.pendingRequestsByProfileId.has('profile-b'), true)
    assert.equal(revoked.pendingRequestsByProfileId.has('profile-b'), false)
    assert.equal(getContact(revoked, 'profile-b').revokedAt, 2000)
    assert.throws(
      () =>
        acceptMessageRequest(revoked, {
          profileId: 'profile-b',
          alias: 'Ada',
          acceptedAt: 3000
        }),
      /revoked contact/i
    )
  })

  test('accepting a message request requires pending state then trusts the contact', () => {
    const requested = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      displayNameSnapshot: 'Ada Lovelace',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'home_qr'
    })

    assert.throws(
      () =>
        acceptMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
          profileId: 'profile-b',
          alias: 'Ada',
          acceptedAt: 2000
        }),
      /Pending message request is required/
    )

    const accepted = acceptMessageRequest(requested, {
      profileId: 'profile-b',
      alias: 'Ada',
      acceptedAt: 2000
    })

    assert.equal(accepted.pendingRequestsByProfileId.has('profile-b'), false)
    assert.equal(isContactTrusted(accepted, 'profile-b'), true)
    assert.equal(getContact(accepted, 'profile-b').trustedAt, 2000)
    assert.deepEqual(getContact(accepted, 'profile-b').aliases, ['Ada Lovelace', 'Ada'])
  })

  test('ignoring a message request clears pending state and blocks repeats', () => {
    const requested = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'home_room'
    })

    const ignored = ignoreMessageRequest(requested, { ignoredAt: 2000, profileId: 'profile-b' })
    const repeated = recordMessageRequest(ignored, {
      profileId: 'profile-b',
      alias: 'Ada again',
      requestedAt: 3000,
      requestId: 'request-2',
      source: 'home_room'
    })

    assert.equal(requested.pendingRequestsByProfileId.has('profile-b'), true)
    assert.equal(ignored.pendingRequestsByProfileId.has('profile-b'), false)
    assert.equal(repeated.pendingRequestsByProfileId.has('profile-b'), false)
    assert.equal(isContactTrusted(ignored, 'profile-b'), false)
    assert.equal(canSendMessageRequest(ignored, 'profile-b'), false)
    assert.equal(getContact(ignored, 'profile-b').alias, 'Ada')
    assert.equal(getContact(ignored, 'profile-b').requestIgnoredAt, 2000)
  })

  test('allowing requests from an ignored contact clears only the request block', () => {
    const requested = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      displayNameSnapshot: 'Ada Lovelace',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'home_room'
    })
    const ignored = ignoreMessageRequest(requested, { ignoredAt: 2000, profileId: 'profile-b' })

    const allowed = allowContactRequests(ignored, { profileId: 'profile-b' })

    assert.equal(canSendMessageRequest(ignored, 'profile-b'), false)
    assert.equal(canSendMessageRequest(allowed, 'profile-b'), true)
    assert.equal(isContactTrusted(allowed, 'profile-b'), false)
    assert.equal(getContact(allowed, 'profile-b').requestIgnoredAt, undefined)
    assert.equal(getContact(allowed, 'profile-b').alias, 'Ada')
    assert.equal(getContact(allowed, 'profile-b').displayNameSnapshot, 'Ada Lovelace')
  })

  test('allowing requests from a revoked contact does not restore prior trust', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      displayNameSnapshot: 'Ada Lovelace',
      homeAddress: 'home-b',
      homePolicy: 'trusted_only',
      homeRoomKey: 'room-b',
      trustedAt: 1000,
      proof: { type: 'profile_qr' },
      source: 'profile_qr'
    })
    const revoked = revokeContact(trusted, { profileId: 'profile-b', revokedAt: 2000 })

    const allowed = allowContactRequests(revoked, { profileId: 'profile-b' })

    assert.equal(canSendMessageRequest(revoked, 'profile-b'), false)
    assert.equal(canSendMessageRequest(allowed, 'profile-b'), true)
    assert.equal(isContactTrusted(allowed, 'profile-b'), false)
    assert.equal(canContactAccessHome(allowed, 'profile-b'), false)
    assert.equal(getContact(allowed, 'profile-b').revokedAt, undefined)
    assert.equal(getContact(allowed, 'profile-b').trustedAt, undefined)
    assert.equal(getContact(allowed, 'profile-b').trustScope, undefined)
    assert.equal(getContact(allowed, 'profile-b').homeAddress, undefined)
    assert.equal(getContact(allowed, 'profile-b').homePolicy, undefined)
    assert.equal(getContact(allowed, 'profile-b').homeRoomKey, undefined)
    assert.equal(getContact(allowed, 'profile-b').proof, undefined)
    assert.equal(getContact(allowed, 'profile-b').alias, 'Ada')
    assert.equal(getContact(allowed, 'profile-b').displayNameSnapshot, 'Ada Lovelace')
  })

  test('trusted contacts cannot send message requests', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 1000
    })
    const requested = recordMessageRequest(trusted, {
      profileId: 'profile-b',
      alias: 'Ada',
      requestedAt: 2000,
      requestId: 'request-1',
      source: 'home_room'
    })

    assert.equal(canSendMessageRequest(trusted, 'profile-b'), false)
    assert.equal(requested.pendingRequestsByProfileId.has('profile-b'), false)
  })

  test('DM invite ContactBook policy requires trusted sender', () => {
    const book = createContactBook({ ownerProfileId: 'owner-a' })
    const trusted = trustContact(book, {
      alias: 'Ada',
      profileId: 'profile-b',
      trustedAt: 1000
    })

    assert.equal(
      canAcceptDmInviteFromContactBook(book, {
        fromProfileId: 'profile-b',
        requestId: 'request-1',
        toProfileId: 'owner-a'
      }),
      false
    )
    assert.equal(
      canAcceptDmInviteFromContactBook(trusted, {
        fromProfileId: 'profile-b',
        toProfileId: 'owner-a'
      }),
      true
    )
    assert.equal(
      canAcceptDmInviteFromContactBook(trusted, {
        fromProfileId: 'profile-b',
        toProfileId: 'owner-c'
      }),
      false
    )
  })

  test('serializes and restores contact books with schema version', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      displayNameSnapshot: 'Ada Lovelace',
      homeAddress: 'home-b',
      homePolicy: 'trusted_only',
      trustedAt: 1000,
      source: 'person_qr'
    })
    const requested = recordMessageRequest(trusted, {
      profileId: 'profile-c',
      alias: 'Grace',
      requestedAt: 1200,
      requestId: 'request-1',
      source: 'home_qr'
    })
    const ignored = ignoreMessageRequest(requested, {
      ignoredAt: 1300,
      profileId: 'profile-c'
    })

    const stored = serializeContactBook(ignored)
    const restored = deserializeContactBook(stored)

    assert.equal(stored.version, 1)
    assert.deepEqual(getContact(restored, 'profile-b'), getContact(ignored, 'profile-b'))
    assert.deepEqual(getContact(restored, 'profile-c'), getContact(ignored, 'profile-c'))
    assert.deepEqual(
      Array.from(restored.pendingRequestsByProfileId.values()),
      Array.from(ignored.pendingRequestsByProfileId.values())
    )
  })

  test('restores contact trust while dropping corrupt optional profile snapshots', () => {
    const restored = deserializeContactBook({
      version: 1,
      ownerProfileId: 'owner-a',
      contacts: [
        {
          alias: 'Ada',
          profileId: 'profile-b',
          profileSnapshots: [
            {
              capturedAt: 1000,
              displayNameSnapshot: 'Ada',
              profileId: 'profile-b',
              version: 1
            },
            {
              capturedAt: 2000,
              displayNameSnapshot: 'Bad snapshot',
              profileId: 'profile-b',
              version: 99
            }
          ],
          trustedAt: 1000,
          trustScope: 'home'
        }
      ],
      pendingRequests: []
    })

    assert.equal(getContact(restored, 'profile-b').trustedAt, 1000)
    assert.deepEqual(getContact(restored, 'profile-b').profileSnapshots, [
      {
        capturedAt: 1000,
        displayNameSnapshot: 'Ada',
        profileId: 'profile-b',
        version: 1
      }
    ])
  })

  test('creates treehole policy snapshots from trusted and revoked contacts', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 1000
    })
    const revoked = revokeContact(
      trustContact(trusted, {
        profileId: 'profile-c',
        alias: 'Grace',
        trustedAt: 1100
      }),
      {
        profileId: 'profile-c',
        revokedAt: 2000
      }
    )

    assert.deepEqual(createTreeholePolicyFromContactBook(revoked), {
      ownerProfileId: 'owner-a',
      revokedProfileIds: ['profile-c'],
      trustedProfileIds: ['profile-b']
    })
  })

  test('lists trusted non-revoked contacts as recipient options', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      homeAddress: 'address-b',
      homePolicy: 'trusted_only',
      homeRoomKey: 'room-b',
      trustedAt: 1000
    })
    const withSecond = trustContact(trusted, {
      profileId: 'profile-c',
      alias: 'Grace',
      trustedAt: 900
    })
    const withRevoked = revokeContact(
      trustContact(withSecond, {
        profileId: 'profile-d',
        alias: 'Revoked',
        trustedAt: 800
      }),
      {
        profileId: 'profile-d',
        revokedAt: 1200
      }
    )

    assert.deepEqual(listTrustedContacts(withRevoked), [
      {
        alias: 'Ada',
        homeAddress: 'address-b',
        homePolicy: 'trusted_only',
        homeRoomKey: 'room-b',
        profileId: 'profile-b'
      },
      {
        alias: 'Grace',
        profileId: 'profile-c'
      }
    ])
  })
})
