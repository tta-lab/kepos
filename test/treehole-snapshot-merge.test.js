import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { mergeTreeholeSnapshots } from '../src/treehole-snapshot-merge.js'

describe('treehole snapshot merge', () => {
  test('keeps remote posts when a local empty snapshot arrives later', () => {
    assert.deepEqual(
      mergeTreeholeSnapshots(
        {
          posts: [
            {
              createdAt: 2000,
              id: 'post-1',
              text: 'remote post'
            }
          ]
        },
        { posts: [] }
      ),
      {
        posts: [
          {
            comments: [],
            createdAt: 2000,
            id: 'post-1',
            text: 'remote post'
          }
        ]
      }
    )
  })

  test('merges posts and comments by id in newest-first order', () => {
    assert.deepEqual(
      mergeTreeholeSnapshots(
        {
          posts: [
            {
              comments: [{ createdAt: 2100, id: 'comment-1', text: 'first' }],
              createdAt: 2000,
              id: 'post-1',
              likeCount: 0,
              text: 'old'
            }
          ]
        },
        {
          posts: [
            {
              comments: [
                { createdAt: 2200, id: 'comment-2', text: 'second' },
                { createdAt: 2100, id: 'comment-1', text: 'first edited' }
              ],
              createdAt: 3000,
              id: 'post-2',
              text: 'new'
            },
            {
              createdAt: 2000,
              id: 'post-1',
              likeCount: 2,
              text: 'old'
            }
          ]
        }
      ),
      {
        posts: [
          {
            comments: [
              { createdAt: 2200, id: 'comment-2', text: 'second' },
              { createdAt: 2100, id: 'comment-1', text: 'first edited' }
            ],
            createdAt: 3000,
            id: 'post-2',
            text: 'new'
          },
          {
            comments: [{ createdAt: 2100, id: 'comment-1', text: 'first' }],
            createdAt: 2000,
            id: 'post-1',
            likeCount: 2,
            text: 'old'
          }
        ]
      }
    )
  })
})
