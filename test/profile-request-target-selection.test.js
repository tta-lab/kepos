import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createContactBook, recordOutgoingFriendRequest } from '../src/contact-book.ts'
import { createProfileRequestTargetSelection } from '../src/profile-request-target-selection.ts'

test('profile request target selection creates the shared request-target view', () => {
  const selection = createProfileRequestTargetSelection({
    contactBook: createContactBook({ ownerProfileId: 'local' }),
    displayNameOverride: 'Ada',
    shortenProfileId: (profileId) => profileId.slice(0, 6),
    target: {
      displayName: 'Signed Ada',
      profileId: 'profile-ada'
    }
  })

  assert.equal(selection.profileId, 'profile-ada')
  assert.equal(selection.notice, 'Write a friend request to introduce yourself.')
  assert.equal(selection.targetView.displayName, 'Ada')
  assert.equal(selection.targetView.relationshipState, 'request_target')
  assert.equal(selection.targetView.canSendRequest, true)
})

test('profile request target selection keeps pending requests in shared state', () => {
  const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    deliveryState: 'queued',
    profileId: 'profile-ada',
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'profile_qr',
    text: 'hello'
  })
  const selection = createProfileRequestTargetSelection({
    contactBook: book,
    target: {
      displayName: 'Ada',
      profileId: 'profile-ada'
    }
  })

  assert.equal(selection.notice, 'Your request is pending. Wait for them to accept.')
  assert.equal(selection.targetView.relationshipState, 'outgoing_request')
  assert.equal(selection.targetView.canSendRequest, false)
})

test('profile request target selection keeps platform scan code out of relationship mapping', async () => {
  const desktop = await readFile(
    new URL('../src/desktop-trust-actions.ts', import.meta.url),
    'utf8'
  )
  const mobile = await readFile(new URL('../mobile/App.tsx', import.meta.url), 'utf8')

  assert.match(desktop, /createProfileRequestTargetSelection\(/)
  assert.match(mobile, /createProfileRequestTargetSelection\(/)
  assert.doesNotMatch(desktop, /createFriendRequestTargetViewModel\(/)
  assert.doesNotMatch(mobile, /createFriendRequestTargetViewModel\(/)
})
