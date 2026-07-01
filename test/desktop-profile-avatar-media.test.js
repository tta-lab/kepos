import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { avatarMediaBase64 } from '../src/avatar-media-storage.ts'
import {
  createSha256Hex,
  importDesktopProfileAvatarMedia
} from '../src/desktop-profile-avatar-media.ts'

test('desktop profile avatar media import writes verified image bytes under app storage', async () => {
  const bytes = Uint8Array.from([137, 80, 78, 71])
  const storageBasePath = join(tmpdir(), `kepos-avatar-${Date.now()}`)

  const avatar = await importDesktopProfileAvatarMedia({
    bytesBase64: avatarMediaBase64.encode(bytes),
    createdAt: 1234,
    mimeType: 'image/png',
    storageBasePath
  })

  assert.equal(avatar.avatarMedia.digest, createSha256Hex(bytes))
  assert.equal(avatar.avatarMedia.createdAt, 1234)
  assert.equal(avatar.avatarUri, `kepos://avatar/sha256/${avatar.avatarMedia.digest}`)
  assert.deepEqual(Uint8Array.from(await readFile(avatar.storageUri)), bytes)
})

test('desktop profile avatar media import rejects missing storage', async () => {
  await assert.rejects(
    () =>
      importDesktopProfileAvatarMedia({
        bytesBase64: avatarMediaBase64.encode(Uint8Array.from([1])),
        mimeType: 'image/png',
        storageBasePath: ''
      }),
    /Desktop avatar media storage is unavailable/
  )
})
