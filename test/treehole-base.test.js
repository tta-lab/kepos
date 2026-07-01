import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { createSigningKeyPair } from '../src/signed-record.ts'
import { createTreeholeBase } from '../src/treehole-base.ts'

describe('treehole autobase', () => {
  test('appends text posts into an autobase-backed feed', async () => {
    const storage = await mkdtemp(join(tmpdir(), 'kepos-treehole-'))

    try {
      const treehole = await createTreeholeBase({ storage, nick: 'Neil' })
      await treehole.post({
        id: 'post-1',
        text: 'hello treehole',
        createdAt: 1000
      })

      const state = await treehole.getState()

      assert.equal(treehole.key.length, 64)
      assert.deepEqual(state.posts, [
        {
          id: 'post-1',
          author: 'Neil',
          text: 'hello treehole',
          createdAt: 1000,
          commentCount: 0,
          likeCount: 0
        }
      ])

      await treehole.close()
    } finally {
      await rm(storage, { recursive: true, force: true })
    }
  })

  test('appends profile-owned posts while preserving display author', async () => {
    const storage = await mkdtemp(join(tmpdir(), 'kepos-treehole-profile-'))

    try {
      const treehole = await createTreeholeBase({
        storage,
        profileId: 'profile-a',
        nick: 'Ada'
      })
      await treehole.post({
        id: 'post-1',
        text: 'owned by profile',
        createdAt: 1000
      })

      const state = await treehole.getState()

      assert.deepEqual(state.posts, [
        {
          id: 'post-1',
          author: 'Ada',
          authorProfileId: 'profile-a',
          text: 'owned by profile',
          createdAt: 1000,
          commentCount: 0,
          likeCount: 0
        }
      ])

      await treehole.close()
    } finally {
      await rm(storage, { recursive: true, force: true })
    }
  })

  test('replicates posts from an added writer', async () => {
    const firstStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-a-'))
    const secondStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-b-'))

    try {
      const first = await createTreeholeBase({
        storage: firstStorage,
        nick: 'Neil'
      })
      const second = await createTreeholeBase({
        storage: secondStorage,
        bootstrapKey: first.key,
        nick: 'Ada'
      })

      await first.addWriter(second.localWriterKey)
      await replicateOnce(first, second)
      await second.post({
        id: 'post-2',
        text: 'from peer',
        createdAt: 2000
      })
      await replicateOnce(first, second)

      const firstState = await first.getState()
      const secondState = await second.getState()

      assert.equal(firstState.posts[0].author, 'Ada')
      assert.deepEqual(firstState.posts, secondState.posts)

      await first.close()
      await second.close()
    } finally {
      await rm(firstStorage, { recursive: true, force: true })
      await rm(secondStorage, { recursive: true, force: true })
    }
  })

  test('signed mode accepts owner posts and trusted interactions only', async () => {
    const firstStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-signed-a-'))
    const secondStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-signed-b-'))
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const policy = {
      ownerProfileId: owner.publicKey,
      revokedProfileIds: [],
      trustedProfileIds: [trusted.publicKey]
    }

    try {
      const first = await createTreeholeBase({
        identity: owner,
        mode: 'signed',
        nick: 'Neil',
        storage: firstStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: policy
      })
      const second = await createTreeholeBase({
        bootstrapKey: first.key,
        identity: trusted,
        mode: 'signed',
        nick: 'Ada',
        storage: secondStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: policy
      })

      await first.post({
        id: 'post-1',
        text: 'owner post',
        createdAt: 1000
      })
      await first.addWriter(second.localWriterKey, { profileId: trusted.publicKey })
      await replicateOnce(first, second)
      await second.post({
        id: 'post-2',
        text: 'trusted cannot create main post',
        createdAt: 1100
      })
      await second.comment({
        id: 'comment-1',
        postId: 'post-1',
        text: 'trusted reply',
        createdAt: 1200
      })
      await second.like({
        postId: 'post-1',
        createdAt: 1300
      })
      await replicateOnce(first, second)

      const state = await first.getState()
      const events = await first.getEvents()
      const writerGrant = events.find((event) => event.type === 'treehole.writer.grant.v1')

      assert.deepEqual(
        state.posts.map((post) => ({
          id: post.id,
          authorDisplayName: post.authorDisplayName,
          authorProfileId: post.authorProfileId,
          commentCount: post.commentCount,
          likeCount: post.likeCount,
          text: post.text
        })),
        [
          {
            id: 'post-1',
            authorDisplayName: 'Neil',
            authorProfileId: owner.publicKey,
            commentCount: 1,
            likeCount: 1,
            text: 'owner post'
          }
        ]
      )
      assert.deepEqual(state.commentsByPost.get('post-1'), [
        {
          authorDisplayName: 'Ada',
          authorProfileId: trusted.publicKey,
          createdAt: 1200,
          id: 'comment-1',
          postId: 'post-1',
          text: 'trusted reply'
        }
      ])
      assert.equal(writerGrant?.proof.signerProfileId, owner.publicKey)
      assert.equal(writerGrant?.writerKey, second.localWriterKey)
      assert.equal(writerGrant?.writerProfileId, trusted.publicKey)

      await first.close()
      await second.close()
    } finally {
      await rm(firstStorage, { recursive: true, force: true })
      await rm(secondStorage, { recursive: true, force: true })
    }
  })

  test('signed mode applies updated policy to an open treehole', async () => {
    const firstStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-policy-a-'))
    const secondStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-policy-b-'))
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const trustedPolicy = {
      ownerProfileId: owner.publicKey,
      revokedProfileIds: [],
      trustedProfileIds: [trusted.publicKey]
    }

    try {
      const first = await createTreeholeBase({
        identity: owner,
        mode: 'signed',
        nick: 'Neil',
        storage: firstStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: trustedPolicy
      })
      const second = await createTreeholeBase({
        bootstrapKey: first.key,
        identity: trusted,
        mode: 'signed',
        nick: 'Ada',
        storage: secondStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: trustedPolicy
      })

      await first.post({
        id: 'post-1',
        text: 'owner post',
        createdAt: 1000
      })
      await first.addWriter(second.localWriterKey, { profileId: trusted.publicKey })
      await replicateOnce(first, second)
      await second.comment({
        id: 'comment-1',
        postId: 'post-1',
        text: 'trusted reply',
        createdAt: 1100
      })
      await second.like({
        postId: 'post-1',
        createdAt: 1200
      })
      await replicateOnce(first, second)

      assert.equal((await first.getState()).posts[0].commentCount, 1)
      assert.equal((await first.getState()).posts[0].likeCount, 1)

      first.updateTreeholePolicy({
        ownerProfileId: owner.publicKey,
        revokedProfileIds: [trusted.publicKey],
        trustedProfileIds: []
      })

      const state = await first.getState()

      assert.equal(state.posts[0].commentCount, 0)
      assert.equal(state.posts[0].likeCount, 0)

      await first.close()
      await second.close()
    } finally {
      await rm(firstStorage, { recursive: true, force: true })
      await rm(secondStorage, { recursive: true, force: true })
    }
  })

  test('signed mode lets the owner delete comments through tombstones', async () => {
    const firstStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-delete-a-'))
    const secondStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-delete-b-'))
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const policy = {
      ownerProfileId: owner.publicKey,
      revokedProfileIds: [],
      trustedProfileIds: [trusted.publicKey]
    }

    try {
      const first = await createTreeholeBase({
        identity: owner,
        mode: 'signed',
        nick: 'Neil',
        storage: firstStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: policy
      })
      const second = await createTreeholeBase({
        bootstrapKey: first.key,
        identity: trusted,
        mode: 'signed',
        nick: 'Ada',
        storage: secondStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: policy
      })

      await first.post({
        id: 'post-1',
        text: 'owner post',
        createdAt: 1000
      })
      await first.addWriter(second.localWriterKey, { profileId: trusted.publicKey })
      await replicateOnce(first, second)
      await second.comment({
        id: 'comment-1',
        postId: 'post-1',
        text: 'trusted reply',
        createdAt: 1100
      })
      await replicateOnce(first, second)
      await first.deleteComment({
        commentId: 'comment-1',
        postId: 'post-1',
        createdAt: 1200
      })

      const state = await first.getState()

      assert.equal(state.posts[0].commentCount, 0)
      assert.deepEqual(state.commentsByPost.get('post-1'), [])

      await first.close()
      await second.close()
    } finally {
      await rm(firstStorage, { recursive: true, force: true })
      await rm(secondStorage, { recursive: true, force: true })
    }
  })

  test('signed mode rejects writer grants without the writer profile id', async () => {
    const storage = await mkdtemp(join(tmpdir(), 'kepos-treehole-writer-profile-'))
    const owner = createSigningKeyPair()

    try {
      const treehole = await createTreeholeBase({
        identity: owner,
        mode: 'signed',
        nick: 'Neil',
        storage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: {
          ownerProfileId: owner.publicKey,
          revokedProfileIds: [],
          trustedProfileIds: []
        }
      })

      await assert.rejects(() => treehole.addWriter('a'.repeat(64)), /writer profile id/i)

      await treehole.close()
    } finally {
      await rm(storage, { recursive: true, force: true })
    }
  })

  test('signed mode ignores unsigned writer add events', async () => {
    const firstStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-unsigned-a-'))
    const secondStorage = await mkdtemp(join(tmpdir(), 'kepos-treehole-unsigned-b-'))
    const owner = createSigningKeyPair()
    const trusted = createSigningKeyPair()
    const policy = {
      ownerProfileId: owner.publicKey,
      revokedProfileIds: [],
      trustedProfileIds: [trusted.publicKey]
    }

    try {
      const first = await createTreeholeBase({
        identity: owner,
        mode: 'signed',
        nick: 'Neil',
        storage: firstStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: policy
      })
      const second = await createTreeholeBase({
        bootstrapKey: first.key,
        identity: trusted,
        mode: 'signed',
        nick: 'Ada',
        storage: secondStorage,
        treeholeOwnerProfileId: owner.publicKey,
        treeholePolicy: policy
      })

      await first.base.append({
        key: second.localWriterKey,
        type: 'treehole.writer.add'
      })
      await first.base.update()
      await replicateOnce(first, second)
      await assert.rejects(
        () =>
          second.comment({
            id: 'comment-1',
            postId: 'post-1',
            text: 'should not replicate',
            createdAt: 1000
          }),
        /not writable/i
      )
      await replicateOnce(first, second)

      const events = await first.getEvents()

      assert.equal(
        events.some((event) => event.commentId === 'comment-1'),
        false
      )

      await first.close()
      await second.close()
    } finally {
      await rm(firstStorage, { recursive: true, force: true })
      await rm(secondStorage, { recursive: true, force: true })
    }
  })
})

async function replicateOnce(left, right) {
  const leftStream = left.replicate(true)
  const rightStream = right.replicate(false)

  leftStream.pipe(rightStream).pipe(leftStream)
  await Promise.all([left.base.update(), right.base.update()])
  await new Promise((resolve) => setTimeout(resolve, 50))
  await Promise.all([left.base.update(), right.base.update()])
  leftStream.destroy()
  rightStream.destroy()
}
