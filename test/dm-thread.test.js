import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  acceptDmThread,
  createDmThread,
  deserializeDmThread,
  isDmThreadActive,
  revokeDmThread,
  serializeDmThread
} from '../src/dm-thread.ts'

const LOCAL_PROFILE_ID = '1'.repeat(64)
const REMOTE_PROFILE_ID = '2'.repeat(64)
const CHANNEL_PUBLIC_KEY = 'a'.repeat(64)
const CHANNEL_DISCOVERY_KEY = 'b'.repeat(64)

describe('DM thread domain model', () => {
  test('creates a serializable pending thread', () => {
    const thread = createDmThread({
      channelDiscoveryKey: CHANNEL_DISCOVERY_KEY.toUpperCase(),
      channelPublicKey: CHANNEL_PUBLIC_KEY.toUpperCase(),
      createdAt: 1000,
      localProfileId: LOCAL_PROFILE_ID,
      remoteProfileId: REMOTE_PROFILE_ID,
      requestId: ' request-1 ',
      threadId: ' thread-1 '
    })

    assert.deepEqual(thread, {
      threadId: 'thread-1',
      localProfileId: LOCAL_PROFILE_ID,
      remoteProfileId: REMOTE_PROFILE_ID,
      channelPublicKey: CHANNEL_PUBLIC_KEY,
      channelDiscoveryKey: CHANNEL_DISCOVERY_KEY,
      requestId: 'request-1',
      createdAt: 1000,
      state: 'pending'
    })
    assert.deepEqual(JSON.parse(JSON.stringify(thread)), thread)
    assert.equal(isDmThreadActive(thread), false)
  })

  test('accepts a thread without mutating the input', () => {
    const thread = createThread()
    const accepted = acceptDmThread(thread, { acceptedAt: 2000 })

    assert.equal(thread.state, 'pending')
    assert.deepEqual(accepted, {
      ...thread,
      acceptedAt: 2000,
      state: 'accepted'
    })
    assert.equal(isDmThreadActive(accepted), true)
  })

  test('revokes a thread without mutating the input and disables active checks', () => {
    const accepted = acceptDmThread(createThread(), { acceptedAt: 2000 })
    const revoked = revokeDmThread(accepted, { revokedAt: 3000 })

    assert.equal(accepted.state, 'accepted')
    assert.deepEqual(revoked, {
      ...accepted,
      revokedAt: 3000,
      state: 'revoked'
    })
    assert.equal(isDmThreadActive(revoked), false)
    assert.equal(isDmThreadActive(acceptDmThread(revoked, { acceptedAt: 4000 })), false)
  })

  test('serializes and restores threads with schema version', () => {
    const revoked = revokeDmThread(acceptDmThread(createThread(), { acceptedAt: 2000 }), {
      revokedAt: 3000
    })
    const stored = serializeDmThread(revoked)
    const restored = deserializeDmThread(JSON.stringify(stored))

    assert.equal(stored.version, 1)
    assert.deepEqual(stored.thread, revoked)
    assert.deepEqual(restored, revoked)
  })

  test('rejects malformed ids, keys, timestamps, and stored versions', () => {
    assert.throws(() => createThread({ localProfileId: 'not-hex' }), /Invalid profile id/)
    assert.throws(() => createThread({ channelPublicKey: 'c'.repeat(63) }), /Invalid channel key/)
    assert.throws(
      () => createThread({ remoteProfileId: LOCAL_PROFILE_ID }),
      /Remote profile must differ/
    )
    assert.throws(() => createThread({ threadId: ' ' }), /Thread id is required/)
    assert.throws(() => createThread({ createdAt: -1 }), /Created timestamp is required/)
    assert.throws(() => createThread({ createdAt: 1.5 }), /Created timestamp is required/)
    assert.throws(
      () => acceptDmThread(createThread(), { acceptedAt: Number.NaN }),
      /Accepted timestamp is required/
    )
    assert.throws(
      () => revokeDmThread(createThread(), { revokedAt: Infinity }),
      /Revoked timestamp is required/
    )
    assert.throws(
      () => deserializeDmThread({ version: 2, thread: createThread() }),
      /Unsupported DM thread version/
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
