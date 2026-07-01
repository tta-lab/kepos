import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  getMobileBackendStorageBasePath,
  loadMobileRuntimeProfile
} from '../src/mobile-profile-bootstrap.ts'

test('mobile backend storage base path uses durable document storage', async () => {
  const directories = []
  const fileSystem = createFileSystem(new Map(), { directories })

  const basePath = await getMobileBackendStorageBasePath({
    fileSystem: {
      ...fileSystem,
      documentDirectory: 'file:///document//'
    }
  })

  assert.equal(basePath, 'file:///document/kepos')
  assert.deepEqual(directories, [['file:///document/kepos', { intermediates: true }]])
})

test('mobile runtime profile bootstraps identity, home, contact book, threads, and recent posts', async () => {
  const avatarMedia = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'd'.repeat(64)
  })
  const files = new Map([
    [
      'file:///app/kepos/v1/profile.json',
      JSON.stringify({
        data: { avatarMedia, avatarUri: avatarMedia.uri },
        schemaVersion: 1,
        type: 'kepos.profile'
      })
    ]
  ])

  const profile = await loadMobileRuntimeProfile({
    createHomeRoomKey: () => 'b'.repeat(64),
    createIdentity: () => ({
      publicKey: 'a'.repeat(64),
      secretKey: 'c'.repeat(128)
    }),
    fileSystem: {
      ...createFileSystem(files),
      documentDirectory: 'file:///app/'
    }
  })

  assert.equal(profile.profileId, 'a'.repeat(64))
  assert.equal(profile.identity.publicKey, 'a'.repeat(64))
  assert.equal(profile.homeRoomKey, 'b'.repeat(64))
  assert.deepEqual(profile.avatarMedia, avatarMedia)
  assert.equal(profile.avatarUri, avatarMedia.uri)
  assert.equal(profile.contactBook.ownerProfileId, 'a'.repeat(64))
  assert.deepEqual(profile.dmThreads, [])
  assert.deepEqual(profile.profileRecentPostCache, {})
  assert.deepEqual(profile.treeholePolicy, {
    ownerProfileId: 'a'.repeat(64),
    revokedProfileIds: [],
    trustedProfileIds: []
  })
})

function createFileSystem(files, { directories = [] } = {}) {
  return {
    documentDirectory: 'file:///app/',
    makeDirectoryAsync(path, options) {
      directories.push([path, options])
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
