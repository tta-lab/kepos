import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAvatarMediaReference,
  createAvatarMediaStoragePath,
  createAvatarMediaUriResolver,
  isAvatarMediaReference,
  verifyAvatarMediaBytes
} from '../src/avatar-media.ts'

test('avatar media reference records a stable content-addressed image uri', () => {
  const bytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1234,
    mimeType: ' image/png ',
    sha256Hex: () => 'a'.repeat(64)
  })

  assert.deepEqual(reference, {
    byteLength: 4,
    createdAt: 1234,
    digest: 'a'.repeat(64),
    digestAlgorithm: 'sha256',
    mimeType: 'image/png',
    type: 'kepos.avatar.media.v1',
    uri: `kepos://avatar/sha256/${'a'.repeat(64)}`
  })
  assert.equal(isAvatarMediaReference(reference), true)
})

test('avatar media reference fails closed for unsupported or oversized images', () => {
  assert.throws(
    () =>
      createAvatarMediaReference({
        bytes: Uint8Array.from([1, 2, 3]),
        maxBytes: 2,
        mimeType: 'image/png',
        sha256Hex: () => 'a'.repeat(64)
      }),
    /Avatar image is too large/
  )
  assert.throws(
    () =>
      createAvatarMediaReference({
        bytes: Uint8Array.from([1]),
        mimeType: 'image/gif',
        sha256Hex: () => 'a'.repeat(64)
      }),
    /Unsupported avatar image type/
  )
  assert.throws(
    () =>
      createAvatarMediaReference({
        bytes: Uint8Array.from([1]),
        mimeType: 'image/png',
        sha256Hex: () => 'not-a-sha'
      }),
    /Invalid avatar media digest/
  )
})

test('avatar media storage path stays inside app-private avatar media storage', () => {
  const reference = createAvatarMediaReference({
    bytes: Uint8Array.from([1]),
    createdAt: 1234,
    mimeType: 'image/jpeg',
    sha256Hex: () => 'b'.repeat(64)
  })

  assert.equal(
    createAvatarMediaStoragePath({
      baseUri: 'file:///app/',
      reference
    }),
    `file:///app/kepos/v1/avatar-media/sha256/${'b'.repeat(64)}.jpg`
  )
})

test('avatar media uri resolver maps references to app-private render uris', () => {
  const reference = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1234,
    mimeType: 'image/webp',
    sha256Hex: () => 'c'.repeat(64)
  })
  const resolveAvatarMediaUri = createAvatarMediaUriResolver({ baseUri: 'file:///app/' })

  assert.equal(
    resolveAvatarMediaUri(reference),
    `file:///app/kepos/v1/avatar-media/sha256/${'c'.repeat(64)}.webp`
  )
})

test('avatar media byte verification checks downloaded bytes against the reference', () => {
  const reference = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1234,
    mimeType: 'image/webp',
    sha256Hex: () => 'c'.repeat(64)
  })

  assert.equal(
    verifyAvatarMediaBytes({
      bytes: Uint8Array.from([1, 2, 3]),
      reference,
      sha256Hex: () => 'c'.repeat(64)
    }),
    true
  )
  assert.equal(
    verifyAvatarMediaBytes({
      bytes: Uint8Array.from([3, 2, 1]),
      reference,
      sha256Hex: () => 'd'.repeat(64)
    }),
    false
  )
  assert.equal(
    verifyAvatarMediaBytes({
      bytes: Uint8Array.from([1, 2, 3, 4]),
      reference,
      sha256Hex: () => 'c'.repeat(64)
    }),
    false
  )
})
