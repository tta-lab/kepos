import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createFriendRequestComposerState } from '../src/friend-request-composer-state.ts'

test('friend request composer state shows a focused composer for a selected request target', () => {
  assert.deepEqual(
    createFriendRequestComposerState({
      draft: ' hello ',
      recipientProfileId: ' profile-ada ',
      requestTarget: {
        copy: 'Send a request before chatting.',
        displayName: 'Ada',
        profileId: 'profile-ada',
        relationshipState: 'request_target',
        shortProfileId: 'ada-short'
      }
    }),
    {
      canSend: true,
      copy: 'Send a request before chatting.',
      isVisible: true,
      placeholder: 'Write a short friend request',
      profileId: 'profile-ada',
      sendLabel: 'Send request',
      text: 'hello',
      title: 'Add Ada'
    }
  )
})

test('friend request composer state hides for non-selected or blocked targets', () => {
  assert.equal(
    createFriendRequestComposerState({
      draft: 'hello',
      recipientProfileId: 'other',
      requestTarget: {
        copy: '',
        displayName: 'Ada',
        profileId: 'profile-ada',
        relationshipState: 'request_target',
        shortProfileId: 'ada-short'
      }
    }).isVisible,
    false
  )

  assert.equal(
    createFriendRequestComposerState({
      draft: 'hello',
      recipientProfileId: 'profile-ada',
      requestTarget: {
        copy: '',
        displayName: 'Ada',
        profileId: 'profile-ada',
        relationshipState: 'outgoing_request',
        shortProfileId: 'ada-short'
      }
    }).canSend,
    false
  )
})

test('friend request composer state keeps platform components out of request visibility checks', async () => {
  const desktop = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const mobile = await readFile(new URL('../mobile/direct-components.tsx', import.meta.url), 'utf8')

  assert.match(desktop, /createFriendRequestComposerState\(/)
  assert.match(mobile, /createFriendRequestComposerState\(/)
  assert.doesNotMatch(desktop, /relationshipState === 'request_target'/)
  assert.doesNotMatch(mobile, /relationshipState === 'request_target'/)
})
