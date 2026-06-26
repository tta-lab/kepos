import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createSigningKeyPair } from '../src/signed-record.ts'
import {
  applySignedTreeholeEvents,
  createSignedTreeholeComment,
  createSignedTreeholeCommentTombstone,
  createSignedTreeholeLike,
  createSignedTreeholePost,
  createSignedTreeholePostTombstone,
  createSignedTreeholeWriterGrant,
  verifySignedTreeholeEvent
} from '../src/treehole-signed-events.ts'

function policyFor(owner, trusted = []) {
  return {
    ownerProfileId: owner.publicKey,
    revokedProfileIds: [],
    trustedProfileIds: trusted.map((identity) => identity.publicKey)
  }
}

describe('signed treehole events', () => {
  test('owner signed posts are accepted and trusted non-owner posts are ignored', () => {
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const events = [
      createSignedTreeholePost({
        authorDisplayName: 'Neil',
        createdAt: 1000,
        identity: owner,
        postId: 'post-1',
        text: 'owner post',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholePost({
        authorDisplayName: 'Ada',
        createdAt: 1100,
        identity: trusted,
        postId: 'post-2',
        text: 'not allowed',
        treeholeOwnerProfileId: owner.publicKey
      })
    ]

    const state = applySignedTreeholeEvents(events, policyFor(owner, [trusted]))

    assert.equal(verifySignedTreeholeEvent(events[0]), true)
    assert.deepEqual(
      state.posts.map((post) => ({
        id: post.id,
        authorProfileId: post.authorProfileId,
        text: post.text
      })),
      [
        {
          id: 'post-1',
          authorProfileId: owner.publicKey,
          text: 'owner post'
        }
      ]
    )
  })

  test('trusted signed comments and likes are accepted while strangers are ignored', () => {
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const stranger = createSigningKeyPair()
    const events = [
      createSignedTreeholePost({
        createdAt: 1000,
        identity: owner,
        postId: 'post-1',
        text: 'owner post',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeComment({
        authorDisplayName: 'Ada',
        commentId: 'comment-1',
        createdAt: 1100,
        identity: trusted,
        postId: 'post-1',
        text: 'reply',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeLike({
        createdAt: 1200,
        identity: trusted,
        postId: 'post-1',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeComment({
        commentId: 'comment-2',
        createdAt: 1300,
        identity: stranger,
        postId: 'post-1',
        text: 'blocked',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeLike({
        createdAt: 1400,
        identity: stranger,
        postId: 'post-1',
        treeholeOwnerProfileId: owner.publicKey
      })
    ]

    const state = applySignedTreeholeEvents(events, policyFor(owner, [trusted]))

    assert.equal(state.posts[0].commentCount, 1)
    assert.equal(state.posts[0].likeCount, 1)
    assert.deepEqual(state.commentsByPost.get('post-1'), [
      {
        authorDisplayName: 'Ada',
        authorProfileId: trusted.publicKey,
        createdAt: 1100,
        id: 'comment-1',
        postId: 'post-1',
        text: 'reply'
      }
    ])
  })

  test('owner signed comments and likes are accepted in their own treehole', () => {
    const owner = createSigningKeyPair()
    const events = [
      createSignedTreeholePost({
        createdAt: 1000,
        identity: owner,
        postId: 'post-1',
        text: 'owner post',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeComment({
        commentId: 'comment-1',
        createdAt: 1100,
        identity: owner,
        postId: 'post-1',
        text: 'owner reply',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeLike({
        createdAt: 1200,
        identity: owner,
        postId: 'post-1',
        treeholeOwnerProfileId: owner.publicKey
      })
    ]

    const state = applySignedTreeholeEvents(events, policyFor(owner))

    assert.equal(state.posts[0].commentCount, 1)
    assert.equal(state.posts[0].likeCount, 1)
  })

  test('likes are toggleable through signed add and remove events', () => {
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const events = [
      createSignedTreeholePost({
        createdAt: 1000,
        identity: owner,
        postId: 'post-1',
        text: 'owner post',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeLike({
        createdAt: 1100,
        identity: trusted,
        postId: 'post-1',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeLike({
        action: 'remove',
        createdAt: 1200,
        identity: trusted,
        postId: 'post-1',
        treeholeOwnerProfileId: owner.publicKey
      })
    ]

    const state = applySignedTreeholeEvents(events, policyFor(owner, [trusted]))

    assert.equal(state.posts[0].likeCount, 0)
  })

  test('comment author and treehole owner can tombstone comments', () => {
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const events = [
      createSignedTreeholePost({
        createdAt: 1000,
        identity: owner,
        postId: 'post-1',
        text: 'owner post',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeComment({
        commentId: 'comment-1',
        createdAt: 1100,
        identity: trusted,
        postId: 'post-1',
        text: 'reply',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeCommentTombstone({
        commentId: 'comment-1',
        createdAt: 1200,
        identity: owner,
        postId: 'post-1',
        treeholeOwnerProfileId: owner.publicKey
      })
    ]

    const state = applySignedTreeholeEvents(events, policyFor(owner, [trusted]))

    assert.equal(state.posts[0].commentCount, 0)
    assert.deepEqual(state.commentsByPost.get('post-1'), [])
  })

  test('owner post tombstone hides the post and its interactions', () => {
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const events = [
      createSignedTreeholePost({
        createdAt: 1000,
        identity: owner,
        postId: 'post-1',
        text: 'owner post',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholeComment({
        commentId: 'comment-1',
        createdAt: 1100,
        identity: trusted,
        postId: 'post-1',
        text: 'reply',
        treeholeOwnerProfileId: owner.publicKey
      }),
      createSignedTreeholePostTombstone({
        createdAt: 1200,
        identity: owner,
        postId: 'post-1',
        treeholeOwnerProfileId: owner.publicKey
      })
    ]

    const state = applySignedTreeholeEvents(events, policyFor(owner, [trusted]))

    assert.deepEqual(state.posts, [])
    assert.equal(state.commentsByPost.has('post-1'), false)
  })

  test('tampered signed events are ignored', () => {
    const owner = createSigningKeyPair()
    const event = createSignedTreeholePost({
      createdAt: 1000,
      identity: owner,
      postId: 'post-1',
      text: 'owner post',
      treeholeOwnerProfileId: owner.publicKey
    })

    const state = applySignedTreeholeEvents(
      [
        {
          ...event,
          text: 'tampered'
        }
      ],
      policyFor(owner)
    )

    assert.equal(verifySignedTreeholeEvent({ ...event, text: 'tampered' }), false)
    assert.deepEqual(state.posts, [])
  })

  test('writer grants must be owner signed and bind profile id to writer key', () => {
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const writerKey = 'a'.repeat(64)
    const event = createSignedTreeholeWriterGrant({
      createdAt: 1000,
      identity: owner,
      treeholeOwnerProfileId: owner.publicKey,
      writerKey,
      writerProfileId: trusted.publicKey
    })

    assert.equal(verifySignedTreeholeEvent(event), true)
    assert.equal(verifySignedTreeholeEvent({ ...event, writerKey: 'b'.repeat(64) }), false)
    assert.equal(
      verifySignedTreeholeEvent({
        ...event,
        treeholeOwnerProfileId: trusted.publicKey
      }),
      false
    )
  })
})
