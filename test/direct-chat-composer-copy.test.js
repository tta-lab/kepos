import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { getDirectChatComposerCopy } from '../src/direct-chat-composer-copy.ts'

test('direct Chat composer copy names request sends for scanned request targets', () => {
  assert.deepEqual(getDirectChatComposerCopy({ relationshipState: 'request_target' }), {
    placeholder: 'Write an intro for this friend request',
    sendLabel: 'Send request'
  })
})

test('direct Chat composer copy names normal private messages', () => {
  assert.deepEqual(
    getDirectChatComposerCopy({ relationshipState: 'trusted', threadLabel: 'Ada' }),
    {
      placeholder: 'Message Ada',
      sendLabel: 'Send message'
    }
  )
  assert.deepEqual(getDirectChatComposerCopy(), {
    placeholder: 'Write a private message',
    sendLabel: 'Send message'
  })
})

test('direct Chat composer copy uses the shared request-send helper', async () => {
  const source = await readFile(
    new URL('../src/direct-chat-composer-copy.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /canSendFriendRequestFromRelationshipState\(relationshipState\)/)
  assert.doesNotMatch(source, /relationshipState === 'request_target'/)
})
