import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAllowRequestsForRelationshipState,
  canRespondToFriendRequestForRelationshipState,
  canSendFriendRequestFromRelationshipState,
  inferStoredContactRelationshipState,
  isTrustedRelationshipState,
  resolveProfileRelationshipStateFromBook,
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
  assert.equal(canRespondToFriendRequestForRelationshipState('incoming_request'), true)
  assert.equal(canRespondToFriendRequestForRelationshipState('outgoing_request'), false)
  assert.equal(canRespondToFriendRequestForRelationshipState('trusted'), false)
})

test('profile relationship state infers stored contact states in one place', () => {
  assert.equal(inferStoredContactRelationshipState({ trustedAt: 1000 }), 'trusted')
  assert.equal(
    inferStoredContactRelationshipState({ requestIgnoredAt: 2000, trustedAt: 1000 }),
    'ignored'
  )
  assert.equal(
    inferStoredContactRelationshipState({
      requestIgnoredAt: 2000,
      revokedAt: 3000,
      trustedAt: 1000
    }),
    'removed'
  )
})

test('profile relationship state resolves the ContactBook social state order', () => {
  const book = {
    contactsByProfileId: new Map([
      ['trusted', { trustedAt: 1000 }],
      ['removed', { revokedAt: 2000, trustedAt: 1000 }],
      ['ignored', { requestIgnoredAt: 3000 }]
    ]),
    outgoingRequestsByProfileId: new Map([['outgoing', {}]]),
    pendingRequestsByProfileId: new Map([['incoming', {}]])
  }

  assert.equal(resolveProfileRelationshipStateFromBook({ book, profileId: 'trusted' }), 'trusted')
  assert.equal(resolveProfileRelationshipStateFromBook({ book, profileId: 'removed' }), 'removed')
  assert.equal(resolveProfileRelationshipStateFromBook({ book, profileId: 'ignored' }), 'ignored')
  assert.equal(
    resolveProfileRelationshipStateFromBook({ book, profileId: 'outgoing' }),
    'outgoing_request'
  )
  assert.equal(
    resolveProfileRelationshipStateFromBook({ book, profileId: 'incoming' }),
    'incoming_request'
  )
  assert.equal(
    resolveProfileRelationshipStateFromBook({ book, profileId: 'new-profile' }),
    'request_target'
  )
})
