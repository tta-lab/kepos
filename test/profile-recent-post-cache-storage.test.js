import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  loadProfileRecentPostCacheFromFileSystem,
  loadProfileRecentPostCacheFromStorage,
  saveProfileRecentPostCacheToFileSystem,
  saveProfileRecentPostCacheToStorage,
  updateProfileRecentPostCache
} from '../src/profile-recent-post-cache-storage.ts'

describe('profile recent post cache storage', () => {
  test('updates a profile cache with serializable post summaries', () => {
    const cache = updateProfileRecentPostCache(
      {},
      {
        ownerProfileId: 'profile-a',
        posts: [
          {
            comments: [{ id: 'comment-1' }],
            createdAt: 1000,
            id: 'post-1',
            likes: new Set(['a', 'b']),
            text: ' hello '
          },
          {
            commentCount: 3,
            createdAt: 2000,
            id: 'post-2',
            likeCount: 4,
            text: 'second'
          },
          {
            createdAt: 3000,
            id: 'post-3',
            text: ''
          }
        ]
      }
    )

    assert.deepEqual(cache, {
      'profile-a': [
        {
          commentCount: 1,
          createdAt: 1000,
          id: 'post-1',
          likeCount: 2,
          text: 'hello'
        },
        {
          commentCount: 3,
          createdAt: 2000,
          id: 'post-2',
          likeCount: 4,
          text: 'second'
        }
      ]
    })
  })

  test('saves and loads cache from sync key-value storage', () => {
    const storage = createMemoryStorage()
    const cache = {
      'profile-a': [{ commentCount: 1, createdAt: 1000, id: 'post-1', likeCount: 2, text: 'hi' }]
    }

    saveProfileRecentPostCacheToStorage({ cache, storage })
    const restored = loadProfileRecentPostCacheFromStorage({ storage })

    assert.deepEqual(restored, cache)
  })

  test('saves and loads cache from async app file storage', async () => {
    const files = new Map()
    const fileSystem = createFileSystem(files)
    const cache = {
      'profile-a': [{ commentCount: 1, createdAt: 1000, id: 'post-1', likeCount: 2, text: 'hi' }]
    }

    await saveProfileRecentPostCacheToFileSystem({
      baseUri: 'file:///app/',
      cache,
      fileSystem
    })
    const restored = await loadProfileRecentPostCacheFromFileSystem({
      baseUri: 'file:///app/',
      fileSystem
    })

    assert.deepEqual(restored, cache)
    assert.equal(files.has('file:///app/kepos/profile-recent-post-cache.json'), true)
  })

  test('returns an empty cache when async app file storage is missing', async () => {
    const restored = await loadProfileRecentPostCacheFromFileSystem({
      baseUri: 'file:///app/',
      fileSystem: createFileSystem(new Map())
    })

    assert.deepEqual(restored, {})
  })

  test('drops corrupt optional cache data instead of blocking startup', async () => {
    const storage = createMemoryStorage([['kepos.profileRecentPostCache.v1', '{bad json']])
    const files = new Map([['file:///app/kepos/profile-recent-post-cache.json', '{bad json']])

    assert.deepEqual(loadProfileRecentPostCacheFromStorage({ storage }), {})
    assert.deepEqual(
      await loadProfileRecentPostCacheFromFileSystem({
        baseUri: 'file:///app/',
        fileSystem: createFileSystem(files)
      }),
      {}
    )
  })
})

function createMemoryStorage(entries = []) {
  const values = new Map(entries)

  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
}

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
