import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopDmRuntime } from '../src/desktop-dm-runtime.js'

const localProfileId = 'a'.repeat(64)
const remoteProfileId = 'b'.repeat(64)
const thread = {
  acceptedAt: 1,
  channelDiscoveryKey: 'c'.repeat(64),
  channelPublicKey: 'd'.repeat(64),
  createdAt: 1,
  localProfileId,
  remoteProfileId,
  requestId: 'request-1',
  state: 'accepted',
  threadId: 'thread-1'
}
const profile = {
  dmEncryptionKeyPair: { publicKey: 'e'.repeat(64), secretKey: 'f'.repeat(64) },
  identity: { publicKey: localProfileId, secretKey: '1'.repeat(128) },
  id: localProfileId
}

function createRuntime({ closeAll, sessionMessages = [], threads = [] } = {}) {
  const calls = []
  const sessions = []
  let threadRuntimeOptions = null
  const threadRuntime = {
    closeAll: closeAll || (() => calls.push(['closeAll'])),
    closeThread: (threadId) => calls.push(['closeThread', threadId]),
    openThread: (thread) => calls.push(['openThread', thread.threadId]),
    sendMessage: (message) => {
      calls.push(['sendMessage', message])
      return {
        ...message,
        fromProfileId: localProfileId,
        messageId: message.messageId,
        threadId: message.threadId
      }
    }
  }
  const runtime = createDesktopDmRuntime({
    acceptInvite: ({ invite }) => ({ ...thread, remoteProfileId: invite.fromProfileId }),
    acceptRequestWithInvite: () => ({
      book: { accepted: true },
      invite: { type: 'kepos.dm.invite.v1' },
      thread
    }),
    createRequest: ({
      createdAt,
      fromIdentity,
      requestId,
      senderEncryptionPublicKey,
      text,
      toProfileId
    }) => ({
      createdAt,
      fromProfileId: fromIdentity.publicKey,
      requestId,
      senderEncryptionPublicKey,
      text,
      toProfileId,
      type: 'kepos.message.request.v1'
    }),
    createThreadRuntime: (options) => {
      threadRuntimeOptions = options
      return threadRuntime
    },
    loadMessages: (thread) => {
      calls.push(['loadMessages', thread.threadId])
      return []
    },
    loadSessionMessages: () => {
      calls.push(['loadSessionMessages'])
      return sessionMessages
    },
    loadThreads: () => threads,
    onSessionChanged: (session) => sessions.push(session),
    saveMessages: (thread, messages) => calls.push(['saveMessages', thread.threadId, messages]),
    saveSessionMessages: ({ messages }) => calls.push(['saveSessionMessages', messages]),
    saveThreads: ({ threads }) =>
      calls.push(['saveThreads', threads.map((thread) => thread.threadId)])
  })

  return {
    calls,
    runtime,
    sessions,
    threadRuntimeOptions: () => threadRuntimeOptions
  }
}

test('desktop DM runtime starts session and opens saved threads', async () => {
  const { calls, runtime } = createRuntime({ threads: [thread] })

  await runtime.start({ nick: 'Owner', profile, storage: {} })

  assert.equal(runtime.getSession().localProfileId, localProfileId)
  assert.deepEqual(calls, [['loadSessionMessages'], ['openThread', 'thread-1']])
})

test('desktop DM runtime ignores stale overlapping starts', async () => {
  let releaseFirstClose
  const firstClose = new Promise((resolve) => {
    releaseFirstClose = resolve
  })
  let closeCount = 0
  const { runtime } = createRuntime({
    closeAll: () => {
      closeCount += 1
      return closeCount === 1 ? firstClose : undefined
    }
  })

  await runtime.start({ nick: 'Initial', profile, storage: {} })
  const first = runtime.start({ nick: 'First', profile, storage: {} })
  const second = runtime.start({ nick: 'Second', profile, storage: {} })
  await second
  const secondSession = runtime.getSession()

  releaseFirstClose()
  const firstResult = await first

  assert.equal(runtime.getSession(), secondSession)
  assert.equal(firstResult, secondSession)
  assert.equal(runtime.getSession().nick, 'Second')
})

