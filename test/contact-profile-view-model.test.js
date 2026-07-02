import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createContactProfileViewModel } from '../src/contact-profile-view-model.ts'

test('contact profile view model formats trusted contact profile actions', () => {
  const profileId = 'b'.repeat(64)

  assert.deepEqual(
    createContactProfileViewModel({
      contact: {
        alias: 'Ada',
        homeAddress: 'c'.repeat(64),
        homeExpiresAt: 9999999999999,
        homeRoomKey: 'd'.repeat(64),
        proof: { signature: 'owner-proof' },
        profileId,
        source: 'profile_qr',
        trustedAt: 1000
      },
      formatDate: () => 'Jan 1, 1970',
      shortenProfileId: (value) => `short:${value}`
    }),
    {
      avatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone3'
      },
      displayName: 'Ada',
      enterHomeEnabled: true,
      enterHomeLabel: 'Enter Home',
      messageLabel: 'Message',
      profileId,
      recentCopy: 'Posts from this profile will appear after you enter their home.',
      recentTitle: 'Recent posts',
      revokeLabel: 'Remove friend',
      shortProfileId: `short:${profileId}`,
      sourceLabel: 'From Profile QR',
      statusLabel: 'Trusted',
      trustedAtLabel: 'Trusted Jan 1, 1970'
    }
  )
})

test('contact profile view model resolves stored avatar media snapshots', () => {
  const profileId = 'b'.repeat(64)
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: new Uint8Array([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })

  const profile = createContactProfileViewModel({
    contact: {
      alias: 'Ada',
      avatarMediaSnapshot,
      avatarUriSnapshot: 'kepos://avatar/old',
      profileId,
      trustedAt: 1000
    },
    formatDate: () => 'Jan 1, 1970',
    resolveAvatarMediaUri: (reference) => `file:///avatars/${reference.digest}.png`,
    shortenProfileId: (value) => `short:${value}`
  })

  assert.equal(profile.avatar.imageUri, `file:///avatars/${'a'.repeat(64)}.png`)
})

test('contact profile view model disables home entry without owner proof', () => {
  const profileId = 'b'.repeat(64)

  const profile = createContactProfileViewModel({
    contact: {
      alias: 'Ada',
      homeAddress: 'c'.repeat(64),
      homeRoomKey: 'd'.repeat(64),
      profileId,
      source: 'profile_qr',
      trustedAt: 1000
    },
    formatDate: () => 'Jan 1, 1970',
    shortenProfileId: (value) => `short:${value}`
  })

  assert.equal(profile.enterHomeEnabled, false)
})

test('contact profile view model disables expired home descriptors', () => {
  const profileId = 'b'.repeat(64)

  const profile = createContactProfileViewModel({
    contact: {
      alias: 'Ada',
      homeAddress: 'c'.repeat(64),
      homeExpiresAt: 1,
      homeRoomKey: 'd'.repeat(64),
      proof: { signature: 'owner-proof' },
      profileId,
      source: 'profile_qr',
      trustedAt: 1000
    },
    formatDate: () => 'Jan 1, 1970',
    shortenProfileId: (value) => `short:${value}`
  })

  assert.equal(profile.enterHomeEnabled, false)
})

test('contact profile view model uses stable fallbacks', () => {
  const profileId = 'b'.repeat(64)

  assert.deepEqual(
    createContactProfileViewModel({
      contact: {
        displayNameSnapshot: ' Grace ',
        profileId,
        trustedAt: undefined
      },
      formatDate: () => 'unused',
      shortenProfileId: (value) => `short:${value}`
    }),
    {
      avatar: {
        initials: 'G',
        label: 'Grace avatar',
        tone: 'avatarTone3'
      },
      displayName: 'Grace',
      enterHomeEnabled: false,
      enterHomeLabel: 'Enter Home',
      messageLabel: 'Message',
      profileId,
      recentCopy: 'Posts from this profile will appear after you enter their home.',
      recentTitle: 'Recent posts',
      revokeLabel: 'Remove friend',
      shortProfileId: `short:${profileId}`,
      sourceLabel: 'From this device',
      statusLabel: 'Trusted',
      trustedAtLabel: 'Trusted recently'
    }
  )
})

test('contact profile view model presents message-request trust as friendship', () => {
  const profileId = 'b'.repeat(64)

  const profile = createContactProfileViewModel({
    contact: {
      alias: 'Ada',
      profileId,
      source: 'message_request',
      trustedAt: 1000
    },
    formatDate: () => 'Jan 1, 1970',
    shortenProfileId: (value) => `short:${value}`
  })

  assert.equal(profile.sourceLabel, 'From Friend request')
})

test('contact profile view model formats non-trusted request states', () => {
  const profileId = 'b'.repeat(64)

  assert.deepEqual(
    createContactProfileViewModel({
      contact: {
        alias: 'Ada',
        profileId,
        source: 'profile_qr'
      },
      deliveryState: 'delivered',
      formatDate: () => 'unused',
      relationshipState: 'outgoing_request',
      shortenProfileId: (value) => `short:${value}`
    }),
    {
      avatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone3'
      },
      displayName: 'Ada',
      enterHomeEnabled: false,
      enterHomeLabel: 'Enter Home',
      messageLabel: 'Message',
      profileId,
      recentCopy: 'Recent posts will appear after this profile becomes trusted.',
      recentTitle: 'Recent posts',
      revokeLabel: 'Request pending',
      shortProfileId: `short:${profileId}`,
      sourceLabel: 'From Profile QR',
      statusLabel: 'Request delivered',
      trustedAtLabel: 'Not trusted yet'
    }
  )
})

test('contact profile view model formats ignored and removed states', () => {
  const ignoredProfileId = 'b'.repeat(64)
  const removedProfileId = 'c'.repeat(64)

  assert.equal(
    createContactProfileViewModel({
      contact: {
        alias: 'Ada',
        profileId: ignoredProfileId,
        requestIgnoredAt: 1000
      },
      formatDate: (value) => `date:${value}`,
      shortenProfileId: (value) => `short:${value}`
    }).trustedAtLabel,
    'Ignored date:1000'
  )
  assert.equal(
    createContactProfileViewModel({
      contact: {
        alias: 'Grace',
        profileId: removedProfileId,
        revokedAt: 2000
      },
      formatDate: (value) => `date:${value}`,
      shortenProfileId: (value) => `short:${value}`
    }).statusLabel,
    'Removed'
  )
})

test('contact profile view model falls back to short fingerprint instead of raw profile id', () => {
  const profileId = 'b'.repeat(64)

  const profile = createContactProfileViewModel({
    contact: {
      profileId,
      trustedAt: undefined
    },
    formatDate: () => 'unused',
    shortenProfileId: (value) => `short:${value.slice(0, 6)}`
  })

  assert.equal(profile.displayName, 'Profile short:bbbbbb')
  assert.equal(profile.shortProfileId, 'short:bbbbbb')
  assert.equal(profile.profileId, profileId)
})
