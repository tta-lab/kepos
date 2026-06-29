import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadDmSessionMessagesFromFileSystem,
  loadDmSessionMessagesFromStorage,
  saveDmSessionMessagesToFileSystem,
  saveDmSessionMessagesToStorage
} from '../src/dm-session-storage.ts'

const ownerProfileId = 'a'.repeat(64)

test('DM session storage persists request messages for restart display', () => {
  const writes = new Map()
  const storage = createMemoryStorage(writes)
  const request = {
    at: 2,
    createdAt: 2,
    direction: 'out',
    fromProfileId: ownerProfileId,
    id: 'request-1',
    proof: { signature: 'proof' },
    requestId: 'request-1',
    senderEncryptionPublicKey: 'b'.repeat(64),
    text: 'hello',
    toProfileId: 'c'.repeat(64),
    type: 'kepos.message.request.v1'
  }

  saveDmSessionMessagesToStorage({
    messages: [
      request,
      {
        at: 3,
        direction: 'out',
        id: 'message-1',
        text: 'thread message',
        type: 'kepos.dm.message.v1'
      }
    ],
    ownerProfileId,
    storage
  })

  assert.deepEqual(
    loadDmSessionMessagesFromStorage({
      ownerProfileId,
      storage
    }),
    [request]
  )
  assert.equal(
    JSON.parse(writes.get(`kepos.dmSessionMessages.v1.${ownerProfileId}`)).messages.length,
    1
  )
})

test('DM session storage starts empty when no messages were saved', () => {
  assert.deepEqual(
    loadDmSessionMessagesFromStorage({
      ownerProfileId,
      storage: createMemoryStorage()
    }),
    []
  )
})

test('DM session storage persists request messages for app file storage', async () => {
  const files = new Map()
  const fileSystem = createFileSystem(files)
  const request = {
    at: 2,
    createdAt: 2,
    direction: 'in',
    fromProfileId: 'b'.repeat(64),
    id: 'request-2',
    proof: { signature: 'proof' },
    requestId: 'request-2',
    senderEncryptionPublicKey: 'c'.repeat(64),
    text: 'hello from mobile',
    toProfileId: ownerProfileId,
    type: 'kepos.message.request.v1'
  }

  await saveDmSessionMessagesToFileSystem({
    baseUri: 'file:///app/',
    fileSystem,
    messages: [
      request,
      {
        at: 3,
        direction: 'out',
        id: 'message-1',
        text: 'thread message',
        type: 'kepos.dm.message.v1'
      }
    ],
    ownerProfileId
  })

  assert.deepEqual(
    await loadDmSessionMessagesFromFileSystem({
      baseUri: 'file:///app/',
      fileSystem,
      ownerProfileId
    }),
    [request]
  )
  assert.equal(files.has(`file:///app/kepos/dm/session/${ownerProfileId}.json`), true)
})

function createMemoryStorage(writes = new Map()) {
  return {
    getItem(key) {
      return writes.get(key) || null
    },
    setItem(key, value) {
      writes.set(key, value)
    }
  }
}

function createFileSystem(files) {
  return {
    makeDirectoryAsync(path, options) {
      files.set(`${path}/.mkdir`, JSON.stringify(options))
    },
    readAsStringAsync(path) {
      if (!files.has(path)) {
        throw new Error(`File not found: ${path}`)
      }

      return files.get(path)
    },
    writeAsStringAsync(path, value) {
      files.set(path, value)
    }
  }
}
