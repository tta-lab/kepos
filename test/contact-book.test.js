import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  acceptMessageRequest,
  canAcceptDmInviteFromContactBook,
  canContactAccessHome,
  canContactSeePresence,
  canSendMessageRequest,
  createContactBook,
  createTreeholePolicyFromContactBook,
  deserializeContactBook,
  getContact,
  ignoreMessageRequest,
  isContactTrusted,
  listTrustedContacts,
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
      displayNameSnapshot: ' Ada Lovelace ',
      source: 'qr'
    })

    assert.equal(book.contactsByProfileId.size, 0)
    assert.deepEqual(getContact(next, 'profile-b'), {
      profileId: 'profile-b',
      aliases: ['Ada'],
      alias: 'Ada',
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
      proof: { type: 'qr' }
    })
    assert.equal(isContactTrusted(next, 'profile-b'), true)
    assert.equal(canContactAccessHome(next, 'profile-b'), true)
    assert.equal(canContactSeePresence(next, 'profile-b'), true)
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

  test('trusting a revoked contact clears the revoke state', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 0
    })
    const revoked = revokeContact(trusted, {
      profileId: 'profile-b',
      revokedAt: 2000
    })
    const trustedAgain = trustContact(revoked, {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 3000
    })

    assert.equal(isContactTrusted(trusted, 'profile-b'), true)
    assert.equal(isContactTrusted(trustedAgain, 'profile-b'), true)
    assert.equal(getContact(trustedAgain, 'profile-b').revokedAt, undefined)
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

  test('accepting a message request trusts the contact and clears pending request', () => {
    const requested = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      displayNameSnapshot: 'Ada Lovelace',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'home_qr'
    })

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

  test('ignoring a message request only clears the pending request', () => {
    const requested = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'home_room'
    })

    const ignored = ignoreMessageRequest(requested, { profileId: 'profile-b' })

    assert.equal(requested.pendingRequestsByProfileId.has('profile-b'), true)
    assert.equal(ignored.pendingRequestsByProfileId.has('profile-b'), false)
    assert.equal(isContactTrusted(ignored, 'profile-b'), false)
    assert.equal(getContact(ignored, 'profile-b').alias, 'Ada')
  })

  test('trusted contacts cannot send message requests', () => {
    const trusted = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 1000
    })

    assert.equal(canSendMessageRequest(trusted, 'profile-b'), false)
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

    const stored = serializeContactBook(requested)
    const restored = deserializeContactBook(stored)

    assert.equal(stored.version, 1)
    assert.deepEqual(getContact(restored, 'profile-b'), getContact(requested, 'profile-b'))
    assert.deepEqual(
      Array.from(restored.pendingRequestsByProfileId.values()),
      Array.from(requested.pendingRequestsByProfileId.values())
    )
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
        profileId: 'profile-b'
      },
      {
        alias: 'Grace',
        profileId: 'profile-c'
      }
    ])
  })
})
