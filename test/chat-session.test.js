import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { appendLocalMessage, appendRemoteMessage, createChatSession } from '../src/chat-session.js'

describe('chat session state', () => {
  test('createChatSession starts a room session with no messages', () => {
    const session = createChatSession({
      roomKey: 'a'.repeat(64),
      nick: 'Neil'
    })

    assert.equal(session.roomKey, 'a'.repeat(64))
    assert.equal(session.nick, 'Neil')
    assert.deepEqual(session.messages, [])
    assert.deepEqual(session.seenMessageIds, new Set())
  })

  test('appendLocalMessage adds an outgoing chat message', () => {
    const session = createChatSession({
      roomKey: 'a'.repeat(64),
      nick: 'Neil'
    })

    const next = appendLocalMessage(session, 'hello', {
      id: 'local-1',
      at: 1_797_331_200_000
    })

    assert.deepEqual(next.messages, [
      {
        type: 'chat',
        id: 'local-1',
        nick: 'Neil',
        text: 'hello',
        at: 1_797_331_200_000,
        direction: 'out'
      }
    ])
    assert.equal(next.seenMessageIds.has('local-1'), true)
  })

  test('appendRemoteMessage ignores duplicate messages', () => {
    const session = createChatSession({
      roomKey: 'a'.repeat(64),
      nick: 'Neil'
    })
    const remote = {
      type: 'chat',
      id: 'remote-1',
      nick: 'Ada',
      text: 'hi',
      at: 1_797_331_200_000
    }

    const once = appendRemoteMessage(session, remote)
    const twice = appendRemoteMessage(once, remote)

    assert.equal(twice.messages.length, 1)
    assert.equal(twice.messages[0].direction, 'in')
  })
})
