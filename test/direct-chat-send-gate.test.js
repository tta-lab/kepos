import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createContactBook, recordOutgoingFriendRequest } from '../src/contact-book.ts'
import { createDirectChatSendGate } from '../src/direct-chat-send-gate.ts'

test('direct Chat send gate allows a scanned request target to send a request', () => {
  const gate = createDirectChatSendGate({
    contactBook: createContactBook({ ownerProfileId: 'local' }),
    profileRequestTarget: {
      displayName: 'Ada',
      profileId: 'profile-ada'
    },
    recipientProfileId: 'profile-ada',
    shortenProfileId: (profileId) => profileId.slice(0, 7)
  })

  assert.equal(gate?.canSend, true)
  assert.equal(gate?.requestTarget.canSendRequest, true)
  assert.equal(gate?.requestTarget.displayName, 'Ada')
  assert.equal(gate?.requestTarget.relationshipState, 'request_target')
})

test('direct Chat send gate blocks profiles with a pending outgoing request', () => {
  const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    deliveryState: 'queued',
    profileId: 'profile-ada',
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'profile_qr',
    text: 'hello'
  })
  const gate = createDirectChatSendGate({
    contactBook: book,
    recipientProfileId: ' profile-ada '
  })

  assert.equal(gate?.canSend, false)
  assert.equal(gate?.notice, 'Your request is pending. Wait for them to accept.')
  assert.equal(gate?.requestTarget.relationshipState, 'outgoing_request')
})

test('direct Chat send gate keeps relationship checks out of platform send code', async () => {
  const desktop = await readFile(
    new URL('../src/desktop-message-actions.ts', import.meta.url),
    'utf8'
  )
  const mobile = await readFile(new URL('../mobile/App.tsx', import.meta.url), 'utf8')

  assert.match(desktop, /createDirectChatSendGate\(/)
  assert.match(mobile, /createDirectChatSendGate\(/)
  assert.doesNotMatch(desktop, /shouldBlockChatSendForFriendRequestTarget/)
  assert.doesNotMatch(mobile, /shouldBlockChatSendForFriendRequestTarget/)
})
