import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  getOrCreateMobileHomeRoomKey,
  getOrCreateMobileDmEncryptionKeyPair,
  getOrCreateMobileIdentity,
  getOrCreateMobileProfileId,
  getRequiredMobileDocumentDirectory
} from '../src/mobile-profile.js'

describe('mobile profile persistence', () => {
  test('uses document directory for durable app storage', () => {
    assert.equal(
      getRequiredMobileDocumentDirectory({
        cacheDirectory: 'file:///cache/',
        documentDirectory: 'file:///document/'
      }),
      'file:///document/'
    )
  })

  test('rejects cache-only storage for durable app data', () => {
    assert.throws(
      () =>
        getRequiredMobileDocumentDirectory({
          cacheDirectory: 'file:///cache/',
          documentDirectory: null
        }),
      /app document directory is unavailable/i
    )
  })

  test('reuses profile id from app-private storage', async () => {
    const files = new Map([['file:///app/kepos/profile-id.txt', 'profile-a\n']])

    const profileId = await getOrCreateMobileProfileId({
      baseUri: 'file:///app/',
      createId: () => 'profile-b',
      fileSystem: createFileSystem(files)
    })

    assert.equal(profileId, 'profile-a')
  })

  test('creates and persists profile id when storage is empty', async () => {
    const files = new Map()

    const profileId = await getOrCreateMobileProfileId({
      baseUri: 'file:///app/',
      createId: () => 'profile-a',
      fileSystem: createFileSystem(files)
    })

    assert.equal(profileId, 'profile-a')
    assert.equal(files.get('file:///app/kepos/profile-id.txt'), 'profile-a')
  })

  test('reuses home room key from app-private storage', async () => {
    const files = new Map([
      [
        'file:///app/kepos/v1/home.json',
        JSON.stringify({
          data: { ownerProfileId: 'c'.repeat(64), roomKey: 'a'.repeat(64) },
          schemaVersion: 1,
          type: 'kepos.home'
        })
      ]
    ])

    const roomKey = await getOrCreateMobileHomeRoomKey({
      baseUri: 'file:///app/',
      createKey: () => 'b'.repeat(64),
      fileSystem: createFileSystem(files)
    })

    assert.equal(roomKey, 'a'.repeat(64))
  })

  test('creates and persists home room key when storage is empty', async () => {
    const files = new Map()

    const roomKey = await getOrCreateMobileHomeRoomKey({
      baseUri: 'file:///app/',
      createKey: () => 'b'.repeat(64),
      fileSystem: createFileSystem(files)
    })

    assert.equal(roomKey, 'b'.repeat(64))
    assert.deepEqual(JSON.parse(files.get('file:///app/kepos/v1/home.json')), {
      data: {
        ownerProfileId: null,
        roomKey: 'b'.repeat(64)
      },
      schemaVersion: 1,
      type: 'kepos.home'
    })
  })

  test('reuses identity key pair from app-private storage', async () => {
    const identity = {
      publicKey: 'a'.repeat(64),
      secretKey: 'b'.repeat(128)
    }
    const files = new Map([
      [
        'file:///app/kepos/v1/identity.json',
        JSON.stringify({
          data: identity,
          schemaVersion: 1,
          type: 'kepos.identity'
        })
      ]
    ])

    const storedIdentity = await getOrCreateMobileIdentity({
      baseUri: 'file:///app/',
      createIdentity: () => ({
        publicKey: 'c'.repeat(64),
        secretKey: 'd'.repeat(128)
      }),
      fileSystem: createFileSystem(files)
    })

    assert.deepEqual(storedIdentity, identity)
  })

  test('creates and persists identity key pair when storage is empty', async () => {
    const files = new Map()
    const identity = {
      publicKey: 'c'.repeat(64),
      secretKey: 'd'.repeat(128)
    }

    const storedIdentity = await getOrCreateMobileIdentity({
      baseUri: 'file:///app/',
      createIdentity: () => identity,
      fileSystem: createFileSystem(files)
    })

    assert.deepEqual(storedIdentity, identity)
    assert.deepEqual(JSON.parse(files.get('file:///app/kepos/v1/identity.json')), {
      data: identity,
      schemaVersion: 1,
      type: 'kepos.identity'
    })
    assert.equal(files.get('file:///app/kepos/profile-id.txt'), identity.publicKey)
  })

  test('imports legacy mobile identity and home files into V1 JSON documents', async () => {
    const identity = {
      publicKey: 'a'.repeat(64),
      secretKey: 'b'.repeat(128)
    }
    const roomKey = 'c'.repeat(64)
    const files = new Map([
      ['file:///app/kepos/identity-public-key.txt', `${identity.publicKey}\n`],
      ['file:///app/kepos/identity-secret-key.txt', `${identity.secretKey}\n`],
      ['file:///app/kepos/home-room-key.txt', `${roomKey}\n`]
    ])
    const fileSystem = createFileSystem(files)

    const storedIdentity = await getOrCreateMobileIdentity({
      baseUri: 'file:///app/',
      createIdentity: () => ({
        publicKey: 'd'.repeat(64),
        secretKey: 'e'.repeat(128)
      }),
      fileSystem
    })
    const storedRoomKey = await getOrCreateMobileHomeRoomKey({
      baseUri: 'file:///app/',
      createKey: () => 'f'.repeat(64),
      fileSystem
    })

    assert.deepEqual(storedIdentity, identity)
    assert.equal(storedRoomKey, roomKey)
    assert.deepEqual(JSON.parse(files.get('file:///app/kepos/v1/identity.json')), {
      data: identity,
      schemaVersion: 1,
      type: 'kepos.identity'
    })
    assert.deepEqual(JSON.parse(files.get('file:///app/kepos/v1/home.json')), {
      data: {
        ownerProfileId: identity.publicKey,
        roomKey
      },
      schemaVersion: 1,
      type: 'kepos.home'
    })
  })

  test('rejects corrupt stored identity instead of replacing it', async () => {
    const files = new Map([
      ['file:///app/kepos/identity-public-key.txt', `${'a'.repeat(64)}\n`],
      ['file:///app/kepos/identity-secret-key.txt', `${'b'.repeat(64)}\n`]
    ])

    await assert.rejects(
      () =>
        getOrCreateMobileIdentity({
          baseUri: 'file:///app/',
          createIdentity: () => ({
            publicKey: 'c'.repeat(64),
            secretKey: 'd'.repeat(128)
          }),
          fileSystem: createFileSystem(files)
        }),
      /corrupt mobile identity/i
    )

    assert.equal(files.get('file:///app/kepos/identity-public-key.txt'), 'a'.repeat(64) + '\n')
    assert.equal(files.get('file:///app/kepos/identity-secret-key.txt'), 'b'.repeat(64) + '\n')
  })

  test('rejects partial stored identity instead of creating a new one', async () => {
    const files = new Map([['file:///app/kepos/identity-public-key.txt', `${'a'.repeat(64)}\n`]])

    await assert.rejects(
      () =>
        getOrCreateMobileIdentity({
          baseUri: 'file:///app/',
          createIdentity: () => ({
            publicKey: 'c'.repeat(64),
            secretKey: 'd'.repeat(128)
          }),
          fileSystem: createFileSystem(files)
        }),
      /corrupt mobile identity/i
    )

    assert.equal(files.get('file:///app/kepos/identity-public-key.txt'), 'a'.repeat(64) + '\n')
    assert.equal(files.has('file:///app/kepos/identity-secret-key.txt'), false)
  })

  test('reuses DM encryption key pair from app-private storage', async () => {
    const keyPair = {
      publicKey: 'a'.repeat(64),
      secretKey: 'b'.repeat(64)
    }
    const files = new Map([
      ['file:///app/kepos/dm-encryption-public-key.txt', `${keyPair.publicKey}\n`],
      ['file:///app/kepos/dm-encryption-secret-key.txt', `${keyPair.secretKey}\n`]
    ])

    const storedKeyPair = await getOrCreateMobileDmEncryptionKeyPair({
      baseUri: 'file:///app/',
      createKeyPair: () => ({
        publicKey: 'c'.repeat(64),
        secretKey: 'd'.repeat(64)
      }),
      fileSystem: createFileSystem(files)
    })

    assert.deepEqual(storedKeyPair, keyPair)
  })

  test('creates and persists DM encryption key pair when storage is empty', async () => {
    const files = new Map()
    const keyPair = {
      publicKey: 'c'.repeat(64),
      secretKey: 'd'.repeat(64)
    }

    const storedKeyPair = await getOrCreateMobileDmEncryptionKeyPair({
      baseUri: 'file:///app/',
      createKeyPair: () => keyPair,
      fileSystem: createFileSystem(files)
    })

    assert.deepEqual(storedKeyPair, keyPair)
    assert.equal(files.get('file:///app/kepos/dm-encryption-public-key.txt'), keyPair.publicKey)
    assert.equal(files.get('file:///app/kepos/dm-encryption-secret-key.txt'), keyPair.secretKey)
  })

  test('rejects corrupt stored home room key instead of replacing it', async () => {
    const files = new Map([['file:///app/kepos/home-room-key.txt', 'not-a-room-key\n']])

    await assert.rejects(
      () =>
        getOrCreateMobileHomeRoomKey({
          baseUri: 'file:///app/',
          createKey: () => 'b'.repeat(64),
          fileSystem: createFileSystem(files)
        }),
      /corrupt mobile home room key/i
    )

    assert.equal(files.get('file:///app/kepos/home-room-key.txt'), 'not-a-room-key\n')
  })

  test('rejects partial stored DM encryption key pair instead of creating a new one', async () => {
    const files = new Map([
      ['file:///app/kepos/dm-encryption-public-key.txt', `${'a'.repeat(64)}\n`]
    ])

    await assert.rejects(
      () =>
        getOrCreateMobileDmEncryptionKeyPair({
          baseUri: 'file:///app/',
          createKeyPair: () => ({
            publicKey: 'c'.repeat(64),
            secretKey: 'd'.repeat(64)
          }),
          fileSystem: createFileSystem(files)
        }),
      /corrupt mobile DM encryption key pair/i
    )

    assert.equal(files.get('file:///app/kepos/dm-encryption-public-key.txt'), 'a'.repeat(64) + '\n')
    assert.equal(files.has('file:///app/kepos/dm-encryption-secret-key.txt'), false)
  })
})

function createFileSystem(files) {
  return {
    makeDirectoryAsync() {},
    getInfoAsync(path) {
      return {
        exists: files.has(path)
      }
    },
    readAsStringAsync(path) {
      if (!files.has(path)) {
        throw new Error('File not found')
      }

      return files.get(path)
    },
    writeAsStringAsync(path, value) {
      files.set(path, value)
    }
  }
}
