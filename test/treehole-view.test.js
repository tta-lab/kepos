import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { serializeTreeholeState } from '../src/treehole-view.ts'

describe('treehole view serialization', () => {
  test('embeds comments in posts for UI and RPC payloads', () => {
    const state = {
      commentsByPost: new Map([
        [
          'post-1',
          [
            {
              authorDisplayName: 'Ada',
              createdAt: 1100,
              id: 'comment-1',
              postId: 'post-1',
              text: 'reply'
            }
          ]
        ]
      ]),
      posts: [
        {
          commentCount: 1,
          createdAt: 1000,
          id: 'post-1',
          likeCount: 2,
          text: 'hello'
        }
      ]
    }

    assert.deepEqual(serializeTreeholeState(state), {
      posts: [
        {
          commentCount: 1,
          comments: [
            {
              authorDisplayName: 'Ada',
              createdAt: 1100,
              id: 'comment-1',
              postId: 'post-1',
              text: 'reply'
            }
          ],
          createdAt: 1000,
          id: 'post-1',
          likeCount: 2,
          text: 'hello'
        }
      ]
    })
  })
})
