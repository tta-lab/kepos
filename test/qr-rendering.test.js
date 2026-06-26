import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import QRCode from 'qrcode'

import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  decodeQrUri,
  encodeQrUri,
  verifySignedHomeAddressPayload,
  verifySignedTrustInvitePayload
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

  test('renders signed profile and home QR PNGs that a QR decoder can read', async () => {
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

    assert.equal(decodePngQr(await renderQrPng(profileUri)), profileUri)
    assert.equal(decodePngQr(await renderQrPng(homeUri)), homeUri)
    assert.equal(verifySignedTrustInvitePayload(decodeQrUri(profileUri)), true)
    assert.equal(verifySignedHomeAddressPayload(decodeQrUri(homeUri)), true)
  })
})

function renderQrPng(value) {
  return QRCode.toBuffer(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    type: 'png',
    width: 512
  })
}

function decodePngQr(buffer) {
  const image = PNG.sync.read(buffer)
  const decoded = jsQR(new Uint8ClampedArray(image.data), image.width, image.height)

  assert.ok(decoded, 'QR PNG should be decodable')
  return decoded.data
}
