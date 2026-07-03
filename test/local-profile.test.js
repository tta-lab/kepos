import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { getOrCreateLocalProfile } from '../src/local-profile.ts'

describe('local profile identity', () => {
  test('creates and persists one local identity key pair', () => {
    const storage = createMemoryStorage()
    const dmEncryptionKeyPair = {
      publicKey: 'd'.repeat(64),
      secretKey: 'e'.repeat(64)
    }
    const profile = getOrCreateLocalProfile({
      createDmEncryptionKeyPair: () => dmEncryptionKeyPair,
      displayName: 'Ada',
      storage
    })

    assert.match(profile.id, /^[0-9a-f]{64}$/)
    assert.equal(profile.id, profile.identity.publicKey)
    assert.equal(profile.displayName, 'Ada')
    assert.deepEqual(JSON.parse(storage.getItem('kepos.v1.identity')), {
      data: {
        publicKey: profile.identity.publicKey,
        secretKey: profile.identity.secretKey
      },
      schemaVersion: 1,
      type: 'kepos.identity'
    })
    assert.deepEqual(JSON.parse(storage.getItem('kepos.v1.home')), {
      data: {
        ownerProfileId: profile.id,
        roomKey: profile.homeRoom.roomKey
      },
      schemaVersion: 1,
      type: 'kepos.home'
    })
    assert.deepEqual(profile.dmEncryptionKeyPair, dmEncryptionKeyPair)
    assert.equal(storage.getItem('kepos.dmEncryption.publicKey'), dmEncryptionKeyPair.publicKey)
    assert.equal(storage.getItem('kepos.dmEncryption.secretKey'), dmEncryptionKeyPair.secretKey)
  })

  test('reuses V1 JSON identity and home room documents with the current display name', () => {
    const publicKey = 'a'.repeat(64)
    const secretKey = 'c'.repeat(128)
    const dmEncryptionKeyPair = {
      publicKey: 'd'.repeat(64),
      secretKey: 'e'.repeat(64)
    }
    const storage = createMemoryStorage([
      [
        'kepos.v1.identity',
        JSON.stringify({
          data: { publicKey, secretKey },
          schemaVersion: 1,
          type: 'kepos.identity'
        })
      ],
      [
        'kepos.v1.home',
        JSON.stringify({
          data: { ownerProfileId: publicKey, roomKey: 'b'.repeat(64) },
          schemaVersion: 1,
          type: 'kepos.home'
        })
      ],
      ['kepos.dmEncryption.publicKey', dmEncryptionKeyPair.publicKey],
      ['kepos.dmEncryption.secretKey', dmEncryptionKeyPair.secretKey]
    ])
    const profile = getOrCreateLocalProfile({
      displayName: '  Neil  ',
      storage
    })

    assert.equal(profile.id, publicKey)
    assert.deepEqual(profile.identity, {
      publicKey,
      secretKey
    })
    assert.equal(profile.displayName, 'Neil')
    assert.equal(profile.homeRoom.roomKey, 'b'.repeat(64))
    assert.equal(profile.homeRoom.ownerProfileId, publicKey)
    assert.deepEqual(profile.dmEncryptionKeyPair, dmEncryptionKeyPair)
  })

  test('persists and restores the local profile avatar uri', () => {
    const storage = createMemoryStorage()
    const identity = {
      publicKey: 'a'.repeat(64),
      secretKey: 'c'.repeat(128)
    }

    const created = getOrCreateLocalProfile({
      avatarUri: ' kepos://avatar/local ',
      createIdentity: () => identity,
      displayName: 'Ada',
      storage
    })
    const restored = getOrCreateLocalProfile({
      createIdentity: () => {
        throw new Error('should reuse stored identity')
      },
      displayName: 'Ada',
      storage
    })

    assert.equal(created.avatarUri, 'kepos://avatar/local')
    assert.equal(restored.avatarUri, 'kepos://avatar/local')
    assert.deepEqual(JSON.parse(storage.getItem('kepos.v1.profile')), {
      data: {
        avatarUri: 'kepos://avatar/local'
      },
      schemaVersion: 1,
      type: 'kepos.profile'
    })
  })

  test('persists and restores the local profile avatar media reference', () => {
    const storage = createMemoryStorage()
    const identity = {
      publicKey: 'a'.repeat(64),
      secretKey: 'c'.repeat(128)
    }
    const avatarMedia = createAvatarMediaReference({
      bytes: Uint8Array.from([1, 2, 3]),
      createdAt: 1000,
      mimeType: 'image/png',
      sha256Hex: () => 'b'.repeat(64)
    })

    const created = getOrCreateLocalProfile({
      avatarMedia,
      avatarUri: avatarMedia.uri,
      createIdentity: () => identity,
      displayName: 'Ada',
      storage
    })
    const restored = getOrCreateLocalProfile({
      createIdentity: () => {
        throw new Error('should reuse stored identity')
      },
      displayName: 'Ada',
      storage
    })

    assert.deepEqual(created.avatarMedia, avatarMedia)
    assert.deepEqual(restored.avatarMedia, avatarMedia)
    assert.deepEqual(JSON.parse(storage.getItem('kepos.v1.profile')), {
      data: {
        avatarMedia,
        avatarUri: avatarMedia.uri
      },
      schemaVersion: 1,
      type: 'kepos.profile'
    })
  })

  test('imports legacy localStorage identity and home keys into V1 JSON documents', () => {
    const publicKey = 'a'.repeat(64)
    const secretKey = 'c'.repeat(128)
    const roomKey = 'b'.repeat(64)
    const storage = createMemoryStorage([
      ['kepos.profile.id', publicKey],
      ['kepos.identity.publicKey', publicKey],
      ['kepos.identity.secretKey', secretKey],
      ['kepos.home.roomKey', roomKey]
    ])

    const profile = getOrCreateLocalProfile({ storage })

    assert.equal(profile.id, publicKey)
    assert.deepEqual(JSON.parse(storage.getItem('kepos.v1.identity')), {
      data: { publicKey, secretKey },
      schemaVersion: 1,
      type: 'kepos.identity'
    })
    assert.deepEqual(JSON.parse(storage.getItem('kepos.v1.home')), {
      data: { ownerProfileId: publicKey, roomKey },
      schemaVersion: 1,
      type: 'kepos.home'
    })
  })

  test('rotates a legacy profile id when the matching identity secret is missing', () => {
    const storage = createMemoryStorage([['kepos.profile.id', 'a'.repeat(64)]])
    const identity = {
      publicKey: 'b'.repeat(64),
      secretKey: 'c'.repeat(128)
    }
    const profile = getOrCreateLocalProfile({
      createIdentity: () => identity,
      storage
    })

    assert.equal(profile.id, identity.publicKey)
    assert.deepEqual(profile.identity, identity)
    assert.equal(storage.getItem('kepos.profile.id'), identity.publicKey)
    assert.equal(storage.getItem('kepos.identity.publicKey'), identity.publicKey)
    assert.equal(storage.getItem('kepos.identity.secretKey'), identity.secretKey)
  })

  test('rejects corrupt stored identity instead of replacing it', () => {
    const storage = createMemoryStorage([
      ['kepos.identity.publicKey', 'a'.repeat(64)],
      ['kepos.identity.secretKey', 'b'.repeat(64)]
    ])

    assert.throws(
      () =>
        getOrCreateLocalProfile({
          createIdentity: () => ({
            publicKey: 'c'.repeat(64),
            secretKey: 'd'.repeat(128)
          }),
          storage
        }),
      /corrupt local identity/i
    )

    assert.equal(storage.getItem('kepos.identity.publicKey'), 'a'.repeat(64))
    assert.equal(storage.getItem('kepos.identity.secretKey'), 'b'.repeat(64))
  })

  test('rejects partial stored identity instead of creating a new one', () => {
    const storage = createMemoryStorage([['kepos.identity.publicKey', 'a'.repeat(64)]])

    assert.throws(
      () =>
        getOrCreateLocalProfile({
          createIdentity: () => ({
            publicKey: 'c'.repeat(64),
            secretKey: 'd'.repeat(128)
          }),
          storage
        }),
      /corrupt local identity/i
    )

    assert.equal(storage.getItem('kepos.identity.publicKey'), 'a'.repeat(64))
    assert.equal(storage.getItem('kepos.identity.secretKey'), null)
  })

  test('rejects corrupt stored home room key instead of replacing it', () => {
    const storage = createMemoryStorage([['kepos.home.roomKey', 'not-a-room-key']])

    assert.throws(
      () =>
        getOrCreateLocalProfile({
          homeRoomKey: 'b'.repeat(64),
          storage
        }),
      /corrupt local home room key/i
    )

    assert.equal(storage.getItem('kepos.home.roomKey'), 'not-a-room-key')
  })

  test('rejects partial stored DM encryption key pair instead of creating a new one', () => {
    const storage = createMemoryStorage([['kepos.dmEncryption.publicKey', 'a'.repeat(64)]])

    assert.throws(
      () =>
        getOrCreateLocalProfile({
          createDmEncryptionKeyPair: () => ({
            publicKey: 'c'.repeat(64),
            secretKey: 'd'.repeat(64)
          }),
          storage
        }),
      /corrupt local DM encryption key pair/i
    )

    assert.equal(storage.getItem('kepos.dmEncryption.publicKey'), 'a'.repeat(64))
    assert.equal(storage.getItem('kepos.dmEncryption.secretKey'), null)
  })
})

function createMemoryStorage(entries = []) {
  const values = new Map(entries)

  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
}
