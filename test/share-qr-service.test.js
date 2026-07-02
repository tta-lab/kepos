import assert from 'node:assert/strict'
import test from 'node:test'

import { createSigningKeyPair } from '../src/signed-record.ts'
import { decodeQrUri } from '../src/signed-qr-payload.ts'
import { createShareQrPayloads } from '../src/share-qr-service.ts'

test('share QR product logic makes Profile QR the primary share surface', () => {
  const identity = createSigningKeyPair()
  const result = createShareQrPayloads({
    avatarUri: 'kepos://avatar/ada',
    displayName: 'Ada',
    homeRoom: {
      address: 'a'.repeat(64),
      policy: 'trusted_only',
      roomKey: 'b'.repeat(64)
    },
    identity
  })

  assert.equal(result.primaryUri, result.profileUri)
  assert.equal(result.debugHomeUri, result.homeUri)
  assert.equal(result.productQrKind, 'profile')
  assert.equal(result.homeQrKind, 'advanced_home_descriptor')

  const profile = decodeQrUri(result.profileUri)
  const home = decodeQrUri(result.homeUri)
  assert.equal(profile.type, 'kepos.trust.invite.v1')
  assert.equal(profile.profileId, identity.publicKey)
  assert.equal(profile.avatarUri, 'kepos://avatar/ada')
  assert.equal(profile.homeDescriptor.ownerProfileId, identity.publicKey)
  assert.equal(profile.homeDescriptor.address, 'a'.repeat(64))
  assert.equal(home.type, 'kepos.home.address.v1')
  assert.equal(home.ownerProfileId, identity.publicKey)
})

test('share QR product logic omits Home descriptor when no home exists yet', () => {
  const identity = createSigningKeyPair()
  const result = createShareQrPayloads({
    displayName: 'Ada',
    identity
  })

  assert.equal(result.primaryUri, result.profileUri)
  assert.equal(result.homeUri, '')
  assert.equal(result.debugHomeUri, '')
  assert.equal(decodeQrUri(result.profileUri).homeDescriptor, undefined)
})
