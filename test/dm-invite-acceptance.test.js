import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createContactBook, revokeContact, trustContact } from '../src/contact-book.ts'
import { createDmEncryptionKeyPair, createDmInvite } from '../src/dm-invite.ts'
import { acceptDmInviteAsRecipient } from '../src/dm-invite-acceptance.js'
import { isDmThreadActive } from '../src/dm-thread.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

describe('DM invite acceptance', () => {
  test('opens a signed invite into an active recipient thread', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const book = trustContact(createContactBook({ ownerProfileId: recipient.publicKey }), {
      alias: 'Sender',
      profileId: sender.publicKey,
      trustedAt: 1500
    })
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      requestId: 'request-1',
      toProfileId: recipient.publicKey
    })

    const thread = acceptDmInviteAsRecipient({
      acceptedAt: 2000,
      contactBook: book,
      invite,
      localProfileId: recipient.publicKey,
      recipientEncryptionKeyPair: recipientEncryption
    })

    assert.deepEqual(thread, {
      acceptedAt: 2000,
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      localProfileId: recipient.publicKey,
      remoteProfileId: sender.publicKey,
      requestId: 'request-1',
      state: 'accepted',
      threadId: 'thread-1'
    })
    assert.equal(isDmThreadActive(thread), true)
  })

  test('opens a request-bound invite from an untrusted non-revoked sender', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const book = createContactBook({ ownerProfileId: recipient.publicKey })
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      requestId: 'request-1',
      toProfileId: recipient.publicKey
    })

    const thread = acceptDmInviteAsRecipient({
      canAcceptInvite: (candidate) => candidate.requestId === 'request-1',
      contactBook: book,
      invite,
      localProfileId: recipient.publicKey,
      recipientEncryptionKeyPair: recipientEncryption
    })

    assert.equal(thread.remoteProfileId, sender.publicKey)
    assert.equal(isDmThreadActive(thread), true)
  })

  test('rejects request-bound invites without explicit local request authorization', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const book = createContactBook({ ownerProfileId: recipient.publicKey })
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      requestId: 'request-1',
      toProfileId: recipient.publicKey
    })

    assert.throws(
      () =>
        acceptDmInviteAsRecipient({
          contactBook: book,
          invite,
          localProfileId: recipient.publicKey,
          recipientEncryptionKeyPair: recipientEncryption
        }),
      /DM invite is not authorized/
    )
  })

  test('rejects ordinary invites from untrusted senders', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const book = createContactBook({ ownerProfileId: recipient.publicKey })
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      toProfileId: recipient.publicKey
    })

    assert.throws(
      () =>
        acceptDmInviteAsRecipient({
          contactBook: book,
          invite,
          localProfileId: recipient.publicKey,
          recipientEncryptionKeyPair: recipientEncryption
        }),
      /DM invite is not authorized/
    )
  })

  test('rejects invites addressed to a different local profile', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const otherRecipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      requestId: 'request-1',
      toProfileId: recipient.publicKey
    })

    assert.throws(
      () =>
        acceptDmInviteAsRecipient({
          invite,
          localProfileId: otherRecipient.publicKey,
          recipientEncryptionKeyPair: recipientEncryption
        }),
      /not addressed to this profile/
    )
  })

  test('rejects request-bound invites from revoked senders', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const book = revokeContact(
      trustContact(createContactBook({ ownerProfileId: recipient.publicKey }), {
        alias: 'Sender',
        profileId: sender.publicKey,
        trustedAt: 1500
      }),
      {
        profileId: sender.publicKey,
        revokedAt: 1600
      }
    )
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      requestId: 'request-1',
      toProfileId: recipient.publicKey
    })

    assert.throws(
      () =>
        acceptDmInviteAsRecipient({
          contactBook: book,
          invite,
          localProfileId: recipient.publicKey,
          recipientEncryptionKeyPair: recipientEncryption
        }),
      /DM invite is not authorized/
    )
  })

  test('rejects invites whose encrypted payload does not match public routing fields', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '3'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      toProfileId: recipient.publicKey
    })

    assert.throws(
      () =>
        acceptDmInviteAsRecipient({
          acceptedAt: 2000,
          canAcceptInvite: () => true,
          invite,
          localProfileId: recipient.publicKey,
          recipientEncryptionKeyPair: recipientEncryption
        }),
      /DM invite payload mismatch/
    )
  })

  test('rejects expired invites before opening a recipient thread', () => {
    const sender = createSigningKeyPair()
    const recipient = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const book = trustContact(createContactBook({ ownerProfileId: recipient.publicKey }), {
      alias: 'Sender',
      profileId: sender.publicKey,
      trustedAt: 1500
    })
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      expiresAt: 1800,
      fromIdentity: sender,
      inviteId: 'invite-1',
      payload: {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        threadId: 'thread-1'
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      toProfileId: recipient.publicKey
    })

    assert.throws(
      () =>
        acceptDmInviteAsRecipient({
          acceptedAt: 2000,
          contactBook: book,
          invite,
          localProfileId: recipient.publicKey,
          recipientEncryptionKeyPair: recipientEncryption
        }),
      /Expired DM invite/
    )
  })
})
