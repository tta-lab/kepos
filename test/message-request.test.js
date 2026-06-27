import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { canSendMessageRequest, createContactBook } from '../src/contact-book.ts'
import {
  applyMessageRequestToContactBook,
  createMessageRequest,
  verifyMessageRequest
} from '../src/message-request.ts'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

describe('signed message requests', () => {
  test('creates and verifies a signed one-message request', () => {
    const from = createSigningKeyPair()
    const to = createSigningKeyPair()
    const fromEncryption = createDmEncryptionKeyPair()
    const request = createMessageRequest({
      createdAt: 1000,
      fromIdentity: from,
      senderEncryptionPublicKey: fromEncryption.publicKey,
      requestId: 'request-1',
      text: 'hello',
      toProfileId: to.publicKey
    })

    assert.equal(verifyMessageRequest(request), true)
    assert.deepEqual(
      {
        fromProfileId: request.fromProfileId,
        requestId: request.requestId,
        senderEncryptionPublicKey: request.senderEncryptionPublicKey,
        text: request.text,
        toProfileId: request.toProfileId
      },
      {
        fromProfileId: from.publicKey,
        requestId: 'request-1',
        senderEncryptionPublicKey: fromEncryption.publicKey,
        text: 'hello',
        toProfileId: to.publicKey
      }
    )
  })

  test('rejects tampered message requests', () => {
    const from = createSigningKeyPair()
    const to = createSigningKeyPair()
    const fromEncryption = createDmEncryptionKeyPair()
    const request = createMessageRequest({
      createdAt: 1000,
      fromIdentity: from,
      senderEncryptionPublicKey: fromEncryption.publicKey,
      requestId: 'request-1',
      text: 'hello',
      toProfileId: to.publicKey
    })

    assert.equal(verifyMessageRequest({ ...request, text: 'changed' }), false)
  })

  test('records only one pending request per untrusted sender', () => {
    const from = createSigningKeyPair()
    const to = createSigningKeyPair()
    const fromEncryption = createDmEncryptionKeyPair()
    const book = createContactBook({ ownerProfileId: to.publicKey })
    const first = createMessageRequest({
      createdAt: 1000,
      fromIdentity: from,
      senderEncryptionPublicKey: fromEncryption.publicKey,
      requestId: 'request-1',
      text: 'hello',
      toProfileId: to.publicKey
    })
    const second = createMessageRequest({
      createdAt: 1100,
      fromIdentity: from,
      senderEncryptionPublicKey: fromEncryption.publicKey,
      requestId: 'request-2',
      text: 'again',
      toProfileId: to.publicKey
    })

    const once = applyMessageRequestToContactBook(book, {
      alias: 'Ada',
      request: first,
      source: 'message_request'
    })
    const twice = applyMessageRequestToContactBook(once, {
      alias: 'Ada',
      request: second,
      source: 'message_request'
    })

    assert.equal(canSendMessageRequest(twice, from.publicKey), false)
    assert.deepEqual(Array.from(twice.pendingRequestsByProfileId.values()), [
      {
        profileId: from.publicKey,
        alias: 'Ada',
        requestedAt: 1000,
        requestId: 'request-1',
        senderEncryptionPublicKey: fromEncryption.publicKey,
        source: 'message_request',
        text: 'hello'
      }
    ])
  })
})
