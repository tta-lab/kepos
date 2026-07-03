import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  createProfileSnapshot,
  getLatestProfileSnapshot,
  mergeProfileSnapshots
} from '../src/profile-snapshot.ts'

test('creates a versioned profile snapshot from display fields', () => {
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })

  assert.deepEqual(
    createProfileSnapshot({
      avatarMediaSnapshot,
      avatarUriSnapshot: avatarMediaSnapshot.uri,
      capturedAt: 2000,
      displayNameSnapshot: ' Ada ',
      profileId: ' profile-a ',
      source: ' profile_qr '
    }),
    {
      avatarMediaSnapshot,
      avatarUriSnapshot: avatarMediaSnapshot.uri,
      capturedAt: 2000,
      displayNameSnapshot: 'Ada',
      profileId: 'profile-a',
      source: 'profile_qr',
      version: 1
    }
  )
})

test('profile snapshot requires useful display data', () => {
  assert.throws(
    () =>
      createProfileSnapshot({
        capturedAt: 1000,
        profileId: 'profile-a'
      }),
    /Profile snapshot display data is required/
  )
})

test('profile snapshot merge deduplicates display-equivalent snapshots and keeps latest first', () => {
  const first = createProfileSnapshot({
    avatarUriSnapshot: 'kepos://avatar/one',
    capturedAt: 1000,
    displayNameSnapshot: 'Ada',
    profileId: 'profile-a'
  })
  const duplicate = createProfileSnapshot({
    avatarUriSnapshot: 'kepos://avatar/one',
    capturedAt: 2000,
    displayNameSnapshot: 'Ada',
    profileId: 'profile-a'
  })
  const renamed = createProfileSnapshot({
    avatarUriSnapshot: 'kepos://avatar/two',
    capturedAt: 3000,
    displayNameSnapshot: 'Ada L.',
    profileId: 'profile-a'
  })

  assert.deepEqual(mergeProfileSnapshots([first], duplicate), [duplicate])
  assert.deepEqual(mergeProfileSnapshots([first], renamed), [renamed, first])
  assert.deepEqual(getLatestProfileSnapshot([first, renamed]), renamed)
})

test('profile snapshot merge drops corrupt historical display snapshots', () => {
  const valid = createProfileSnapshot({
    capturedAt: 1000,
    displayNameSnapshot: 'Ada',
    profileId: 'profile-a'
  })

  assert.deepEqual(
    mergeProfileSnapshots([
      valid,
      { capturedAt: 2000, displayNameSnapshot: 'Bad', profileId: 'profile-a', version: 99 },
      { capturedAt: -1, displayNameSnapshot: 'Also bad', profileId: 'profile-a', version: 1 }
    ]),
    [valid]
  )
})
