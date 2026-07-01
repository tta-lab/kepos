import assert from 'node:assert/strict'
import test from 'node:test'
import { createProfileRecentPostsViewModel } from '../src/profile-recent-posts-view-model.ts'

test('profile recent posts stay empty until the selected profile owns the active home', () => {
  assert.deepEqual(
    createProfileRecentPostsViewModel({
      activeHomeOwnerProfileId: 'owner-a',
      posts: [{ createdAt: 1000, id: 'post-1', text: 'hello' }],
      selectedProfileId: 'owner-b'
    }),
    {
      recentCopy: 'Enter their home to load recent posts.',
      recentPosts: [],
      recentTitle: 'Recent posts'
    }
  )
})

test('profile recent posts show the latest loaded treehole posts for the active home owner', () => {
  assert.deepEqual(
    createProfileRecentPostsViewModel({
      activeHomeOwnerProfileId: 'owner-a',
      formatTime: () => '09:30',
      posts: [
        {
          commentCount: 2,
          createdAt: 1000,
          id: 'post-1',
          likeCount: 3,
          text: 'first'
        },
        {
          comments: [{ id: 'comment-1' }],
          createdAt: 2000,
          id: 'post-2',
          likes: new Set(['a', 'b']),
          text: 'second'
        },
        {
          createdAt: 3000,
          id: 'post-3',
          text: 'third'
        },
        {
          createdAt: 4000,
          id: 'post-4',
          text: 'fourth'
        }
      ],
      selectedProfileId: 'owner-a'
    }),
    {
      recentCopy: '3 recent posts from this home.',
      recentPosts: [
        {
          id: 'post-1',
          metaLabel: '09:30 · 2 comments · 3 likes',
          text: 'first'
        },
        {
          id: 'post-2',
          metaLabel: '09:30 · 1 comment · 2 likes',
          text: 'second'
        },
        {
          id: 'post-3',
          metaLabel: '09:30 · 0 comments · 0 likes',
          text: 'third'
        }
      ],
      recentTitle: 'Recent posts'
    }
  )
})

test('profile recent posts fall back to cached posts after leaving a contact home', () => {
  assert.deepEqual(
    createProfileRecentPostsViewModel({
      activeHomeOwnerProfileId: '',
      cachedPostsByProfileId: {
        'owner-a': [
          {
            commentCount: 1,
            createdAt: 1000,
            id: 'cached-1',
            likeCount: 2,
            text: 'cached hello'
          }
        ]
      },
      formatTime: () => '10:30',
      selectedProfileId: 'owner-a'
    }),
    {
      recentCopy: '1 cached recent post from last visit.',
      recentPosts: [
        {
          id: 'cached-1',
          metaLabel: '10:30 · 1 comment · 2 likes',
          text: 'cached hello'
        }
      ],
      recentTitle: 'Recent posts'
    }
  )
})
