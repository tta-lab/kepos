import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  createMobileDirectMessageAvatar,
  createMobileTreeholeAuthorAvatar
} from '../src/mobile-avatar-view-model.ts'

test('mobile direct message avatar uses local sender for outgoing messages', () => {
  assert.deepEqual(
    createMobileDirectMessageAvatar(
      {
        direction: 'out',
        fromProfileId: 'ignored',
        nick: 'Ignored'
      },
      []
    ),
    {
      initials: 'Y',
      label: 'You avatar',
      tone: 'avatarTone4'
    }
  )
})

test('mobile direct message avatar prefers trusted contact alias', () => {
  assert.deepEqual(
    createMobileDirectMessageAvatar(
      {
        direction: 'in',
        fromProfileId: 'b'.repeat(64),
        nick: 'Remote Nick'
      },
      [
        {
          alias: 'Trusted Friend',
          avatarUriSnapshot: 'kepos://avatar/trusted-friend',
          profileId: 'b'.repeat(64)
        }
      ]
    ),
    {
      imageUri: 'kepos://avatar/trusted-friend',
      initials: 'TF',
      label: 'Trusted Friend avatar',
      tone: 'avatarTone3'
    }
  )
})

test('mobile direct message avatar resolves stored avatar media snapshots', () => {
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })

  assert.equal(
    createMobileDirectMessageAvatar(
      {
        direction: 'in',
        fromProfileId: 'b'.repeat(64),
        nick: 'Remote Nick'
      },
      [
        {
          alias: 'Trusted Friend',
          avatarMediaSnapshot,
          avatarUriSnapshot: 'kepos://avatar/old',
          profileId: 'b'.repeat(64)
        }
      ],
      (reference) => `file:///avatars/${reference.digest}.png`
    ).imageUri,
    `file:///avatars/${'a'.repeat(64)}.png`
  )
})

test('mobile treehole author avatar uses author display identity', () => {
  assert.deepEqual(
    createMobileTreeholeAuthorAvatar({
      author: 'fallback',
      authorDisplayName: 'Tree Owner',
      authorProfileId: 'c'.repeat(64)
    }),
    {
      initials: 'TO',
      label: 'Tree Owner avatar',
      tone: 'avatarTone1'
    }
  )
})
