import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook } from '../src/contact-book.ts'
import { createDesktopControlMessageResult } from '../src/desktop-control-service.js'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { createMessageRequest } from '../src/message-request.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

test('desktop control service records incoming message requests for the local DM session', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const fromEncryption = createDmEncryptionKeyPair()
  const book = createContactBook({ ownerProfileId: to.publicKey })
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: fromEncryption.publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  const result = await createDesktopControlMessageResult({
    contactBook: book,
    currentDmSession: { localProfileId: to.publicKey },
    fallbackAlias: 'Friend',
    message: request
  })

  assert.equal(result.kind, 'message_request')
  assert.equal(result.appendIncomingRequest, request)
  assert.equal(result.book.pendingRequestsByProfileId.has(from.publicKey), true)
  assert.equal(result.book.pendingRequestsByProfileId.get(from.publicKey).alias, 'Friend')
})

test('desktop control service ignores message requests for another local profile', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const other = createSigningKeyPair()
  const fromEncryption = createDmEncryptionKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: fromEncryption.publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  const result = await createDesktopControlMessageResult({
    contactBook: createContactBook({ ownerProfileId: other.publicKey }),
    currentDmSession: { localProfileId: other.publicKey },
    fallbackAlias: 'Friend',
    message: request
  })

  assert.equal(result, null)
})

test('desktop control service accepts DM invites for the local DM session', async () => {
  const local = createSigningKeyPair()
  const contactBook = createContactBook({ ownerProfileId: local.publicKey })
  const recipientEncryptionKeyPair = createDmEncryptionKeyPair()
  const invite = {
    type: 'kepos.dm.invite.v1',
    inviteId: 'invite-1',
    toProfileId: local.publicKey
  }
  const calls = []

  const result = await createDesktopControlMessageResult({
    acceptInviteAsRecipient: (payload) => {
      calls.push(payload)
    },
    acceptedAt: 2000,
    contactBook,
    currentDmSession: { localProfileId: local.publicKey },
    message: invite,
    recipientEncryptionKeyPair
  })

  assert.equal(result.kind, 'dm_invite')
  assert.deepEqual(calls, [
    {
      acceptedAt: 2000,
      contactBook,
      invite,
      recipientEncryptionKeyPair
    }
  ])
})
