import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAllowRequestsForRelationshipState,
  canSendFriendRequestFromRelationshipState,
  isTrustedRelationshipState,
  shouldBlockChatSendForRelationshipState
} from '../src/profile-relationship-state.ts'

test('profile relationship state keeps request target as the only pre-trust sendable state', () => {
  assert.equal(canSendFriendRequestFromRelationshipState('request_target'), true)
  assert.equal(shouldBlockChatSendForRelationshipState('request_target'), false)

  for (const state of ['blocked', 'ignored', 'incoming_request', 'outgoing_request', 'removed']) {
    assert.equal(canSendFriendRequestFromRelationshipState(state), false)
    assert.equal(shouldBlockChatSendForRelationshipState(state), true)
  }

  assert.equal(canSendFriendRequestFromRelationshipState('trusted'), false)
  assert.equal(shouldBlockChatSendForRelationshipState('trusted'), false)
})

test('profile relationship state limits post-trust actions to explicit states', () => {
  assert.equal(isTrustedRelationshipState('trusted'), true)
  assert.equal(isTrustedRelationshipState('request_target'), false)
  assert.equal(canAllowRequestsForRelationshipState('ignored'), true)
  assert.equal(canAllowRequestsForRelationshipState('removed'), true)
  assert.equal(canAllowRequestsForRelationshipState('trusted'), false)
})
