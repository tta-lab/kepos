import assert from 'node:assert/strict'
import test from 'node:test'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { createMessageRequest } from '../src/message-request.ts'
import {
  createQueuedProfileFriendRequestTransport,
  formatProfileFriendRequestDeliveryState,
  sendProfileFriendRequest
} from '../src/profile-friend-request-transport.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

test('profile friend request transport validates profile-to-profile request shape', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })
  const sent = []

  const result = await sendProfileFriendRequest({
    localProfile: {
      identity: from,
      profileId: from.publicKey
    },
    request,
    targetProfileId: to.publicKey,
    transport: {
      send(nextRequest) {
        sent.push(nextRequest)
        return { state: 'sent' }
      }
    }
  })

  assert.equal(result.state, 'sent')
  assert.deepEqual(sent, [request])
})

test('profile friend request transport defaults to queued without a connected P2P route', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  const result = await sendProfileFriendRequest({
    localProfile: {
      identity: from,
      profileId: from.publicKey
    },
    request,
    targetProfileId: to.publicKey,
    transport: createQueuedProfileFriendRequestTransport()
  })

  assert.equal(result.state, 'queued')
  assert.equal(formatProfileFriendRequestDeliveryState(result.state), 'Request pending')
})

test('profile friend request transport rejects Home-style mismatched targets', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const other = createSigningKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  await assert.rejects(
    sendProfileFriendRequest({
      localProfile: {
        identity: from,
        profileId: from.publicKey
      },
      request,
      targetProfileId: other.publicKey
    }),
    /target mismatch/
  )
})
