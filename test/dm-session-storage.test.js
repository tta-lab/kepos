import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadDmSessionMessagesFromStorage,
  saveDmSessionMessagesToStorage
} from '../src/dm-session-storage.js'

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
