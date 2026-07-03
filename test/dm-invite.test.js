import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createDmEncryptionKeyPair,
  createDmInvite,
  openDmInvite,
  verifyDmInvite
} from '../src/dm-invite.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

describe('signed encrypted DM invites', () => {
  test('creates a signed invite that only the recipient encryption key can open', () => {
    const from = createSigningKeyPair()
    const to = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const otherEncryption = createDmEncryptionKeyPair()
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      expiresAt: 3000,
      fromIdentity: from,
      inviteId: 'invite-1',
      payload: {
        capabilities: ['text'],
        channelEncryptionKey: '3'.repeat(64)
      },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      requestId: 'request-1',
      toProfileId: to.publicKey
    })

    assert.equal(verifyDmInvite(invite), true)
    assert.deepEqual(
      {
        channelDiscoveryKey: invite.channelDiscoveryKey,
        channelPublicKey: invite.channelPublicKey,
        expiresAt: invite.expiresAt,
        fromProfileId: invite.fromProfileId,
        inviteId: invite.inviteId,
        requestId: invite.requestId,
        toProfileId: invite.toProfileId
      },
      {
        channelDiscoveryKey: '1'.repeat(64),
        channelPublicKey: '2'.repeat(64),
        expiresAt: 3000,
        fromProfileId: from.publicKey,
        inviteId: 'invite-1',
        requestId: 'request-1',
        toProfileId: to.publicKey
      }
    )
    assert.deepEqual(
      openDmInvite({ invite, now: 2000, recipientEncryptionKeyPair: recipientEncryption }),
      {
        capabilities: ['text'],
        channelEncryptionKey: '3'.repeat(64)
      }
    )
    assert.throws(
      () => openDmInvite({ invite, now: 2000, recipientEncryptionKeyPair: otherEncryption }),
      /Unable to open DM invite/
    )
  })

  test('rejects tampered invite routing fields', () => {
    const from = createSigningKeyPair()
    const to = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      fromIdentity: from,
      inviteId: 'invite-1',
      payload: { channelEncryptionKey: '3'.repeat(64) },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      toProfileId: to.publicKey
    })

    assert.equal(verifyDmInvite({ ...invite, channelPublicKey: '4'.repeat(64) }), false)
  })

  test('rejects tampered invite expiration and expired opens', () => {
    const from = createSigningKeyPair()
    const to = createSigningKeyPair()
    const recipientEncryption = createDmEncryptionKeyPair()
    const invite = createDmInvite({
      channelDiscoveryKey: '1'.repeat(64),
      channelPublicKey: '2'.repeat(64),
      createdAt: 1000,
      expiresAt: 3000,
      fromIdentity: from,
      inviteId: 'invite-1',
      payload: { channelEncryptionKey: '3'.repeat(64) },
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      toProfileId: to.publicKey
    })

    assert.equal(verifyDmInvite({ ...invite, expiresAt: 4000 }), false)
    assert.doesNotThrow(() =>
      openDmInvite({ invite, now: 2999, recipientEncryptionKeyPair: recipientEncryption })
    )
    assert.throws(
      () => openDmInvite({ invite, now: 3000, recipientEncryptionKeyPair: recipientEncryption }),
      /Expired DM invite/
    )
  })
})
