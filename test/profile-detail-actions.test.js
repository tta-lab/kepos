import assert from 'node:assert/strict'
import test from 'node:test'

import { createProfileDetailActions } from '../src/profile-detail-actions.ts'

test('profile detail actions prefer incoming request response', () => {
  const actions = createProfileDetailActions({
    acceptRequest: { requestId: 'request-1' },
    ignoreRequest: { profileId: 'profile-1' },
    relationshipState: 'incoming_request'
  })

  assert.deepEqual(actions, {
    acceptRequest: { requestId: 'request-1' },
    ignoreRequest: { profileId: 'profile-1' },
    kind: 'respond'
  })
})

test('profile detail actions allow requests for ignored or removed contacts', () => {
  assert.deepEqual(
    createProfileDetailActions({
      relationshipState: 'ignored'
    }),
    { kind: 'allow_requests' }
  )
  assert.deepEqual(
    createProfileDetailActions({
      relationshipState: 'removed'
    }),
    { kind: 'allow_requests' }
  )
})

test('profile detail actions use explicit allow requests before remove', () => {
  assert.deepEqual(
    createProfileDetailActions({
      canAllowRequests: true,
      relationshipState: 'trusted'
    }),
    { kind: 'allow_requests' }
  )
})

test('profile detail actions fall back to remove or none', () => {
  assert.deepEqual(
    createProfileDetailActions({
      relationshipState: 'trusted'
    }),
    { kind: 'remove' }
  )
  assert.deepEqual(
    createProfileDetailActions({
      canRemove: false,
      relationshipState: 'request_target'
    }),
    { kind: 'none' }
  )
})
