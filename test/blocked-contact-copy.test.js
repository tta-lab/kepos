import assert from 'node:assert/strict'
import test from 'node:test'

import { getBlockedContactCopy } from '../src/blocked-contact-copy.ts'

test('blocked contact copy describes removed friends without promising data deletion', () => {
  assert.deepEqual(getBlockedContactCopy({ revokedAt: 2000 }), {
    blockedAt: 2000,
    copy: 'Future access is stopped. Data already copied to them is not erased.',
    isRemoved: true,
    statusLabel: 'Removed'
  })
})

test('blocked contact copy describes ignored requests as recoverable request state', () => {
  assert.deepEqual(getBlockedContactCopy({ requestIgnoredAt: 4000 }), {
    blockedAt: 4000,
    copy: 'This request is hidden. Allow requests before a new friend request.',
    isRemoved: false,
    statusLabel: 'Ignored'
  })
})
