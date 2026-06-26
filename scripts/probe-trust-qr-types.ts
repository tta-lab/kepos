import type {
  SignedHomeAddressPayload,
  SignedTrustInvitePayload
} from '../src/signed-qr-payload.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  decodeQrUri,
  encodeQrUri
} from '../src/signed-qr-payload.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import type { TrustGrant } from '../src/trust-grant.ts'
import { createTrustGrant } from '../src/trust-grant.ts'

const owner = createSigningKeyPair()
const trusted = createSigningKeyPair()

const grant: TrustGrant = createTrustGrant({
  createdAt: 1000,
  ownerIdentity: owner,
  trustedProfileId: trusted.publicKey
})

const invite: SignedTrustInvitePayload = createSignedTrustInvitePayload({
  createdAt: 1000,
  displayName: 'Ada',
  identity: trusted
})

const home: SignedHomeAddressPayload = createSignedHomeAddressPayload({
  address: 'a'.repeat(64),
  createdAt: 1000,
  identity: owner,
  policy: 'trusted_only',
  roomKey: 'b'.repeat(64)
})

if (
  grant.ownerProfileId !== owner.publicKey ||
  decodeQrUri(encodeQrUri(invite)).type !== invite.type ||
  decodeQrUri(encodeQrUri(home)).type !== home.type
) {
  throw new Error('Trust and QR type probe failed')
}
