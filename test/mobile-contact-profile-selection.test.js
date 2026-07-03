import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  createMobileSelectedContactProfileViewModel,
  findPendingProfileRequest
} from '../src/mobile-contact-profile-selection.ts'

const formatDate = (value) => `date:${value}`
const formatTime = (value) => `time:${value}`
const shortenProfileId = (profileId) => `short:${profileId}`

test('mobile contact profile selection projects trusted contacts with recent posts', () => {
  const profile = createMobileSelectedContactProfileViewModel({
    activeHomeOwnerProfileId: 'friend',
    contacts: [
      {
        alias: 'Ada',
        profileId: 'friend',
        source: 'profile_qr',
        trustedAt: 1000
      }
    ],
    formatDate,
    formatTime,
    profileRecentPostCache: {},
    selectedProfileId: 'friend',
    shortenProfileId,
    treeholePosts: [
      {
        createdAt: 2000,
        id: 'post-1',
        text: 'hello'
      }
    ]
  })

  assert.equal(profile?.relationshipState, 'trusted')
  assert.equal(profile?.messageEnabled, true)
  assert.equal(profile?.enterHomeEnabled, false)
  assert.deepEqual(profile?.recentPosts, [
    {
      id: 'post-1',
      metaLabel: 'time:2000 · 0 comments · 0 likes',
      text: 'hello'
    }
  ])
})

test('mobile contact profile selection projects incoming requests with accept payloads', () => {
  const profile = createMobileSelectedContactProfileViewModel({
    formatDate,
    formatTime,
    localProfileId: 'local',
    pendingRequests: [
      {
        alias: 'Ada',
        profileId: 'friend',
        requestedAt: 1000,
        requestId: 'request-1',
        senderEncryptionPublicKey: 'encryption-key',
        text: 'hi'
      }
    ],
    selectedProfileId: 'friend',
    shortenProfileId
  })

  assert.equal(profile?.relationshipState, 'incoming_request')
  assert.equal(profile?.messageEnabled, false)
  assert.deepEqual(profile?.acceptRequest, {
    createdAt: 1000,
    fromProfileId: 'friend',
    requestId: 'request-1',
    senderEncryptionPublicKey: 'encryption-key',
    text: 'hi',
    toProfileId: 'local',
    type: 'kepos.message.request.v1'
  })
  assert.deepEqual(profile?.ignoreRequest, { profileId: 'friend' })
})

test('mobile contact profile selection projects outgoing requests without accept actions', () => {
  const profile = createMobileSelectedContactProfileViewModel({
    formatDate,
    formatTime,
    outgoingRequests: [
      {
        alias: 'Ada',
        deliveryState: 'sent',
        profileId: 'friend',
        requestId: 'request-1',
        text: 'hi'
      }
    ],
    selectedProfileId: 'friend',
    shortenProfileId
  })

  assert.equal(profile?.relationshipState, 'outgoing_request')
  assert.equal(profile?.statusLabel, 'Request sent')
  assert.equal(profile?.acceptRequest, undefined)
  assert.equal(profile?.ignoreRequest, undefined)
})

test('mobile contact profile selection projects blocked contacts as allow-request profiles', () => {
  const profile = createMobileSelectedContactProfileViewModel({
    blockedContacts: [
      {
        alias: 'Ada',
        profileId: 'friend',
        revokedAt: 2000
      }
    ],
    formatDate,
    formatTime,
    selectedProfileId: 'friend',
    shortenProfileId
  })

  assert.equal(profile?.relationshipState, 'removed')
  assert.equal(profile?.canAllowRequests, true)
  assert.equal(profile?.canRemove, false)
  assert.equal(profile?.revokeLabel, 'Allow requests')
})

test('mobile contact profile selection projects request targets without Home entry', () => {
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const profile = createMobileSelectedContactProfileViewModel({
    formatDate,
    formatTime,
    profileRequestTarget: {
      avatarMediaSnapshot,
      displayName: 'Ada',
      profileId: 'friend',
      shortProfileId: 'short:friend',
      statusLabel: 'Friend request'
    },
    selectedProfileId: 'friend',
    shortenProfileId
  })

  assert.equal(profile?.relationshipState, 'request_target')
  assert.equal(profile?.messageEnabled, true)
  assert.equal(profile?.messageLabel, 'Write request')
  assert.equal(profile?.enterHomeEnabled, false)
})

test('mobile contact profile selection finds pending requests without narrowing the type', () => {
  const pending = [{ profileId: 'friend', requestId: 'request-1', senderEncryptionPublicKey: 'k' }]

  assert.equal(findPendingProfileRequest(pending, { profileId: 'friend' }), pending[0])
  assert.equal(findPendingProfileRequest(pending, { profileId: 'other' }), null)
})
