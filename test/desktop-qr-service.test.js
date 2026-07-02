import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createContactBook,
  getContact,
  isContactTrusted,
  trustContact
} from '../src/contact-book.ts'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  applyDesktopHomeQr,
  applyDesktopProfileTrustQr,
  createDesktopShareQrOutputs,
  renderDesktopQrSvg
} from '../src/desktop-qr-service.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  decodeQrUri,
  encodeQrUri
} from '../src/signed-qr-payload.ts'

test('desktop QR service applies profile trust QR and returns treehole policy', () => {
  const localIdentity = createSigningKeyPair()
  const remoteIdentity = createSigningKeyPair()
  const book = createContactBook({ ownerProfileId: localIdentity.publicKey })
  const uri = encodeQrUri(
    createSignedTrustInvitePayload({
      createdAt: 1000,
      displayName: 'Ada',
      identity: remoteIdentity
    })
  )

  const result = applyDesktopProfileTrustQr({
    alias: 'Friend',
    book,
    localIdentity,
    localProfileId: localIdentity.publicKey,
    now: 2000,
    uri
  })

  assert.equal(result.profileId, remoteIdentity.publicKey)
  assert.equal(isContactTrusted(result.book, remoteIdentity.publicKey), true)
  assert.equal(getContact(result.book, remoteIdentity.publicKey).alias, 'Friend')
  assert.deepEqual(result.treeholePolicy, {
    ownerProfileId: localIdentity.publicKey,
    revokedProfileIds: [],
    trustedProfileIds: [remoteIdentity.publicKey]
  })
})

test('desktop QR service rejects non-profile QR in trust flow', () => {
  const localIdentity = createSigningKeyPair()
  const ownerIdentity = createSigningKeyPair()
  const book = createContactBook({ ownerProfileId: localIdentity.publicKey })
  const uri = encodeQrUri(
    createSignedHomeAddressPayload({
      address: 'a'.repeat(64),
      createdAt: 1000,
      identity: ownerIdentity,
      policy: 'public',
      roomKey: 'b'.repeat(64)
    })
  )

  assert.throws(
    () =>
      applyDesktopProfileTrustQr({
        book,
        localIdentity,
        localProfileId: localIdentity.publicKey,
        uri
      }),
    /Profile QR is required/
  )
})

test('desktop QR service applies trusted home QR into join details', () => {
  const localIdentity = createSigningKeyPair()
  const ownerIdentity = createSigningKeyPair()
  const trustedBook = trustContact(createContactBook({ ownerProfileId: localIdentity.publicKey }), {
    alias: 'Owner',
    profileId: ownerIdentity.publicKey,
    trustedAt: 900
  })
  const uri = encodeQrUri(
    createSignedHomeAddressPayload({
      address: 'c'.repeat(64),
      createdAt: 1000,
      identity: ownerIdentity,
      policy: 'trusted_only',
      roomKey: 'd'.repeat(64)
    })
  )

  const homeAddress = applyDesktopHomeQr({
    book: trustedBook,
    localProfileId: localIdentity.publicKey,
    uri
  })

  assert.deepEqual(homeAddress, {
    address: 'c'.repeat(64),
    book: homeAddress.book,
    canEnter: true,
    kind: 'home',
    ownerProfileId: ownerIdentity.publicKey,
    policy: 'trusted_only',
    roomKey: 'd'.repeat(64)
  })
  assert.equal(getContact(homeAddress.book, ownerIdentity.publicKey)?.homeAddress, 'c'.repeat(64))
  assert.equal(getContact(homeAddress.book, ownerIdentity.publicKey)?.homeRoomKey, 'd'.repeat(64))
  assert.equal(getContact(homeAddress.book, ownerIdentity.publicKey)?.homePolicy, 'trusted_only')
  assert.equal(
    getContact(homeAddress.book, ownerIdentity.publicKey)?.proof?.type,
    'kepos.home.address.v1'
  )
})

