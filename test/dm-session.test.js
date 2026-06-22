import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  appendLocalDirectMessage,
  appendRemoteDirectMessage,
  createDirectMessageSession
} from '../src/dm-session.js'

describe('direct message session state', () => {
  test('local direct messages append to sender state', () => {
    const session = createDirectMessageSession({
      localProfileId: 'profile-a',
      nick: 'Ada'
    })

    const next = appendLocalDirectMessage(session, {
      id: 'dm-1',
      toProfileId: 'profile-b',
      text: 'hello',
      at: 1_797_331_200_000
    })

    assert.deepEqual(next.messages, [
      {
        type: 'dm',
        id: 'dm-1',
        fromProfileId: 'profile-a',
        toProfileId: 'profile-b',
        nick: 'Ada',
        text: 'hello',
        at: 1_797_331_200_000,
        direction: 'out'
      }
    ])
  })

  test('remote direct messages append only when addressed to local profile', () => {
    const session = createDirectMessageSession({
      localProfileId: 'profile-a',
      nick: 'Ada'
    })

    const addressed = appendRemoteDirectMessage(session, {
      type: 'dm',
      id: 'dm-1',
      fromProfileId: 'profile-b',
      toProfileId: 'profile-a',
      nick: 'Neil',
      text: 'hi',
      at: 1_797_331_200_000
    })
    const ignored = appendRemoteDirectMessage(addressed, {
      type: 'dm',
      id: 'dm-2',
      fromProfileId: 'profile-b',
      toProfileId: 'profile-c',
      nick: 'Neil',
      text: 'not for ada',
      at: 1_797_331_200_001
    })

    assert.equal(ignored.messages.length, 1)
    assert.equal(ignored.messages[0].direction, 'in')
  })

  test('duplicate direct messages are ignored', () => {
    const session = createDirectMessageSession({
      localProfileId: 'profile-a',
      nick: 'Ada'
    })
    const message = {
      type: 'dm',
      id: 'dm-1',
      fromProfileId: 'profile-b',
      toProfileId: 'profile-a',
      nick: 'Neil',
      text: 'hi',
      at: 1_797_331_200_000
    }

    const once = appendRemoteDirectMessage(session, message)
    const twice = appendRemoteDirectMessage(once, message)

    assert.equal(twice.messages.length, 1)
  })
})
