import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createSignedDmMessage } from '../src/dm-message.ts'
import {
  loadDmMessagesFromFileSystem,
  loadDmMessagesFromStorage,
  mergeDmMessages,
  saveDmMessagesToFileSystem,
  saveDmMessagesToStorage
} from '../src/dm-message-storage.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

const OWNER_PROFILE_ID = '1'.repeat(64)
const THREAD_ID = 'thread-1'

describe('DM message storage', () => {
  test('saves and loads verified signed messages from sync storage', () => {
    const storage = createMemoryStorage()
    const sender = createSigningKeyPair()
    const messages = [
      createSignedDmMessage({
        createdAt: 1000,
        identity: sender,
        messageId: 'message-1',
        text: 'hello',
        threadId: THREAD_ID
      })
    ]

    saveDmMessagesToStorage({
      messages,
      ownerProfileId: OWNER_PROFILE_ID,
      storage,
      threadId: THREAD_ID
    })

    assert.deepEqual(
      loadDmMessagesFromStorage({
        ownerProfileId: OWNER_PROFILE_ID,
        storage,
        threadId: THREAD_ID
      }),
      messages
    )
  })

  test('rejects tampered stored messages', () => {
    const sender = createSigningKeyPair()
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'message-1',
      text: 'hello',
      threadId: THREAD_ID
    })
    const storage = createMemoryStorage([
      [
        `kepos.dmMessages.v1.${OWNER_PROFILE_ID}.${THREAD_ID}`,
        JSON.stringify({
          messages: [{ ...message, text: 'edited' }],
          version: 1
        })
      ]
    ])

    assert.throws(
      () =>
        loadDmMessagesFromStorage({
          ownerProfileId: OWNER_PROFILE_ID,
          storage,
          threadId: THREAD_ID
        }),
      /Invalid DM message/
    )
  })

  test('merges messages by id and sorts them by creation time', () => {
    const sender = createSigningKeyPair()
    const older = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'older',
      text: 'old',
      threadId: THREAD_ID
    })
    const newer = createSignedDmMessage({
      createdAt: 2000,
      identity: sender,
      messageId: 'newer',
      text: 'new',
      threadId: THREAD_ID
    })
    const duplicateNewer = { ...newer }

    assert.deepEqual(mergeDmMessages([newer], [older, duplicateNewer]), [older, newer])
  })

  test('saves and loads messages from async app file storage', async () => {
    const files = new Map()
    const fileSystem = createFileSystem(files)
    const sender = createSigningKeyPair()
    const messages = [
      createSignedDmMessage({
        createdAt: 1000,
        identity: sender,
        messageId: 'message-1',
        text: 'hello',
        threadId: THREAD_ID
      })
    ]

    await saveDmMessagesToFileSystem({
      baseUri: 'file:///app/',
      fileSystem,
      messages,
      threadId: THREAD_ID
    })

    assert.deepEqual(
      await loadDmMessagesFromFileSystem({
        baseUri: 'file:///app/',
        fileSystem,
        threadId: THREAD_ID
      }),
      messages
    )
    assert.equal(files.has('file:///app/kepos/dm/messages/thread-1.json'), true)
  })

  test('fails closed on corrupt async app file message storage', async () => {
    const files = new Map([['file:///app/kepos/dm/messages/thread-1.json', '{']])

    await assert.rejects(
      () =>
        loadDmMessagesFromFileSystem({
          baseUri: 'file:///app/',
          fileSystem: createFileSystem(files),
          threadId: THREAD_ID
        }),
      /corrupt DM message storage/i
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
