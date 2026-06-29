import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createRoomKey, decodeFrame, deriveTopic, encodeFrame, isRoomKey } from '../src/protocol.ts'

describe('room keys', () => {
  test('createRoomKey returns a 32-byte hex secret', () => {
    const key = createRoomKey()

    assert.match(key, /^[0-9a-f]{64}$/)
    assert.equal(isRoomKey(key), true)
  })

  test('isRoomKey rejects malformed room keys', () => {
    assert.equal(isRoomKey(''), false)
    assert.equal(isRoomKey('abc'), false)
    assert.equal(isRoomKey('g'.repeat(64)), false)
    assert.equal(isRoomKey('0'.repeat(63)), false)
  })
})

describe('topic derivation', () => {
  test('deriveTopic returns a stable 32-byte topic for the same room', () => {
    const key = 'a'.repeat(64)

    assert.deepEqual(deriveTopic(key), deriveTopic(key))
    assert.equal(deriveTopic(key) instanceof Uint8Array, true)
    assert.equal(deriveTopic(key).byteLength, 32)
  })

  test('deriveTopic rejects invalid room keys', () => {
    assert.throws(() => deriveTopic('bad-key'), /Invalid room key/)
  })
})

describe('wire frames', () => {
  test('encodeFrame writes newline-delimited JSON and decodeFrame reads it back', () => {
    const message = {
      type: 'chat',
      id: 'msg-1',
      nick: 'Neil',
      text: 'hello room',
      at: 1_797_331_200_000
    }

    const frame = encodeFrame(message)

    assert.equal(frame.endsWith('\n'), true)
    assert.deepEqual(decodeFrame(frame.trimEnd()), message)
  })

  test('decodeFrame rejects non-chat frames', () => {
    assert.throws(() => decodeFrame('{"type":"join"}'), /Unsupported frame/)
  })

  test('decodeFrame accepts treehole control frames', () => {
    const frame = {
      type: 'treehole.bootstrap',
      key: 'b'.repeat(64)
    }
    const state = {
      type: 'treehole.state.v1',
      snapshot: { posts: [] }
    }

    assert.deepEqual(decodeFrame(encodeFrame(frame).trimEnd()), frame)
    assert.deepEqual(decodeFrame(encodeFrame(state).trimEnd()), state)
  })

  test('decodeFrame rejects direct message body frames', () => {
    const frame = {
      type: 'dm',
      id: 'dm-1',
      fromProfileId: 'profile-a',
      toProfileId: 'profile-b',
      nick: 'Ada',
      text: 'hello',
      at: 1_797_331_200_000
    }

    assert.throws(() => decodeFrame(encodeFrame(frame).trimEnd()), /Unsupported frame/)
  })

  test('decodeFrame accepts message request and DM invite control frames', () => {
    const request = {
      type: 'kepos.message.request.v1',
      requestId: 'request-1'
    }
    const invite = {
      type: 'kepos.dm.invite.v1',
      inviteId: 'invite-1'
    }

    assert.deepEqual(decodeFrame(encodeFrame(request).trimEnd()), request)
    assert.deepEqual(decodeFrame(encodeFrame(invite).trimEnd()), invite)
  })

  test('decodeFrame accepts debug signed DM body fallback control frames', () => {
    const frame = {
      type: 'kepos.dm.body.v1',
      message: {
        messageId: 'message-1',
        threadId: 'thread-1'
      }
    }

    assert.deepEqual(decodeFrame(encodeFrame(frame).trimEnd()), frame)
  })

  test('decodeFrame accepts signed home hello control frames', () => {
    const hello = {
      type: 'kepos.home.hello.v1',
      profileId: 'a'.repeat(64)
    }
    const request = {
      type: 'kepos.home.hello.request.v1'
    }

    assert.deepEqual(decodeFrame(encodeFrame(hello).trimEnd()), hello)
    assert.deepEqual(decodeFrame(encodeFrame(request).trimEnd()), request)
  })
})
