import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopTreeholeViewModel } from '../src/desktop-treehole-view-model.ts'

test('desktop treehole view model formats posts and comments', () => {
  const viewModel = createDesktopTreeholeViewModel({
    formatTime: (value) => `time:${value}`,
    posts: [
      {
        authorDisplayName: 'Ada',
        authorProfileId: 'b'.repeat(64),
        comments: [
          {
            author: 'Grace',
            authorProfileId: 'c'.repeat(64),
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
      authorAvatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone3'
      },
      authorLabel: 'Ada',
      className: 'item post',
      comments: [
        {
          authorAvatar: {
            initials: 'G',
            label: 'Grace avatar',
            tone: 'avatarTone1'
          },
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

  assert.equal(post.authorLabel, 'Profile bbbb')
  assert.equal(post.comments[0].authorLabel, 'Profile cccc')
  assert.equal(post.statsLabel, '0 comments · 0 likes')
})

test('desktop treehole view model uses product copy when author identity is missing', () => {
  const [post] = createDesktopTreeholeViewModel({
    posts: [
      {
        createdAt: 123,
        id: 'post-1',
        text: 'hello'
      }
    ]
  })

  assert.equal(post.authorLabel, 'Someone')
})

test('desktop treehole view model defaults to an empty list', () => {
  assert.deepEqual(createDesktopTreeholeViewModel(), [])
})
