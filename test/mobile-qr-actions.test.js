import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createContactBook, getContact, isContactTrusted } from '../src/contact-book.ts'
import { applyMobileHomeQrScan, applyMobileProfileQrScan } from '../src/mobile-qr-actions.ts'
import { getScannedQrData } from '../src/mobile-qr-event.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

describe('mobile QR scan actions', () => {
  test('scan event data accepts direct and nativeEvent payload shapes', () => {
    assert.equal(getScannedQrData({ data: 'kepos://profile' }), 'kepos://profile')
    assert.equal(getScannedQrData({ nativeEvent: { data: 'kepos://home' } }), 'kepos://home')
    assert.equal(getScannedQrData({ nativeEvent: { data: '   ' } }), null)
  })

  test('profile scan applies only signed profile QR to ContactBook', () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: local.publicKey })
    const uri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Ada',
        identity: remote
      })
    )

    const result = applyMobileProfileQrScan({
      alias: 'Ada local',
      book,
      localIdentity: local,
      uri
    })

    assert.equal(result.kind, 'trust')
    assert.equal(isContactTrusted(result.book, remote.publicKey), true)
    assert.equal(getContact(result.book, remote.publicKey).proof.signerProfileId, local.publicKey)
  })

  test('profile scan rejects signed home QR', () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: local.publicKey })
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        identity: remote,
        roomKey: 'd'.repeat(64)
      })
    )

    assert.throws(() => applyMobileProfileQrScan({ book, uri }), /profile QR is required/i)
  })

  test('home scan applies only signed home QR and preserves trust gate result', () => {
    const local = createSigningKeyPair()
    const owner = createSigningKeyPair()
    const book = createContactBook({ ownerProfileId: local.publicKey })
    const uri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'c'.repeat(64),
        identity: owner,
        policy: 'trusted_only',
        roomKey: 'd'.repeat(64)
      })
    )

    const result = applyMobileHomeQrScan({
      book,
      localProfileId: local.publicKey,
      uri
    })

    assert.equal(result.kind, 'home')
    assert.equal(result.ownerProfileId, owner.publicKey)
    assert.equal(result.canEnter, false)
  })
})
