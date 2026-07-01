import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { avatarMediaBase64 } from '../src/avatar-media-storage.ts'
import { createContactBook, recordMessageRequest, trustContact } from '../src/contact-book.ts'
import {
  createAvatarMediaBytesControl,
  storeAvatarMediaBytesControl
} from '../src/avatar-media-sync.ts'

test('avatar media sync stores bytes only for a known signed avatar reference', async () => {
  const bytes = Uint8Array.from([1, 2, 3])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const book = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    avatarMediaSnapshot: reference,
    profileId: 'profile-a',
    trustedAt: 1000
  })
  const writes = new Map()

  const result = await storeAvatarMediaBytesControl({
    baseUri: 'file:///app/',
    book,
    message: createAvatarMediaBytesControl({
      bytes,
      profileId: 'profile-a',
      reference
    }),
    sha256Hex: () => 'a'.repeat(64),
    writeBytes: (path, value) => writes.set(path, value)
  })

  assert.deepEqual(result, {
    kind: 'avatar_media_stored',
    profileId: 'profile-a',
    storageUri: `file:///app/kepos/v1/avatar-media/sha256/${'a'.repeat(64)}.png`
  })
  assert.deepEqual(writes.get(result.storageUri), bytes)
})

test('avatar media sync accepts pending request avatar references before trust', async () => {
  const bytes = Uint8Array.from([4, 5, 6])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/webp',
    sha256Hex: () => 'b'.repeat(64)
  })
  const book = recordMessageRequest(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    avatarMediaSnapshot: reference,
    profileId: 'profile-b',
    requestId: 'request-1',
    source: 'profile_qr'
  })
  const writes = new Map()

  const result = await storeAvatarMediaBytesControl({
    baseUri: 'file:///app/',
    book,
    message: createAvatarMediaBytesControl({
      bytes,
      profileId: 'profile-b',
      reference
    }),
    sha256Hex: () => 'b'.repeat(64),
    writeBytes: (path, value) => writes.set(path, value)
  })

  assert.equal(result.storageUri, `file:///app/kepos/v1/avatar-media/sha256/${'b'.repeat(64)}.webp`)
  assert.deepEqual(writes.get(result.storageUri), bytes)
})

test('avatar media sync ignores bytes when metadata is unknown or mismatched', async () => {
  const bytes = Uint8Array.from([1, 2, 3])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/jpeg',
    sha256Hex: () => 'c'.repeat(64)
  })
  const otherReference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/jpeg',
    sha256Hex: () => 'd'.repeat(64)
  })
  const book = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    avatarMediaSnapshot: otherReference,
    profileId: 'profile-a',
    trustedAt: 1000
  })
  const writes = []

  assert.equal(
    await storeAvatarMediaBytesControl({
      baseUri: 'file:///app/',
      book,
      message: createAvatarMediaBytesControl({
        bytes,
        profileId: 'profile-a',
        reference
      }),
      sha256Hex: () => 'c'.repeat(64),
      writeBytes: (path) => writes.push(path)
    }),
    null
  )
  assert.deepEqual(writes, [])
})

test('avatar media sync rejects tampered bytes before writing', async () => {
  const reference = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'e'.repeat(64)
  })
  const book = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    avatarMediaSnapshot: reference,
    profileId: 'profile-a',
    trustedAt: 1000
  })
  const writes = []

  await assert.rejects(
    () =>
      storeAvatarMediaBytesControl({
        baseUri: 'file:///app/',
        book,
        message: {
          bytesBase64: avatarMediaBase64.encode(Uint8Array.from([9, 9, 9])),
          profileId: 'profile-a',
          reference,
          type: 'kepos.avatar.media.bytes.v1'
        },
        sha256Hex: () => 'f'.repeat(64),
        writeBytes: (path) => writes.push(path)
      }),
    /avatar media verification failed/i
  )
  assert.deepEqual(writes, [])
})
