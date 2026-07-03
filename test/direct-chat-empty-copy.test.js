import assert from 'node:assert/strict'
import test from 'node:test'

import { getDirectChatEmptyCopy } from '../src/direct-chat-empty-copy.ts'

test('direct Chat empty copy invites an intro for scanned request targets', () => {
  assert.equal(
    getDirectChatEmptyCopy({ relationshipState: 'request_target' }),
    'Write an intro to send this friend request.'
  )
})

test('direct Chat empty copy uses trusted-contact guidance for normal empty Chat', () => {
  assert.equal(
    getDirectChatEmptyCopy({ relationshipState: 'trusted' }),
    'Choose a trusted contact and send the first message.'
  )
  assert.equal(getDirectChatEmptyCopy(), 'Choose a trusted contact and send the first message.')
})
