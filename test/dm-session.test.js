import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  appendLocalDirectMessage,
  appendLocalSignedDirectMessage,
  appendLocalMessageRequest,
  appendRemoteDirectMessage,
  appendRemoteSignedDirectMessage,
  appendRemoteMessageRequest,
  createDirectMessageSession
} from '../src/dm-session.js'
import { createSignedDmMessage } from '../src/dm-message.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

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

  test('message requests append locally and remotely without granting a DM thread', () => {
    const session = createDirectMessageSession({
      localProfileId: 'profile-a',
      nick: 'Ada'
    })
    const request = {
      type: 'kepos.message.request.v1',
      requestId: 'request-1',
      fromProfileId: 'profile-a',
      toProfileId: 'profile-b',
      text: 'hello',
      createdAt: 1_797_331_200_000
    }

    const outgoing = appendLocalMessageRequest(session, request)
    const incoming = appendRemoteMessageRequest(
      createDirectMessageSession({
        localProfileId: 'profile-b',
        nick: 'Neil'
      }),
      request
    )
    const ignored = appendRemoteMessageRequest(incoming, {
      ...request,
      requestId: 'request-2',
      toProfileId: 'profile-c'
    })
    const duplicate = appendRemoteMessageRequest(ignored, request)

    assert.deepEqual(outgoing.messages, [
      {
        ...request,
        id: 'request-1',
        at: 1_797_331_200_000,
        direction: 'out'
      }
    ])
    assert.equal(duplicate.messages.length, 1)
    assert.equal(duplicate.messages[0].direction, 'in')
  })

  test('signed DM messages append locally and remotely for display', () => {
    const sender = createSigningKeyPair()
    const recipientProfileId = '2'.repeat(64)
    const message = createSignedDmMessage({
      createdAt: 1000,
      identity: sender,
      messageId: 'message-1',
      text: 'hello',
      threadId: 'thread-1'
    })

    const outgoing = appendLocalSignedDirectMessage(
      createDirectMessageSession({
        localProfileId: sender.publicKey,
        nick: 'Neil'
      }),
      message,
      { remoteProfileId: recipientProfileId }
    )
    const incoming = appendRemoteSignedDirectMessage(
      createDirectMessageSession({
        localProfileId: recipientProfileId,
        nick: 'Ada'
      }),
      message
    )

    assert.deepEqual(
      outgoing.messages.map((entry) => ({
        direction: entry.direction,
        id: entry.id,
        text: entry.text,
        toProfileId: entry.toProfileId,
        type: entry.type
      })),
      [
        {
          direction: 'out',
          id: 'message-1',
          text: 'hello',
          toProfileId: recipientProfileId,
          type: 'kepos.dm.message.v1'
        }
      ]
    )
    assert.deepEqual(
      incoming.messages.map((entry) => ({
        direction: entry.direction,
        fromProfileId: entry.fromProfileId,
        id: entry.id,
        text: entry.text,
        type: entry.type
      })),
      [
        {
          direction: 'in',
          fromProfileId: sender.publicKey,
          id: 'message-1',
          text: 'hello',
          type: 'kepos.dm.message.v1'
        }
      ]
    )
  })
})
