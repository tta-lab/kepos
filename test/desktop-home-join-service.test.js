import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook, trustContact } from '../src/contact-book.ts'
import { createDesktopHomeJoinDetails } from '../src/desktop-home-join-service.js'
import { createProfile } from '../src/profile.js'

const identity = {
  publicKey: 'a'.repeat(64),
  secretKey: 'b'.repeat(128)
}
const peerProfileId = 'c'.repeat(64)

function createTrustedBook(ownerProfileId = identity.publicKey) {
  return trustContact(createContactBook({ ownerProfileId }), {
    alias: 'Peer',
    profileId: peerProfileId,
    source: 'profile_qr',
    trustedAt: 123
  })
}

test('desktop home join service prepares owned home join details with treehole policy', () => {
  const profile = createProfile({ displayName: 'Ada', identity })
  const result = createDesktopHomeJoinDetails({
    contactBook: createTrustedBook(profile.id),
    mode: 'host',
    nick: 'Ada',
    profile
  })

  assert.equal(result.mode, 'host')
  assert.equal(result.homeJoinDetails.profileId, profile.id)
  assert.equal(result.homeJoinDetails.ownerProfileId, profile.id)
  assert.equal(result.homeJoinDetails.roomKey, profile.homeRoom.roomKey)
  assert.equal(result.session.nick, 'Ada')
  assert.deepEqual(result.homeJoinDetails.treeholePolicy, {
    ownerProfileId: profile.id,
    revokedProfileIds: [],
    trustedProfileIds: [peerProfileId]
  })
})

test('desktop home join service prepares manual peer join details', () => {
  const profile = createProfile({ displayName: 'Neil', identity })
  const roomKey = 'd'.repeat(64)
  const result = createDesktopHomeJoinDetails({
    contactBook: createTrustedBook(profile.id),
    mode: 'peer',
    nick: 'Neil',
    profile,
    roomKey
  })

  assert.equal(result.mode, 'peer')
  assert.equal(result.homeJoinDetails.address, roomKey)
  assert.equal(result.homeJoinDetails.ownerProfileId, null)
  assert.equal(result.homeJoinDetails.profileId, profile.id)
  assert.equal(result.homeJoinDetails.roomKey, roomKey)
  assert.equal(result.session.roomKey, roomKey)
})

test('desktop home join service prepares signed home address join details', () => {
  const profile = createProfile({ displayName: 'Neil', identity })
  const homeAddress = {
    address: 'e'.repeat(64),
    ownerProfileId: peerProfileId,
    policy: 'trusted_only',
    roomKey: 'f'.repeat(64)
  }
  const result = createDesktopHomeJoinDetails({
    contactBook: createTrustedBook(profile.id),
    homeAddress,
    mode: 'peer',
    nick: 'Neil',
    profile
  })

  assert.equal(result.mode, 'peer')
  assert.equal(result.homeJoinDetails.address, homeAddress.address)
  assert.equal(result.homeJoinDetails.ownerProfileId, peerProfileId)
  assert.equal(result.homeJoinDetails.policy, 'trusted_only')
  assert.equal(result.homeJoinDetails.roomKey, homeAddress.roomKey)
  assert.equal(result.session.profileId, profile.id)
})
