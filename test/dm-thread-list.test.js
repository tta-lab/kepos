import assert from 'node:assert/strict'
import test from 'node:test'
import { upsertDmThread } from '../src/dm-thread-list.ts'

test('upsert DM thread replaces by thread id and preserves other threads', () => {
  assert.deepEqual(
    upsertDmThread(
      [
        { remoteProfileId: 'friend-a', threadId: 'thread-a' },
        { remoteProfileId: 'old', threadId: 'thread-b' }
      ],
      { remoteProfileId: 'friend-b', threadId: 'thread-b' }
    ),
    [
      { remoteProfileId: 'friend-a', threadId: 'thread-a' },
      { remoteProfileId: 'friend-b', threadId: 'thread-b' }
    ]
  )
})

test('upsert DM thread ignores empty thread payloads', () => {
  const threads = [{ threadId: 'thread-a' }]

  assert.equal(upsertDmThread(threads, null), threads)
  assert.equal(upsertDmThread(threads, {}), threads)
})
