import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook, recordMessageRequest } from '../src/contact-book.ts'
import {
  createDesktopMessageRequestAcceptance,
  createDesktopMessageRequestIgnore
} from '../src/desktop-message-request-service.ts'

test('desktop message request acceptance delegates to the DM runtime contract', async () => {
  const book = createContactBook({ ownerProfileId: 'owner-a' })
  const invite = { type: 'kepos.dm.invite.v1' }
  const nextBook = createContactBook({ ownerProfileId: 'owner-a' })
  const calls = []

  const result = await createDesktopMessageRequestAcceptance({
    acceptMessageRequest: (payload) => {
      calls.push(payload)
      return { book: nextBook, invite }
    },
    acceptedAt: 2000,
    book,
    message: { fromProfileId: 'profile-b' },
    threadId: 'thread-1'
  })

  assert.deepEqual(calls, [
    {
      acceptedAt: 2000,
      book,
      remoteProfileId: 'profile-b',
      threadId: 'thread-1'
    }
  ])
  assert.deepEqual(result, { book: nextBook, invite })
})

test('desktop message request acceptance skips invalid messages', async () => {
  let called = false

  const result = await createDesktopMessageRequestAcceptance({
    acceptMessageRequest: () => {
      called = true
    },
    acceptedAt: 2000,
    book: createContactBook({ ownerProfileId: 'owner-a' }),
    message: {},
    threadId: 'thread-1'
  })

  assert.equal(called, false)
  assert.equal(result, null)
})

test('desktop message request ignore clears pending contact request and returns DM dismiss id', () => {
  const book = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
    profileId: 'profile-b',
    displayNameSnapshot: 'Ada',
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'home_room'
  })

  const result = createDesktopMessageRequestIgnore({
    book,
    hasDmSession: true,
    message: { fromProfileId: 'profile-b', id: 'message-1' }
  })

  assert.equal(book.pendingRequestsByProfileId.has('profile-b'), true)
  assert.equal(result.book.pendingRequestsByProfileId.has('profile-b'), false)
  assert.equal(result.dismissedMessageId, 'message-1')
})

test('desktop message request ignore can target a request by profile id without dismissing DM', () => {
  const book = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
    profileId: 'profile-b',
    displayNameSnapshot: 'Ada',
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'home_room'
  })

  const result = createDesktopMessageRequestIgnore({
    book,
    profileId: 'profile-b'
  })

  assert.equal(result.book.pendingRequestsByProfileId.has('profile-b'), false)
  assert.equal(result.dismissedMessageId, '')
})
