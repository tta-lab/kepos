import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { getOrCreateMobileProfileId } from '../src/mobile-profile.js'

describe('mobile profile persistence', () => {
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
})

function createFileSystem(files) {
  return {
    makeDirectoryAsync() {},
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
