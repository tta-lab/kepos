import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  applyTreeholeEvents,
  createCommentEvent,
  createLikeEvent,
  createPostEvent
} from '../src/treehole-state.js'

describe('treehole state', () => {
  test('post events become newest-first feed items with author visible', () => {
    const events = [
      createPostEvent({
        id: 'post-1',
        author: 'Neil',
        text: 'first line',
        createdAt: 1000
      }),
      createPostEvent({
        id: 'post-2',
        author: 'Ada',
        text: 'second line',
        createdAt: 2000
      })
    ]

    const state = applyTreeholeEvents(events)

    assert.deepEqual(
      state.posts.map((post) => ({
        id: post.id,
        author: post.author,
        text: post.text,
        createdAt: post.createdAt,
        commentCount: post.commentCount,
        likeCount: post.likeCount
      })),
      [
        {
          id: 'post-2',
          author: 'Ada',
          text: 'second line',
          createdAt: 2000,
          commentCount: 0,
          likeCount: 0
        },
        {
          id: 'post-1',
          author: 'Neil',
          text: 'first line',
          createdAt: 1000,
          commentCount: 0,
          likeCount: 0
        }
      ]
    )
  })

  test('comment and like events attach to their target post', () => {
    const events = [
      createPostEvent({
        id: 'post-1',
        author: 'Neil',
        text: 'hello',
        createdAt: 1000
      }),
      createCommentEvent({
        id: 'comment-1',
        postId: 'post-1',
        author: 'Ada',
        text: 'reply',
        createdAt: 1100
      }),
      createLikeEvent({
        postId: 'post-1',
        author: 'Lin',
        createdAt: 1200
      })
    ]

    const state = applyTreeholeEvents(events)

    assert.equal(state.posts[0].commentCount, 1)
    assert.equal(state.posts[0].likeCount, 1)
    assert.deepEqual(state.commentsByPost.get('post-1'), [
      {
        id: 'comment-1',
        postId: 'post-1',
        author: 'Ada',
        text: 'reply',
        createdAt: 1100
      }
    ])
  })

  test('duplicate likes from one author count once', () => {
    const events = [
      createPostEvent({
        id: 'post-1',
        author: 'Neil',
        text: 'hello',
        createdAt: 1000
      }),
      createLikeEvent({
        postId: 'post-1',
        author: 'Ada',
        createdAt: 1100
      }),
      createLikeEvent({
        postId: 'post-1',
        author: 'Ada',
        createdAt: 1200
      })
    ]

    const state = applyTreeholeEvents(events)

    assert.equal(state.posts[0].likeCount, 1)
  })
})
