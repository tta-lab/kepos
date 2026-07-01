import assert from 'node:assert/strict'
import test from 'node:test'

import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { createMessageRequest, verifyMessageRequest } from '../src/message-request.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  decodeQrUri,
  encodeQrUri,
  verifySignedHomeAddressPayload,
  verifySignedTrustInvitePayload
} from '../src/signed-qr-payload.ts'

test('signed trust invite payloads round trip through profile QR URI', () => {
  const identity = createSigningKeyPair()
  const payload = createSignedTrustInvitePayload({
    createdAt: 1000,
    displayName: 'Ada',
    identity
  })
  const uri = encodeQrUri(payload)
  const decoded = decodeQrUri(uri)

  assert.equal(uri.startsWith('kepos://profile?v=1&payload='), true)
  assert.deepEqual(decoded, payload)
  assert.equal(verifySignedTrustInvitePayload(decoded), true)
})

test('signed profile QR can carry an independently signed Home descriptor', () => {
  const identity = createSigningKeyPair()
  const homeDescriptor = createSignedHomeAddressPayload({
    address: 'c'.repeat(64),
    createdAt: 1001,
    identity,
    policy: 'trusted_only',
    roomKey: 'd'.repeat(64)
  })
  const payload = createSignedTrustInvitePayload({
    createdAt: 1000,
    displayName: 'Ada',
    homeDescriptor,
    identity
  })
  const uri = encodeQrUri(payload)
  const decoded = decodeQrUri(uri)

  assert.deepEqual(decoded.homeDescriptor, homeDescriptor)
  assert.equal(verifySignedTrustInvitePayload(decoded), true)
})

test('signed profile QR can carry a content-addressed avatar media reference', () => {
  const identity = createSigningKeyPair()
  const avatarMedia = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1002,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const payload = createSignedTrustInvitePayload({
    avatarMedia,
    avatarUri: avatarMedia.uri,
    createdAt: 1000,
    displayName: 'Ada',
    identity
  })
  const uri = encodeQrUri(payload)
  const decoded = decodeQrUri(uri)

  assert.deepEqual(decoded.avatarMedia, avatarMedia)
  assert.equal(decoded.avatarUri, avatarMedia.uri)
  assert.equal(verifySignedTrustInvitePayload(decoded), true)
})

test('signed profile QR rejects Home descriptors signed by another profile', () => {
  const identity = createSigningKeyPair()
  const other = createSigningKeyPair()
  const payload = createSignedTrustInvitePayload({
    createdAt: 1000,
    displayName: 'Ada',
    homeDescriptor: createSignedHomeAddressPayload({
      address: 'c'.repeat(64),
      createdAt: 1001,
      identity: other,
      policy: 'trusted_only',
      roomKey: 'd'.repeat(64)
    }),
    identity
  })

  assert.equal(verifySignedTrustInvitePayload(payload), false)
})

test('signed home address payloads round trip through home QR URI', () => {
  const identity = createSigningKeyPair()
  const payload = createSignedHomeAddressPayload({
    address: 'c'.repeat(64),
    createdAt: 1000,
    identity,
    policy: 'trusted_only',
    roomKey: 'd'.repeat(64)
  })
  const uri = encodeQrUri(payload)
  const decoded = decodeQrUri(uri)

  assert.equal(uri.startsWith('kepos://home?v=1&payload='), true)
  assert.deepEqual(decoded, payload)
  assert.equal(verifySignedHomeAddressPayload(decoded), true)
})

test('signed message request payloads round trip through message request QR URI', () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const senderEncryption = createDmEncryptionKeyPair()
  const payload = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: senderEncryption.publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })
  const uri = encodeQrUri(payload)
  const decoded = decodeQrUri(uri)

  assert.equal(uri.startsWith('kepos://message-request?v=1&payload='), true)
  assert.deepEqual(decoded, payload)
  assert.equal(verifyMessageRequest(decoded), true)
})

test('signed QR payload verification fails after tampering', () => {
  const identity = createSigningKeyPair()
  const payload = createSignedHomeAddressPayload({
    address: 'c'.repeat(64),
    createdAt: 1000,
    identity,
    policy: 'trusted_only',
    roomKey: 'd'.repeat(64)
  })

  assert.equal(
    verifySignedHomeAddressPayload({
      ...payload,
      policy: 'public'
    }),
    false
  )
})

test('signed QR payload verification rejects expired payloads', () => {
  const identity = createSigningKeyPair()
  const payload = createSignedHomeAddressPayload({
    address: 'c'.repeat(64),
    createdAt: 1000,
    expiresAt: 1500,
    identity,
    policy: 'trusted_only',
    roomKey: 'd'.repeat(64)
  })

  assert.equal(verifySignedHomeAddressPayload(payload, { now: 1499 }), true)
  assert.equal(verifySignedHomeAddressPayload(payload, { now: 1500 }), false)
  assert.equal(
    verifySignedHomeAddressPayload(
      {
        ...payload,
        expiresAt: 2000
      },
      { now: 1499 }
    ),
    false
  )
})
