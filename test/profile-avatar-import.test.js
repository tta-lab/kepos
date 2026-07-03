import assert from 'node:assert/strict'
import test from 'node:test'
import { importProfileAvatarMedia } from '../src/profile-avatar-import.ts'

test('profile avatar import creates and stores verified avatar media', async () => {
  const writes = []
  const bytes = Uint8Array.from([1, 2, 3])

  const result = await importProfileAvatarMedia({
    baseUri: 'file:///app/',
    bytes,
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64),
    writeBytes: (path, value) => writes.push([path, value])
  })

  assert.deepEqual(result.avatarMedia, {
    byteLength: 3,
    createdAt: 1000,
    digest: 'a'.repeat(64),
    digestAlgorithm: 'sha256',
    mimeType: 'image/png',
    type: 'kepos.avatar.media.v1',
    uri: `kepos://avatar/sha256/${'a'.repeat(64)}`
  })
  assert.equal(result.avatarUri, result.avatarMedia.uri)
  assert.equal(result.storageUri, `file:///app/kepos/v1/avatar-media/sha256/${'a'.repeat(64)}.png`)
  assert.deepEqual(writes, [[result.storageUri, bytes]])
})

test('profile avatar import rejects invalid images before writing bytes', async () => {
  const writes = []

  await assert.rejects(
    () =>
      importProfileAvatarMedia({
        baseUri: 'file:///app/',
        bytes: Uint8Array.from([1, 2, 3]),
        createdAt: 1000,
        mimeType: 'image/gif',
        sha256Hex: () => 'b'.repeat(64),
        writeBytes: (path, value) => writes.push([path, value])
      }),
    /unsupported avatar image type/i
  )

  assert.deepEqual(writes, [])
})
