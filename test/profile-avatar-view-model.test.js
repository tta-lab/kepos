import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createProfileAvatarViewModel } from '../src/profile-avatar-view-model.ts'

test('profile avatar view model creates initials from a display name', () => {
  assert.deepEqual(
    createProfileAvatarViewModel({
      displayName: 'Ada Lovelace',
      profileId: 'b'.repeat(64)
    }),
    {
      initials: 'AL',
      label: 'Ada Lovelace avatar',
      tone: 'avatarTone3'
    }
  )
})

test('profile avatar view model falls back to profile id without leaking the full id', () => {
  assert.deepEqual(
    createProfileAvatarViewModel({
      displayName: '',
      profileId: 'c'.repeat(64)
    }),
    {
      initials: 'CC',
      label: 'Profile cc avatar',
      tone: 'avatarTone1'
    }
  )
})

test('profile avatar view model prefers a real avatar image uri when present', () => {
  assert.deepEqual(
    createProfileAvatarViewModel({
      avatarUri: '  kepos://avatar/profile-b  ',
      displayName: 'Ada Lovelace',
      profileId: 'b'.repeat(64)
    }),
    {
      imageUri: 'kepos://avatar/profile-b',
      initials: 'AL',
      label: 'Ada Lovelace avatar',
      tone: 'avatarTone3'
    }
  )
})

test('profile avatar view model prefers a resolved avatar media reference over a raw uri', () => {
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: new Uint8Array([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })

  assert.deepEqual(
    createProfileAvatarViewModel({
      avatarMediaSnapshot,
      avatarUri: 'kepos://avatar/old',
      displayName: 'Ada Lovelace',
      profileId: 'b'.repeat(64),
      resolveAvatarMediaUri: (reference) => `file:///avatars/${reference.digest}.png`
    }),
    {
      imageUri: `file:///avatars/${'a'.repeat(64)}.png`,
      initials: 'AL',
      label: 'Ada Lovelace avatar',
      tone: 'avatarTone3'
    }
  )
})
