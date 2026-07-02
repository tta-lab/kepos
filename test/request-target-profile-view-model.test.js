import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createProfileAvatarViewModel } from '../src/profile-avatar-view-model.ts'
import { createRequestTargetProfileViewModel } from '../src/request-target-profile-view-model.ts'

test('request target profile view model formats a limited untrusted profile', () => {
  assert.deepEqual(
    createRequestTargetProfileViewModel({
      requestTarget: {
        copy: 'Write a message below to send the request.',
        displayName: 'Ada',
        avatar: createProfileAvatarViewModel({
          avatarUri: 'kepos://avatar/ada',
          displayName: 'Ada',
          profileId: 'profile-ada'
        }),
        profileId: 'profile-ada',
        shortProfileId: 'short:ada',
        statusLabel: 'Friend request'
      },
      selectedProfileId: 'profile-ada',
      shortenProfileId: (profileId) => `fallback:${profileId}`
    }),
    {
      canRemove: false,
      displayName: 'Ada',
      avatar: createProfileAvatarViewModel({
        avatarUri: 'kepos://avatar/ada',
        displayName: 'Ada',
        profileId: 'profile-ada'
      }),
      enterHomeEnabled: false,
      enterHomeLabel: 'Enter Home',
      messageEnabled: false,
      messageLabel: 'Message',
      profileId: 'profile-ada',
      recentCopy: 'Recent posts will appear after this profile becomes trusted.',
      recentTitle: 'Recent posts',
      relationshipState: 'request_target',
      revokeLabel: 'Request pending',
      shortProfileId: 'short:ada',
      sourceLabel: 'From Profile QR',
      statusLabel: 'Friend request',
      trustedAtLabel: 'Not trusted yet'
    }
  )
})

test('request target profile view model rejects non-selected targets', () => {
  assert.equal(
    createRequestTargetProfileViewModel({
      requestTarget: {
        profileId: 'profile-ada'
      },
      selectedProfileId: 'profile-grace'
    }),
    null
  )
})

test('request target profile view model resolves stored avatar media snapshots', () => {
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })

  const profile = createRequestTargetProfileViewModel({
    requestTarget: {
      avatarMediaSnapshot,
      avatarUri: 'kepos://avatar/old',
      displayName: 'Ada',
      profileId: 'profile-ada'
    },
    resolveAvatarMediaUri: (reference) => `file:///avatars/${reference.digest}.png`,
    selectedProfileId: 'profile-ada'
  })

  assert.equal(profile?.avatar.imageUri, `file:///avatars/${'a'.repeat(64)}.png`)
})

test('request target profile view model falls back to profile id labels', () => {
  assert.deepEqual(
    createRequestTargetProfileViewModel({
      requestTarget: {
        profileId: 'profile-ada'
      },
      selectedProfileId: 'profile-ada',
      shortenProfileId: (profileId) => `short:${profileId}`
    }),
    {
      canRemove: false,
      displayName: 'Profile',
      avatar: createProfileAvatarViewModel({
        displayName: 'Profile',
        profileId: 'profile-ada'
      }),
      enterHomeEnabled: false,
      enterHomeLabel: 'Enter Home',
      messageEnabled: false,
      messageLabel: 'Message',
      profileId: 'profile-ada',
      recentCopy: 'Recent posts will appear after this profile becomes trusted.',
      recentTitle: 'Recent posts',
      relationshipState: 'request_target',
      revokeLabel: 'Request pending',
      shortProfileId: 'short:profile-ada',
      sourceLabel: 'From Profile QR',
      statusLabel: 'Friend request',
      trustedAtLabel: 'Not trusted yet'
    }
  )
})
