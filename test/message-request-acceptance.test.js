import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createContactBook,
  isContactTrusted,
  recordMessageRequest,
  revokeContact,
  trustContact
} from '../src/contact-book.ts'
import { applyMessageRequestToContactBook, createMessageRequest } from '../src/message-request.ts'
import {
  acceptMessageRequestWithInvite,
  openAcceptedMessageRequestInvite
} from '../src/message-request-acceptance.js'
import { createDmEncryptionKeyPair, verifyDmInvite } from '../src/dm-invite.ts'
import { isDmThreadActive } from '../src/dm-thread.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

describe('message request acceptance', () => {
  test('accepts a pending request into trust, encrypted invite, and active local thread', () => {
    const acceptor = createSigningKeyPair()
    const requester = createSigningKeyPair()
    const requesterEncryption = createDmEncryptionKeyPair()
    const request = createMessageRequest({
      createdAt: 1000,
      fromIdentity: requester,
      requestId: 'request-1',
      senderEncryptionPublicKey: requesterEncryption.publicKey,
      text: 'hello',
      toProfileId: acceptor.publicKey
    })
    const book = applyMessageRequestToContactBook(
      createContactBook({ ownerProfileId: acceptor.publicKey }),
      {
        alias: 'Ada',
        request,
        source: 'home_room'
      }
    )

    const result = acceptMessageRequestWithInvite({
      acceptedAt: 2000,
      acceptorIdentity: acceptor,
      book,
      remoteProfileId: requester.publicKey,
      threadId: 'thread-1'
    })

    assert.equal(isContactTrusted(result.book, requester.publicKey), true)
    assert.equal(result.book.pendingRequestsByProfileId.has(requester.publicKey), false)
    assert.equal(verifyDmInvite(result.invite), true)
    assert.equal(result.invite.requestId, 'request-1')
    assert.equal(result.invite.fromProfileId, acceptor.publicKey)
    assert.equal(result.invite.toProfileId, requester.publicKey)
    assert.equal(result.thread.threadId, 'thread-1')
    assert.equal(result.thread.requestId, 'request-1')
    assert.equal(result.thread.localProfileId, acceptor.publicKey)
    assert.equal(result.thread.remoteProfileId, requester.publicKey)
    assert.equal(isDmThreadActive(result.thread), true)

    assert.deepEqual(
      openAcceptedMessageRequestInvite({
        invite: result.invite,
        recipientEncryptionKeyPair: requesterEncryption
      }),
      {
        channelDiscoveryKey: result.thread.channelDiscoveryKey,
        channelPublicKey: result.thread.channelPublicKey,
        threadId: 'thread-1'
      }
    )
  })

  test('rejects acceptance without a pending request', () => {
    const acceptor = createSigningKeyPair()
    const requester = createSigningKeyPair()

    assert.throws(
      () =>
        acceptMessageRequestWithInvite({
          acceptedAt: 2000,
          acceptorIdentity: acceptor,
          book: createContactBook({ ownerProfileId: acceptor.publicKey }),
          remoteProfileId: requester.publicKey,
          threadId: 'thread-1'
        }),
      /Pending message request is required/
    )
  })

  test('rejects acceptance from a revoked contact without opening a new DM thread', () => {
    const acceptor = createSigningKeyPair()
    const requester = createSigningKeyPair()
    const requested = recordMessageRequest(
      createContactBook({ ownerProfileId: acceptor.publicKey }),
      {
        alias: 'Ada',
        profileId: requester.publicKey,
        requestedAt: 1000,
        requestId: 'request-1',
        senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
        source: 'home_room'
      }
    )
    const revoked = revokeContact(
      trustContact(requested, {
        alias: 'Ada',
        profileId: requester.publicKey,
        trustedAt: 1500
      }),
      {
        profileId: requester.publicKey,
        revokedAt: 2000
      }
    )

    assert.throws(
      () =>
        acceptMessageRequestWithInvite({
          acceptedAt: 4000,
          acceptorIdentity: acceptor,
          book: revoked,
          remoteProfileId: requester.publicKey,
          threadId: 'thread-1'
        }),
      /revoked contact/i
    )
  })

  test('accepted request invite cannot be opened after tampering or with another key', () => {
    const acceptor = createSigningKeyPair()
    const requester = createSigningKeyPair()
    const requesterEncryption = createDmEncryptionKeyPair()
    const otherEncryption = createDmEncryptionKeyPair()
    const request = createMessageRequest({
      createdAt: 1000,
      fromIdentity: requester,
      requestId: 'request-1',
      senderEncryptionPublicKey: requesterEncryption.publicKey,
      text: 'hello',
      toProfileId: acceptor.publicKey
    })
    const book = applyMessageRequestToContactBook(
      createContactBook({ ownerProfileId: acceptor.publicKey }),
      {
        alias: 'Ada',
        request,
        source: 'home_room'
      }
    )
    const result = acceptMessageRequestWithInvite({
      acceptedAt: 2000,
      acceptorIdentity: acceptor,
      book,
      remoteProfileId: requester.publicKey,
      threadId: 'thread-1'
    })

    assert.throws(
      () =>
        openAcceptedMessageRequestInvite({
          invite: { ...result.invite, channelPublicKey: '4'.repeat(64) },
          recipientEncryptionKeyPair: requesterEncryption
        }),
      /Invalid DM invite/
    )
    assert.throws(
      () =>
        openAcceptedMessageRequestInvite({
          invite: result.invite,
          recipientEncryptionKeyPair: otherEncryption
        }),
      /Unable to open DM invite/
    )
  })
})
