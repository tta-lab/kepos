import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopTreeholeViewModel } from '../src/desktop-treehole-view-model.ts'

test('desktop treehole view model formats posts and comments', () => {
  const viewModel = createDesktopTreeholeViewModel({
    formatTime: (value) => `time:${value}`,
    posts: [
      {
        authorDisplayName: 'Ada',
        comments: [
          {
            author: 'Grace',
            text: 'reply'
          }
        ],
        commentCount: 1,
        createdAt: 123,
        id: 'post-1',
        likeCount: 2,
        text: 'hello'
      }
    ],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.deepEqual(viewModel, [
    {
      actions: {
        commentPostId: 'post-1',
        likePostId: 'post-1'
      },
      authorLabel: 'Ada',
      className: 'item post',
      comments: [
        {
          authorLabel: 'Grace',
          className: 'comment',
          text: 'reply'
        }
      ],
      statsLabel: '1 comments · 2 likes',
      text: 'hello',
      timeLabel: 'time:123'
    }
  ])
})

test('desktop treehole view model falls back to compact profile labels', () => {
  const [post] = createDesktopTreeholeViewModel({
    posts: [
      {
        authorProfileId: 'b'.repeat(64),
        comments: [
          {
            authorProfileId: 'c'.repeat(64),
            text: 'reply'
          }
        ],
        createdAt: 123,
        id: 'post-1',
        text: 'hello'
      }
    ],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.equal(post.authorLabel, 'bbbb')
  assert.equal(post.comments[0].authorLabel, 'cccc')
  assert.equal(post.statsLabel, '0 comments · 0 likes')
})

test('desktop treehole view model defaults to an empty list', () => {
  assert.deepEqual(createDesktopTreeholeViewModel(), [])
})
