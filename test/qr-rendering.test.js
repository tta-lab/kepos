import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import QRCode from 'qrcode'

import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

describe('QR rendering', () => {
  test('renders signed profile and home URIs as SVG QR codes', async () => {
    const identity = createSigningKeyPair()
    const profileUri = encodeQrUri(
      createSignedTrustInvitePayload({
        displayName: 'Ada',
        identity
      })
    )
    const homeUri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'a'.repeat(64),
        identity,
        policy: 'trusted_only',
        roomKey: 'b'.repeat(64)
      })
    )

    const profileSvg = await QRCode.toString(profileUri, { errorCorrectionLevel: 'M', type: 'svg' })
    const homeSvg = await QRCode.toString(homeUri, { errorCorrectionLevel: 'M', type: 'svg' })

    assert.match(profileSvg, /^<svg/)
    assert.match(homeSvg, /^<svg/)
    assert.match(profileSvg, /path/)
    assert.match(homeSvg, /path/)
  })
})
