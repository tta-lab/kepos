import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { avatarMediaBase64 } from '../src/avatar-media-storage.ts'
import { createContactBook, trustContact } from '../src/contact-book.ts'
import {
  createMobileLocalAvatarMediaControl,
  storeMobileAvatarMediaBytesControl
} from '../src/mobile-avatar-media-sync.ts'

test('mobile avatar media sync creates a local control frame from stored avatar bytes', async () => {
  const bytes = Uint8Array.from([1, 2, 3])
  const digest = 'a'.repeat(64)
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => digest
  })
  const files = new Map([
    [`file:///app/kepos/v1/avatar-media/sha256/${digest}.png`, avatarMediaBase64.encode(bytes)]
  ])
  const fileSystem = createMemoryFileSystem(files)

  const control = await createMobileLocalAvatarMediaControl({
    baseUri: 'file:///app/',
    fileSystem,
    profileId: 'profile-a',
    reference,
    sha256Hex: () => Promise.resolve(digest)
  })

  assert.deepEqual(control, {
    bytesBase64: avatarMediaBase64.encode(bytes),
    profileId: 'profile-a',
    reference,
    type: 'kepos.avatar.media.bytes.v1'
  })
})

test('mobile avatar media sync stores verified incoming bytes with the Expo file adapter', async () => {
  const bytes = Uint8Array.from([4, 5, 6])
  const digest = 'b'.repeat(64)
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/webp',
    sha256Hex: () => digest
  })
  const book = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    avatarMediaSnapshot: reference,
    profileId: 'profile-b',
    trustedAt: 1000
  })
  const files = new Map()
  const fileSystem = createMemoryFileSystem(files)

  const result = await storeMobileAvatarMediaBytesControl({
    baseUri: 'file:///app/',
    book,
    fileSystem,
    message: {
      bytesBase64: avatarMediaBase64.encode(bytes),
      profileId: 'profile-b',
      reference,
      type: 'kepos.avatar.media.bytes.v1'
    },
    sha256Hex: () => Promise.resolve(digest)
  })

  assert.deepEqual(result, {
    kind: 'avatar_media_stored',
    profileId: 'profile-b',
    storageUri: `file:///app/kepos/v1/avatar-media/sha256/${digest}.webp`
  })
  assert.equal(files.get(result.storageUri), avatarMediaBase64.encode(bytes))
})

function createMemoryFileSystem(files) {
  return {
    makeDirectoryAsync: (path) => files.set(`${path}/.dir`, '1'),
    readAsStringAsync: (path) => {
      const value = files.get(path)
      if (value === undefined) throw new Error('File not found')
      return value
    },
    writeAsStringAsync: (path, value) => files.set(path, value)
  }
}
