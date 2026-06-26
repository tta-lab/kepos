import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { acceptDmThread, createDmThread, revokeDmThread } from '../src/dm-thread.ts'
import {
  loadDmThreadsFromFileSystem,
  loadDmThreadsFromStorage,
  saveDmThreadsToFileSystem,
  saveDmThreadsToStorage
} from '../src/dm-thread-storage.js'

const LOCAL_PROFILE_ID = '1'.repeat(64)
const REMOTE_PROFILE_ID = '2'.repeat(64)
const OTHER_REMOTE_PROFILE_ID = '3'.repeat(64)
const CHANNEL_PUBLIC_KEY = 'a'.repeat(64)
const CHANNEL_DISCOVERY_KEY = 'b'.repeat(64)

describe('DM thread storage', () => {
  test('saves and loads accepted and revoked threads from sync key-value storage', () => {
    const storage = createMemoryStorage()
    const threads = [
      acceptDmThread(createThread({ threadId: 'accepted-thread' }), { acceptedAt: 2000 }),
      revokeDmThread(
        acceptDmThread(
          createThread({
            remoteProfileId: OTHER_REMOTE_PROFILE_ID,
            threadId: 'revoked-thread'
          }),
          { acceptedAt: 3000 }
        ),
        { revokedAt: 4000 }
      )
    ]

    saveDmThreadsToStorage({ ownerProfileId: LOCAL_PROFILE_ID, storage, threads })
    const restored = loadDmThreadsFromStorage({ ownerProfileId: LOCAL_PROFILE_ID, storage })
    const stored = JSON.parse(storage.getItem('kepos.dmThreads.v1'))

    assert.deepEqual(restored, threads)
    assert.equal(stored.version, 1)
    assert.deepEqual(
      stored.threads,
      threads.map((thread) => ({ version: 1, thread }))
    )
  })

  test('returns an empty thread list when sync storage has no saved value', () => {
    const restored = loadDmThreadsFromStorage({
      ownerProfileId: LOCAL_PROFILE_ID,
      storage: createMemoryStorage()
    })

    assert.deepEqual(restored, [])
  })

  test('saves and loads thread collections from async app file storage', async () => {
    const files = new Map()
    const fileSystem = createFileSystem(files)
    const threads = [acceptDmThread(createThread(), { acceptedAt: 2000 })]

    await saveDmThreadsToFileSystem({
      baseUri: 'file:///app/',
      fileSystem,
      threads
    })
    const restored = await loadDmThreadsFromFileSystem({
      baseUri: 'file:///app/',
      fileSystem
    })

    assert.deepEqual(restored, threads)
    assert.equal(files.has('file:///app/kepos/dm/threads.json'), true)
  })

  test('returns an empty thread list when app file storage has no saved value', async () => {
    const restored = await loadDmThreadsFromFileSystem({
      baseUri: 'file:///app/',
      fileSystem: createFileSystem(new Map())
    })

    assert.deepEqual(restored, [])
  })

  test('fails closed on corrupt async app file thread storage', async () => {
    const files = new Map([['file:///app/kepos/dm/threads.json', '{']])

    await assert.rejects(
      () =>
        loadDmThreadsFromFileSystem({
          baseUri: 'file:///app/',
          fileSystem: createFileSystem(files)
        }),
      /corrupt DM thread storage/i
    )
  })
})

function createThread(overrides = {}) {
  return createDmThread({
    channelDiscoveryKey: CHANNEL_DISCOVERY_KEY,
    channelPublicKey: CHANNEL_PUBLIC_KEY,
    createdAt: 1000,
    localProfileId: LOCAL_PROFILE_ID,
    remoteProfileId: REMOTE_PROFILE_ID,
    threadId: 'thread-1',
    ...overrides
  })
}

function createMemoryStorage(entries = []) {
  const values = new Map(entries)

  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
}

function createFileSystem(files) {
  return {
    makeDirectoryAsync(path, options) {
      files.set(`${path}:dir`, options)
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
