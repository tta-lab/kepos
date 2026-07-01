import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  avatarMediaBase64,
  createAvatarMediaStringFileSystemAdapter,
  createAvatarMediaStore,
  storeVerifiedAvatarMediaBytes
} from '../src/avatar-media-storage.ts'

test('stores verified avatar media bytes at the app-private avatar path', async () => {
  const writes = new Map()
  const bytes = Uint8Array.from([1, 2, 3])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })

  const path = await storeVerifiedAvatarMediaBytes({
    baseUri: 'file:///app/',
    bytes,
    reference,
    sha256Hex: () => 'a'.repeat(64),
    writeBytes: (targetPath, targetBytes) => writes.set(targetPath, targetBytes)
  })

  assert.equal(path, `file:///app/kepos/v1/avatar-media/sha256/${'a'.repeat(64)}.png`)
  assert.deepEqual(writes.get(path), bytes)
})

test('rejects avatar media bytes before writing when verification fails', async () => {
  const writes = new Map()
  const reference = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/webp',
    sha256Hex: () => 'b'.repeat(64)
  })

  await assert.rejects(
    () =>
      storeVerifiedAvatarMediaBytes({
        baseUri: 'file:///app/',
        bytes: Uint8Array.from([9, 9, 9]),
        reference,
        sha256Hex: () => 'c'.repeat(64),
        writeBytes: (targetPath, targetBytes) => writes.set(targetPath, targetBytes)
      }),
    /avatar media verification failed/i
  )
  assert.equal(writes.size, 0)
})

test('avatar media store can read a stored verified avatar by reference', async () => {
  const files = new Map()
  const bytes = Uint8Array.from([1, 2, 3])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/jpeg',
    sha256Hex: () => 'd'.repeat(64)
  })
  const store = createAvatarMediaStore({
    baseUri: 'file:///app/',
    readBytes: (path) => files.get(path),
    sha256Hex: () => 'd'.repeat(64),
    writeBytes: (path, value) => files.set(path, value)
  })

  const path = await store.writeVerified({ bytes, reference })
  const restored = await store.readVerified({ reference })

  assert.equal(path, `file:///app/kepos/v1/avatar-media/sha256/${'d'.repeat(64)}.jpg`)
  assert.deepEqual(restored, bytes)
})

test('avatar media string file-system adapter stores bytes as base64 strings', async () => {
  const files = new Map()
  const directories = []
  const adapter = createAvatarMediaStringFileSystemAdapter({
    base64: {
      decode: (value) => Uint8Array.from(Buffer.from(value, 'base64')),
      encode: (value) => Buffer.from(value).toString('base64')
    },
    fileSystem: {
      makeDirectoryAsync(path, options) {
        directories.push([path, options])
      },
      readAsStringAsync(path, options) {
        assert.deepEqual(options, { encoding: 'base64' })
        if (!files.has(path)) throw new Error('File not found')
        return files.get(path)
      },
      writeAsStringAsync(path, value, options) {
        assert.deepEqual(options, { encoding: 'base64' })
        files.set(path, value)
      }
    },
    readOptions: { encoding: 'base64' },
    writeOptions: { encoding: 'base64' }
  })

  await adapter.writeBytes(
    'file:///app/kepos/v1/avatar-media/sha256/avatar.png',
    Uint8Array.from([1, 2, 3])
  )
  const restored = await adapter.readBytes('file:///app/kepos/v1/avatar-media/sha256/avatar.png')
  const missing = await adapter.readBytes('file:///app/kepos/v1/avatar-media/sha256/missing.png')

  assert.deepEqual(directories, [
    ['file:///app/kepos/v1/avatar-media/sha256', { intermediates: true }]
  ])
  assert.equal(files.get('file:///app/kepos/v1/avatar-media/sha256/avatar.png'), 'AQID')
  assert.deepEqual(restored, Uint8Array.from([1, 2, 3]))
  assert.equal(missing, null)
})

test('avatar media base64 codec round-trips bytes', () => {
  const bytes = Uint8Array.from([0, 1, 2, 253, 254, 255])

  const encoded = avatarMediaBase64.encode(bytes)

  assert.equal(encoded, 'AAEC/f7/')
  assert.deepEqual(avatarMediaBase64.decode(encoded), bytes)
})

test('avatar media string file-system adapter uses the shared base64 codec by default', async () => {
  const files = new Map()
  const adapter = createAvatarMediaStringFileSystemAdapter({
    fileSystem: {
      readAsStringAsync(path) {
        return files.get(path)
      },
      writeAsStringAsync(path, value) {
        files.set(path, value)
      }
    }
  })

  await adapter.writeBytes(
    'file:///app/kepos/v1/avatar-media/sha256/avatar.png',
    Uint8Array.from([1, 2, 3])
  )

  assert.equal(files.get('file:///app/kepos/v1/avatar-media/sha256/avatar.png'), 'AQID')
  assert.deepEqual(
    await adapter.readBytes('file:///app/kepos/v1/avatar-media/sha256/avatar.png'),
    Uint8Array.from([1, 2, 3])
  )
})
