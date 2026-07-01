import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createContactBook,
  getContact,
  loadContactBookFromFileSystem,
  loadContactBookFromStorage,
  recordOutgoingFriendRequest,
  saveContactBookToFileSystem,
  saveContactBookToStorage,
  trustContact
} from '../src/contact-book-storage.ts'

describe('contact book storage', () => {
  test('saves and loads contact books from sync key-value storage', () => {
    const storage = createMemoryStorage()
    const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 1000
    })

    saveContactBookToStorage({ book, storage })
    const restored = loadContactBookFromStorage({ ownerProfileId: 'owner-a', storage })

    assert.equal(getContact(restored, 'profile-b').alias, 'Ada')
  })

  test('saves and loads outgoing friend requests from sync key-value storage', () => {
    const storage = createMemoryStorage()
    const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      alias: 'Ada',
      profileId: 'profile-b',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'profile_qr',
      text: 'hi'
    })

    saveContactBookToStorage({ book, storage })
    const restored = loadContactBookFromStorage({ ownerProfileId: 'owner-a', storage })

    assert.equal(restored.outgoingRequestsByProfileId.get('profile-b').requestId, 'request-1')
    assert.equal(getContact(restored, 'profile-b').alias, 'Ada')
  })

  test('creates an empty book when sync storage has no saved value', () => {
    const restored = loadContactBookFromStorage({
      ownerProfileId: 'owner-a',
      storage: createMemoryStorage()
    })

    assert.equal(restored.ownerProfileId, 'owner-a')
    assert.equal(restored.contactsByProfileId.size, 0)
  })

  test('saves and loads contact books from async app file storage', async () => {
    const files = new Map()
    const fileSystem = createFileSystem(files)
    const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
      profileId: 'profile-b',
      alias: 'Ada',
      trustedAt: 1000
    })

    await saveContactBookToFileSystem({
      baseUri: 'file:///app/',
      book,
      fileSystem
    })
    const restored = await loadContactBookFromFileSystem({
      baseUri: 'file:///app/',
      fileSystem,
      ownerProfileId: 'owner-a'
    })

    assert.equal(getContact(restored, 'profile-b').alias, 'Ada')
    assert.equal(files.has('file:///app/kepos/contact-book.json'), true)
  })

  test('saves and loads outgoing friend requests from async app file storage', async () => {
    const files = new Map()
    const fileSystem = createFileSystem(files)
    const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
      alias: 'Ada',
      profileId: 'profile-b',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'profile_qr',
      text: 'hi'
    })

    await saveContactBookToFileSystem({
      baseUri: 'file:///app/',
      book,
      fileSystem
    })
    const restored = await loadContactBookFromFileSystem({
      baseUri: 'file:///app/',
      fileSystem,
      ownerProfileId: 'owner-a'
    })

    assert.equal(restored.outgoingRequestsByProfileId.get('profile-b').requestId, 'request-1')
    assert.equal(restored.outgoingRequestsByProfileId.get('profile-b').text, 'hi')
    assert.equal(getContact(restored, 'profile-b').alias, 'Ada')
  })

  test('fails closed on corrupt async app file contact book storage', async () => {
    const files = new Map([['file:///app/kepos/contact-book.json', '{']])

    await assert.rejects(
      () =>
        loadContactBookFromFileSystem({
          baseUri: 'file:///app/',
          fileSystem: createFileSystem(files),
          ownerProfileId: 'owner-a'
        }),
      /corrupt contact book storage/i
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
