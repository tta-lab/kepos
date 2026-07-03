import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createSigningKeyPair } from '../src/signed-record.ts'
import { createSignedDmMessage, verifySignedDmMessage } from '../src/dm-message.ts'

describe('signed DM messages', () => {
  test('message proof verifies against the sender identity', () => {
    const sender = createSigningKeyPair()
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'message-1',
      text: 'hello',
      threadId: 'thread-1'
    })

    assert.equal(message.fromProfileId, sender.publicKey)
    assert.match(message.proof.signature, /^[0-9a-f]{128}$/)
    assert.equal(verifySignedDmMessage(message), true)
  })

  test('message proof fails after payload tampering', () => {
    const sender = createSigningKeyPair()
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'message-1',
      text: 'hello',
      threadId: 'thread-1'
    })

    assert.equal(verifySignedDmMessage({ ...message, text: 'edited' }), false)
  })

  test('message proof fails when sender does not match signer', () => {
    const sender = createSigningKeyPair()
    const other = createSigningKeyPair()
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'message-1',
      text: 'hello',
      threadId: 'thread-1'
    })

    assert.equal(verifySignedDmMessage({ ...message, fromProfileId: other.publicKey }), false)
  })
})
