import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { getOrCreateLocalProfile } from '../src/local-profile.js'

describe('local profile identity', () => {
  test('creates and persists one local profile id', () => {
    const storage = createMemoryStorage()
    const profile = getOrCreateLocalProfile({
      createId: () => 'profile-a',
      displayName: 'Ada',
      storage
    })

    assert.equal(profile.id, 'profile-a')
    assert.equal(profile.displayName, 'Ada')
    assert.equal(storage.getItem('kepos.profile.id'), 'profile-a')
  })

  test('reuses a stored profile id with the current display name', () => {
    const storage = createMemoryStorage([['kepos.profile.id', 'profile-a']])
    const profile = getOrCreateLocalProfile({
      createId: () => 'profile-b',
      displayName: '  Neil  ',
      storage
    })

    assert.equal(profile.id, 'profile-a')
    assert.equal(profile.displayName, 'Neil')
  })
})

function createMemoryStorage(entries = []) {
  const values = new Map(entries)

  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
}