test('desktop QR service rejects untrusted home QR before join', () => {
  const localIdentity = createSigningKeyPair()
  const ownerIdentity = createSigningKeyPair()
  const book = createContactBook({ ownerProfileId: localIdentity.publicKey })
  const uri = encodeQrUri(
    createSignedHomeAddressPayload({
      address: 'e'.repeat(64),
      createdAt: 1000,
      identity: ownerIdentity,
      policy: 'trusted_only',
      roomKey: 'f'.repeat(64)
    })
  )

  assert.throws(
    () =>
      applyDesktopHomeQr({
        book,
        localProfileId: localIdentity.publicKey,
        uri
      }),
    /This trusted-only home is not trusted locally/
  )
})

test('desktop QR service asks for Debug Home QR when given a profile QR', () => {
  const localIdentity = createSigningKeyPair()
  const remoteIdentity = createSigningKeyPair()
  const book = createContactBook({ ownerProfileId: localIdentity.publicKey })
  const uri = encodeQrUri(
    createSignedTrustInvitePayload({
      createdAt: 1000,
      displayName: 'Ada',
      identity: remoteIdentity
    })
  )

  assert.throws(
    () =>
      applyDesktopHomeQr({
        book,
        localProfileId: localIdentity.publicKey,
        uri
      }),
    /Debug Home QR is required/
  )
})

test('desktop QR service creates signed profile and home share QR outputs', async () => {
  const identity = createSigningKeyPair()

  const result = await createDesktopShareQrOutputs({
    profile: {
      avatarUri: 'kepos://avatar/ada',
      displayName: 'Ada',
      homeRoom: {
        address: 'a'.repeat(64),
        policy: 'trusted_only',
        roomKey: 'b'.repeat(64)
      },
      identity
    }
  })

  assert.equal(result.profileUri.startsWith('kepos://profile?v=1&payload='), true)
  assert.equal(result.homeUri.startsWith('kepos://home?v=1&payload='), true)
  assert.equal(decodeQrUri(result.profileUri).profileId, identity.publicKey)
  assert.equal(decodeQrUri(result.profileUri).avatarUri, 'kepos://avatar/ada')
  assert.equal(decodeQrUri(result.profileUri).homeDescriptor.ownerProfileId, identity.publicKey)
  assert.equal(decodeQrUri(result.profileUri).homeDescriptor.address, 'a'.repeat(64))
  assert.equal(decodeQrUri(result.profileUri).homeDescriptor.roomKey, 'b'.repeat(64))
  assert.equal(decodeQrUri(result.homeUri).ownerProfileId, identity.publicKey)
  assert.match(result.profileSvg, /^<svg/)
  assert.match(result.homeSvg, /^<svg/)
  assert.match(result.profileSvg, /width="172"/)
  assert.match(result.homeSvg, /width="172"/)
})

test('desktop profile QR includes signed avatar media metadata when present', async () => {
  const identity = createSigningKeyPair()
  const avatarMedia = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1002,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })

  const result = await createDesktopShareQrOutputs({
    profile: {
      avatarMedia,
      avatarUri: avatarMedia.uri,
      displayName: 'Ada',
      homeRoom: {
        address: 'a'.repeat(64),
        policy: 'trusted_only',
        roomKey: 'b'.repeat(64)
      },
      identity
    }
  })

  assert.deepEqual(decodeQrUri(result.profileUri).avatarMedia, avatarMedia)
  assert.equal(decodeQrUri(result.profileUri).type, 'kepos.trust.invite.v2')
})

test('desktop QR service uses the browser-safe qrcode renderer for Bare worker', async () => {
  const source = await readFile(new URL('../src/desktop-qr-service.ts', import.meta.url), 'utf8')

  assert.match(source, /qrcode\/lib\/browser\.js/)
  assert.doesNotMatch(source, /from 'qrcode'/)
})

test('desktop QR service renders large QR SVG for dialogs', async () => {
  const svg = await renderDesktopQrSvg('kepos://profile?v=1&payload=test', {
    margin: 4,
    width: 640
  })

  assert.match(svg, /^<svg/)
  assert.match(svg, /width="640"/)
})