test('desktop DM runtime restores saved session request messages on start', async () => {
  const { runtime } = createRuntime({
    sessionMessages: [
      {
        at: 2,
        createdAt: 2,
        direction: 'out',
        fromProfileId: localProfileId,
        id: 'request-2',
        requestId: 'request-2',
        text: 'hello',
        toProfileId: remoteProfileId,
        type: 'kepos.message.request.v1'
      }
    ]
  })

  await runtime.start({ nick: 'Owner', profile, storage: {} })

  assert.equal(runtime.getSession().messages[0].id, 'request-2')
  assert.equal(runtime.getSession().messages[0].text, 'hello')
})

test('desktop DM runtime applies thread messages to the UI session', async () => {
  const { runtime, sessions, threadRuntimeOptions } = createRuntime({ threads: [thread] })

  await runtime.start({ nick: 'Owner', profile, storage: {} })
  threadRuntimeOptions().onMessage(
    thread,
    {
      createdAt: 2,
      fromProfileId: remoteProfileId,
      messageId: 'message-1',
      text: 'hello',
      threadId: thread.threadId
    },
    'in'
  )

  assert.equal(sessions.at(-1).messages[0].direction, 'in')
  assert.equal(sessions.at(-1).messages[0].text, 'hello')
})

test('desktop DM runtime sends over an accepted local thread', async () => {
  const { calls, runtime } = createRuntime({ threads: [thread] })

  await runtime.start({ nick: 'Owner', profile, storage: {} })
  const result = runtime.sendMessageOrRequest({
    createdAt: 2,
    messageId: 'message-1',
    requestId: 'request-2',
    text: '  hello  ',
    toProfileId: remoteProfileId
  })

  assert.equal(result.kind, 'message')
  assert.deepEqual(calls.at(-1), [
    'sendMessage',
    { createdAt: 2, messageId: 'message-1', text: 'hello', threadId: 'thread-1' }
  ])
})

test('desktop DM runtime creates and appends a message request without a thread', async () => {
  const { calls, runtime, sessions } = createRuntime()
  const broadcasts = []

  await runtime.start({ nick: 'Owner', profile, storage: {} })
  const result = runtime.sendMessageOrRequest({
    broadcastControl: (request) => broadcasts.push(request),
    createdAt: 2,
    messageId: 'message-1',
    requestId: 'request-2',
    text: '  hello  ',
    toProfileId: remoteProfileId
  })

  assert.equal(result.kind, 'request')
  assert.equal(broadcasts[0].type, 'kepos.message.request.v1')
  assert.equal(broadcasts[0].text, 'hello')
  assert.equal(sessions.at(-1).messages[0].direction, 'out')
  assert.equal(sessions.at(-1).messages[0].text, 'hello')
  assert.deepEqual(calls.at(-1), ['saveSessionMessages', sessions.at(-1).messages])
})

test('desktop DM runtime ignores blank outgoing text', async () => {
  const { calls, runtime } = createRuntime({ threads: [thread] })

  await runtime.start({ nick: 'Owner', profile, storage: {} })
  const result = runtime.sendMessageOrRequest({
    createdAt: 2,
    messageId: 'message-1',
    requestId: 'request-2',
    text: '   ',
    toProfileId: remoteProfileId
  })

  assert.equal(result, null)
  assert.equal(
    calls.some(([name]) => name === 'sendMessage'),
    false
  )
  assert.equal(runtime.getSession().messages.length, 0)
})

test('desktop DM runtime accepts requests and invites into saved open threads', async () => {
  const { calls, runtime } = createRuntime()

  await runtime.start({ nick: 'Owner', profile, storage: {} })
  const accepted = await runtime.acceptMessageRequest({
    acceptedAt: 3,
    book: {},
    remoteProfileId,
    threadId: 'thread-1'
  })
  const received = await runtime.acceptInviteAsRecipient({
    acceptedAt: 4,
    contactBook: {},
    invite: { fromProfileId: remoteProfileId },
    recipientEncryptionKeyPair: profile.dmEncryptionKeyPair
  })

  assert.deepEqual(accepted.invite, { type: 'kepos.dm.invite.v1' })
  assert.equal(received.threadId, 'thread-1')
  assert.deepEqual(
    calls.filter(([name]) => name === 'saveThreads'),
    [
      ['saveThreads', ['thread-1']],
      ['saveThreads', ['thread-1']]
    ]
  )
  assert.equal(calls.filter(([name]) => name === 'openThread').length, 2)
})
