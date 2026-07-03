import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createDirectChatComposerState } from '../src/direct-chat-composer-state.ts'

test('direct Chat composer state enables scanned request target sends', () => {
  assert.deepEqual(
    createDirectChatComposerState({
      draft: ' hello ',
      recipientProfileId: ' profile-ada ',
      relationshipState: 'request_target'
    }),
    {
      canSend: true,
      placeholder: 'Write an intro for this friend request',
      sendLabel: 'Send request'
    }
  )
})

test('direct Chat composer state keeps trusted thread copy and disabled states', () => {
  assert.deepEqual(
    createDirectChatComposerState({
      draft: 'hello',
      recipientProfileId: 'profile-ada',
      relationshipState: 'trusted',
      threadLabel: 'Ada'
    }),
    {
      canSend: true,
      placeholder: 'Message Ada',
      sendLabel: 'Send message'
    }
  )
  assert.equal(
    createDirectChatComposerState({ draft: '', recipientProfileId: 'profile' }).canSend,
    false
  )
  assert.equal(
    createDirectChatComposerState({ draft: 'hello', recipientProfileId: '' }).canSend,
    false
  )
  assert.equal(
    createDirectChatComposerState({
      draft: 'hello',
      enabled: false,
      recipientProfileId: 'profile'
    }).canSend,
    false
  )
})

test('direct Chat composer state keeps platform components out of send availability mapping', async () => {
  const desktop = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const mobile = await readFile(new URL('../mobile/direct-components.tsx', import.meta.url), 'utf8')

  assert.match(desktop, /createDirectChatComposerState\(/)
  assert.match(mobile, /createDirectChatComposerState\(/)
  assert.doesNotMatch(desktop, /getDirectChatComposerCopy\(/)
  assert.doesNotMatch(mobile, /getDirectChatComposerCopy\(/)
})
