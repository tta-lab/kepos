import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createDmThreadRuntime } from '../src/dm-thread-runtime.ts'
import { createSignedDmMessage } from '../src/dm-message.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

describe('DM thread runtime', () => {
  test('opens accepted threads, replays stored messages, and persists incoming messages', async () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const stored = [
      createSignedDmMessage({
        createdAt: 1000,
        identity: local,
        messageId: 'stored-1',
        text: 'stored',
        threadId: 'thread-1'
      })
    ]
    const saved = []
    const displayed = []
    const channels = []
    const runtime = createDmThreadRuntime({
      createChannel: (options) => new FakeDmChannel(options, channels),
      identity: local,
      loadMessages: () => stored,
      localProfileId: local.publicKey,
      onMessage: (thread, message, direction) => displayed.push({ direction, message, thread }),
      saveMessages: (_thread, messages) => saved.push(messages)
    })
    const thread = createThread({
      localProfileId: local.publicKey,
      remoteProfileId: remote.publicKey
    })
    const incoming = createSignedDmMessage({
      createdAt: 1100,
      identity: remote,
      messageId: 'incoming-1',
      text: 'hello',
      threadId: 'thread-1'
    })

    await runtime.openThread(thread)
    channels[0].emitIncoming(incoming)

    assert.deepEqual(channels[0].broadcasted, [stored])
    assert.deepEqual(saved.at(-1), [stored[0], incoming])
    assert.deepEqual(displayed, [
      { direction: 'out', message: stored[0], thread },
      { direction: 'in', message: incoming, thread }
    ])
  })

  test('sends signed messages over the opened thread and persists them', async () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const saved = []
    const displayed = []
    const channels = []
    const runtime = createDmThreadRuntime({
      createChannel: (options) => new FakeDmChannel(options, channels),
      identity: local,
      loadMessages: () => [],
      localProfileId: local.publicKey,
      onMessage: (thread, message, direction) => displayed.push({ direction, message, thread }),
      saveMessages: (_thread, messages) => saved.push(messages)
    })
    const thread = createThread({
      localProfileId: local.publicKey,
      remoteProfileId: remote.publicKey
    })

    await runtime.openThread(thread)
    const message = runtime.sendMessage({
      createdAt: 1200,
      messageId: 'local-1',
      text: 'hi',
      threadId: thread.threadId
    })

    assert.equal(message.fromProfileId, local.publicKey)
    assert.deepEqual(saved.at(-1), [message])
    assert.deepEqual(displayed, [{ direction: 'out', message, thread }])
  })

  test('rejects invalid channel messages before persistence or display', async () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const other = createSigningKeyPair()
    const saved = []
    const displayed = []
    const channels = []
    const runtime = createDmThreadRuntime({
      createChannel: (options) => new FakeDmChannel(options, channels),
      identity: local,
      loadMessages: () => [],
      localProfileId: local.publicKey,
      onMessage: (thread, message, direction) => displayed.push({ direction, message, thread }),
      saveMessages: (_thread, messages) => saved.push(messages)
    })
    const thread = createThread({
      localProfileId: local.publicKey,
      remoteProfileId: remote.publicKey
    })
    const wrongSender = createSignedDmMessage({
      createdAt: 1300,
      identity: other,
      messageId: 'wrong-sender',
      text: 'wrong',
      threadId: thread.threadId
    })
    const tampered = {
      ...createSignedDmMessage({
        createdAt: 1400,
        identity: remote,
        messageId: 'tampered',
        text: 'original',
        threadId: thread.threadId
      }),
      text: 'changed'
    }

    await runtime.openThread(thread)
    channels[0].emitIncoming(wrongSender)
    channels[0].emitIncoming(tampered)

    assert.deepEqual(saved, [])
    assert.deepEqual(displayed, [])
  })

  test('receives signed fallback messages for open threads and skips duplicates', async () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const saved = []
    const displayed = []
    const channels = []
    const runtime = createDmThreadRuntime({
      createChannel: (options) => new FakeDmChannel(options, channels),
      identity: local,
      loadMessages: () => [],
      localProfileId: local.publicKey,
      onMessage: (thread, message, direction) => displayed.push({ direction, message, thread }),
      saveMessages: (_thread, messages) => saved.push(messages)
    })
    const thread = createThread({
      localProfileId: local.publicKey,
      remoteProfileId: remote.publicKey
    })
    const message = createSignedDmMessage({
      createdAt: 1300,
      identity: remote,
      messageId: 'remote-1',
      text: 'fallback',
      threadId: thread.threadId
    })

    await runtime.openThread(thread)

    assert.equal(runtime.receiveMessage(message), true)
    assert.equal(runtime.receiveMessage(message), false)
    assert.deepEqual(saved.at(-1), [message])
    assert.deepEqual(displayed, [{ direction: 'in', message, thread }])
  })

  test('rejects signed fallback messages for the wrong thread or sender', async () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const other = createSigningKeyPair()
    const displayed = []
    const channels = []
    const runtime = createDmThreadRuntime({
      createChannel: (options) => new FakeDmChannel(options, channels),
      identity: local,
      loadMessages: () => [],
      localProfileId: local.publicKey,
      onMessage: (thread, message, direction) => displayed.push({ direction, message, thread })
    })
    const thread = createThread({
      localProfileId: local.publicKey,
      remoteProfileId: remote.publicKey
    })

    await runtime.openThread(thread)

    assert.equal(
      runtime.receiveMessage(
        createSignedDmMessage({
          createdAt: 1300,
          identity: remote,
          messageId: 'wrong-thread',
          text: 'wrong',
          threadId: 'other-thread'
        })
      ),
      false
    )
    assert.equal(
      runtime.receiveMessage(
        createSignedDmMessage({
          createdAt: 1400,
          identity: other,
          messageId: 'wrong-sender',
          text: 'wrong',
          threadId: thread.threadId
        })
      ),
      false
    )
    assert.deepEqual(displayed, [])
  })

  test('deduplicates incoming channel messages after fallback delivery', async () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const displayed = []
    const channels = []
    const runtime = createDmThreadRuntime({
      createChannel: (options) => new FakeDmChannel(options, channels),
      identity: local,
      loadMessages: () => [],
      localProfileId: local.publicKey,
      onMessage: (thread, message, direction) => displayed.push({ direction, message, thread })
    })
    const thread = createThread({
      localProfileId: local.publicKey,
      remoteProfileId: remote.publicKey
    })
    const message = createSignedDmMessage({
      createdAt: 1300,
      identity: remote,
      messageId: 'remote-1',
      text: 'fallback',
      threadId: thread.threadId
    })

    await runtime.openThread(thread)
    runtime.receiveMessage(message)
    channels[0].emitIncoming(message)

    assert.equal(displayed.length, 1)
  })

  test('supports async message storage adapters', async () => {
    const local = createSigningKeyPair()
    const remote = createSigningKeyPair()
    const saved = []
    const channels = []
    const stored = [
      createSignedDmMessage({
        createdAt: 1000,
        identity: local,
        messageId: 'stored-1',
        text: 'stored',
        threadId: 'thread-1'
      })
    ]
    const runtime = createDmThreadRuntime({
      createChannel: (options) => new FakeDmChannel(options, channels),
      identity: local,
      loadMessages: () => Promise.resolve(stored),
      localProfileId: local.publicKey,
      saveMessages: (_thread, messages) => Promise.resolve(saved.push(messages))
    })
    const thread = createThread({
      localProfileId: local.publicKey,
      remoteProfileId: remote.publicKey
    })

    await runtime.openThread(thread)
    runtime.sendMessage({
      createdAt: 1200,
      messageId: 'local-1',
      text: 'hi',
      threadId: thread.threadId
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.deepEqual(channels[0].broadcasted, [stored])
    assert.equal(saved.at(-1).length, 2)
  })
})

function createThread(overrides = {}) {
  return {
    acceptedAt: 1000,
    channelDiscoveryKey: 'a'.repeat(64),
    channelPublicKey: 'b'.repeat(64),
    createdAt: 1000,
    localProfileId: '1'.repeat(64),
    remoteProfileId: '2'.repeat(64),
    state: 'accepted',
    threadId: 'thread-1',
    ...overrides
  }
}

class FakeDmChannel {
  constructor(options, channels) {
    this.broadcasted = []
    this.joined = []
    this.options = options
    this.sent = []
    channels.push(this)
  }

  broadcastMessages(messages) {
    this.broadcasted.push(messages)
  }

  emitIncoming(message) {
    this.options.onMessage(message)
  }

  joinThread(thread) {
    this.joined.push(thread)
    return Promise.resolve()
  }

  leave() {
    return Promise.resolve()
  }

  sendMessage(payload) {
    const message = createSignedDmMessage({
      ...payload,
      identity: this.options.identity
    })
    this.sent.push(message)
    return message
  }
}
