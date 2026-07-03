import assert from 'node:assert/strict'
import test from 'node:test'
import { avatarMediaBase64 } from '../src/avatar-media-storage.ts'
import { importMobileProfileAvatarMedia } from '../src/mobile-profile-avatar-media.ts'

test('mobile profile avatar media import reads picked image bytes and saves profile document', async () => {
  const bytes = Uint8Array.from([1, 2, 3, 4])
  const files = new Map([['file:///picked/avatar.png', avatarMediaBase64.encode(bytes)]])
  const readOptions = []
  const fileSystem = {
    documentDirectory: 'file:///app/',
    makeDirectoryAsync: (path) => files.set(`${path}/.dir`, '1'),
    readAsStringAsync: (path, options) => {
      readOptions.push([path, options])
      return files.get(path)
    },
    writeAsStringAsync: (path, value) => files.set(path, value)
  }

  const avatar = await importMobileProfileAvatarMedia({
    baseUri: 'file:///app/',
    fileSystem,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64),
    sourceUri: 'file:///picked/avatar.png'
  })

  assert.equal(avatar.avatarMedia.digest, 'a'.repeat(64))
  assert.equal(avatar.avatarUri, `kepos://avatar/sha256/${'a'.repeat(64)}`)
  assert.deepEqual(readOptions, [['file:///picked/avatar.png', { encoding: 'base64' }]])
  assert.equal(
    files.get(`file:///app/kepos/v1/avatar-media/sha256/${'a'.repeat(64)}.png`),
    avatarMediaBase64.encode(bytes)
  )
  assert.deepEqual(JSON.parse(files.get('file:///app/kepos/v1/profile.json')), {
    data: {
      avatarMedia: avatar.avatarMedia,
      avatarUri: avatar.avatarUri
    },
    schemaVersion: 1,
    type: 'kepos.profile'
  })
})
