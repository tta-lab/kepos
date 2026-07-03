import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createContactBook,
  createTreeholePolicyFromContactBook,
  trustContact
} from '../src/contact-book.ts'
import { createDesktopContactRevoke } from '../src/desktop-revoke-service.ts'
import { acceptDmThread, createDmThread } from '../src/dm-thread.ts'

const ownerProfileId = 'a'.repeat(64)
const revokedProfileId = 'b'.repeat(64)
const keptProfileId = 'c'.repeat(64)

function createThreads() {
  return [
    acceptDmThread(
      createDmThread({
        channelDiscoveryKey: 'd'.repeat(64),
        channelPublicKey: 'e'.repeat(64),
        localProfileId: ownerProfileId,
        remoteProfileId: revokedProfileId,
        threadId: 'thread-revoked'
      }),
      { acceptedAt: 1000 }
    ),
    acceptDmThread(
      createDmThread({
        channelDiscoveryKey: 'f'.repeat(64),
        channelPublicKey: '1'.repeat(64),
        localProfileId: ownerProfileId,
        remoteProfileId: keptProfileId,
        threadId: 'thread-kept'
      }),
      { acceptedAt: 1000 }
    )
  ]
}

function createBook() {
  return trustContact(
    trustContact(createContactBook({ ownerProfileId }), {
      alias: 'Ada',
      profileId: revokedProfileId,
      source: 'profile_qr',
      trustedAt: 900
    }),
    {
      alias: 'Lin',
      profileId: keptProfileId,
      source: 'profile_qr',
      trustedAt: 900
    }
  )
}

test('desktop revoke service returns storage and runtime updates', () => {
  const result = createDesktopContactRevoke({
    book: createBook(),
    profileId: revokedProfileId,
    revokedAt: 1100,
    selectedRecipientProfileId: revokedProfileId,
    threads: createThreads()
  })

  assert.deepEqual(result.revokedThreadIds, ['thread-revoked'])
  assert.equal(result.nextThreads[0].state, 'revoked')
  assert.equal(result.nextThreads[0].revokedAt, 1100)
  assert.equal(result.nextThreads[1].threadId, 'thread-kept')
  assert.equal(result.shouldClearRecipient, true)
  assert.deepEqual(result.treeholePolicy, createTreeholePolicyFromContactBook(result.book))
})

test('desktop revoke service keeps unrelated recipient selection', () => {
  const result = createDesktopContactRevoke({
    book: createBook(),
    profileId: revokedProfileId,
    revokedAt: 1100,
    selectedRecipientProfileId: keptProfileId,
    threads: createThreads()
  })

  assert.equal(result.shouldClearRecipient, false)
})
