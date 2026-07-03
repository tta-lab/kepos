import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  canGrantTreeholeWriter,
  canShareTreeholeBootstrap,
  createTreeholeSessionOptions
} from '../src/treehole-policy.ts'

describe('treehole session options', () => {
  test('uses signed mode when identity and owner are available', () => {
    const identity = {
      publicKey: 'a'.repeat(64),
      secretKey: 'b'.repeat(128)
    }

    const options = createTreeholeSessionOptions({
      bootstrapKey: null,
      identity,
      nick: 'Neil',
      ownerProfileId: identity.publicKey,
      profileId: identity.publicKey,
      storage: '/tmp/treehole',
      treeholePolicy: {
        ownerProfileId: identity.publicKey,
        trustedProfileIds: ['c'.repeat(64)]
      }
    })

    assert.deepEqual(options, {
      bootstrapKey: null,
      identity,
      mode: 'signed',
      nick: 'Neil',
      profileId: identity.publicKey,
      storage: '/tmp/treehole',
      treeholeOwnerProfileId: identity.publicKey,
      treeholePolicy: {
        ownerProfileId: identity.publicKey,
        revokedProfileIds: [],
        trustedProfileIds: ['c'.repeat(64)]
      }
    })
  })

  test('keeps prototype mode when identity is unavailable', () => {
    const options = createTreeholeSessionOptions({
      bootstrapKey: 'd'.repeat(64),
      nick: 'Ada',
      ownerProfileId: 'a'.repeat(64),
      profileId: 'b'.repeat(64),
      storage: '/tmp/treehole'
    })

    assert.deepEqual(options, {
      bootstrapKey: 'd'.repeat(64),
      mode: 'prototype',
      nick: 'Ada',
      profileId: 'b'.repeat(64),
      storage: '/tmp/treehole'
    })
  })

  test('gates treehole writer grants by owner trust policy', () => {
    const ownerProfileId = 'a'.repeat(64)
    const trustedProfileId = 'b'.repeat(64)
    const revokedProfileId = 'c'.repeat(64)
    const unknownProfileId = 'd'.repeat(64)
    const policy = {
      ownerProfileId,
      revokedProfileIds: [revokedProfileId],
      trustedProfileIds: [trustedProfileId, revokedProfileId]
    }

    assert.equal(
      canGrantTreeholeWriter({ ownerProfileId, policy, writerProfileId: ownerProfileId }),
      true
    )
    assert.equal(
      canGrantTreeholeWriter({ ownerProfileId, policy, writerProfileId: trustedProfileId }),
      true
    )
    assert.equal(
      canGrantTreeholeWriter({ ownerProfileId, policy, writerProfileId: revokedProfileId }),
      false
    )
    assert.equal(
      canGrantTreeholeWriter({ ownerProfileId, policy, writerProfileId: unknownProfileId }),
      false
    )
  })

  test('shares treehole bootstrap only from the owner to trusted writers', () => {
    const ownerProfileId = 'a'.repeat(64)
    const trustedProfileId = 'b'.repeat(64)
    const unknownProfileId = 'c'.repeat(64)
    const policy = {
      ownerProfileId,
      revokedProfileIds: [],
      trustedProfileIds: [trustedProfileId]
    }

    assert.equal(
      canShareTreeholeBootstrap({
        localProfileId: ownerProfileId,
        ownerProfileId,
        policy,
        remoteProfileId: trustedProfileId
      }),
      true
    )
    assert.equal(
      canShareTreeholeBootstrap({
        localProfileId: trustedProfileId,
        ownerProfileId,
        policy,
        remoteProfileId: ownerProfileId
      }),
      false
    )
    assert.equal(
      canShareTreeholeBootstrap({
        localProfileId: ownerProfileId,
        ownerProfileId,
        policy,
        remoteProfileId: unknownProfileId
      }),
      false
    )
  })
})
