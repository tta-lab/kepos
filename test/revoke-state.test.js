import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createContactBook,
  createTreeholePolicyFromContactBook,
  recordMessageRequest,
  trustContact
} from '../src/contact-book.ts'
import { acceptDmThread, createDmThread } from '../src/dm-thread.ts'
import { applyLocalContactRevoke } from '../src/revoke-state.js'

test('local contact revoke updates trust, treehole policy, and matching DM threads', () => {
  const ownerProfileId = 'a'.repeat(64)
  const revokedProfileId = 'b'.repeat(64)
  const keptProfileId = 'c'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId }), {
    alias: 'Ada',
    profileId: revokedProfileId,
    source: 'profile_qr',
    trustedAt: 1000
  })
  const trustedBook = trustContact(book, {
    alias: 'Lin',
    profileId: keptProfileId,
    source: 'profile_qr',
    trustedAt: 1000
  })
  const revokedThread = acceptDmThread(
    createDmThread({
      channelDiscoveryKey: 'd'.repeat(64),
      channelPublicKey: 'e'.repeat(64),
      localProfileId: ownerProfileId,
      remoteProfileId: revokedProfileId,
      threadId: 'thread-revoked'
    }),
    { acceptedAt: 1100 }
  )
  const keptThread = acceptDmThread(
    createDmThread({
      channelDiscoveryKey: 'f'.repeat(64),
      channelPublicKey: '1'.repeat(64),
      localProfileId: ownerProfileId,
      remoteProfileId: keptProfileId,
      threadId: 'thread-kept'
    }),
    { acceptedAt: 1100 }
  )

  const result = applyLocalContactRevoke({
    book: trustedBook,
    profileId: revokedProfileId,
    revokedAt: 1200,
    threads: [revokedThread, keptThread]
  })

  assert.deepEqual(result.revokedThreadIds, ['thread-revoked'])
  assert.equal(result.nextThreads[0].state, 'revoked')
  assert.equal(result.nextThreads[0].revokedAt, 1200)
  assert.equal(result.nextThreads[1], keptThread)
  assert.deepEqual(result.treeholePolicy, createTreeholePolicyFromContactBook(result.book))
  assert.deepEqual(result.treeholePolicy.revokedProfileIds, [revokedProfileId])
  assert.deepEqual(result.treeholePolicy.trustedProfileIds, [keptProfileId])
})

test('local contact revoke clears pending message requests from the revoked profile', () => {
  const ownerProfileId = 'a'.repeat(64)
  const revokedProfileId = 'b'.repeat(64)
  const requestedBook = recordMessageRequest(createContactBook({ ownerProfileId }), {
    alias: 'Ada',
    profileId: revokedProfileId,
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'home_room'
  })

  const result = applyLocalContactRevoke({
    book: requestedBook,
    profileId: revokedProfileId,
    revokedAt: 1200,
    threads: []
  })

  assert.equal(requestedBook.pendingRequestsByProfileId.has(revokedProfileId), true)
  assert.equal(result.book.pendingRequestsByProfileId.has(revokedProfileId), false)
  assert.deepEqual(result.treeholePolicy.revokedProfileIds, [revokedProfileId])
})
