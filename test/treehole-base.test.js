import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { createTreeholeBase } from '../src/treehole-base.js'

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
