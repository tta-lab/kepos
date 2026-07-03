import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createTreeholeStatePublisher } from '../src/treehole-state-publisher.ts'

test('treehole state publisher starts without waiting for a slow snapshot', () => {
  let intervalCallback = null

  const publisher = createTreeholeStatePublisher({
    clearIntervalFn: () => {},
    getSnapshot: () => new Promise(() => {}),
    publish: () => {
      throw new Error('unexpected publish')
    },
    setIntervalFn: (callback) => {
      intervalCallback = callback
      return 1
    }
  })

  assert.equal(typeof intervalCallback, 'function')
  publisher.stop()
})

test('treehole state publisher refreshes snapshots and skips overlapping refreshes', async () => {
  let intervalCallback = null
  let resolveSnapshot = null
  let snapshotCalls = 0
  const published = []

  const publisher = createTreeholeStatePublisher({
    clearIntervalFn: () => {},
    getSnapshot: () => {
      snapshotCalls += 1
      return new Promise((resolve) => {
        resolveSnapshot = resolve
      })
    },
    publish: (snapshot) => {
      published.push(snapshot)
    },
    setIntervalFn: (callback) => {
      intervalCallback = callback
      return 1
    }
  })

  assert.equal(snapshotCalls, 1)
  intervalCallback()
  assert.equal(snapshotCalls, 1)

  resolveSnapshot({ posts: [{ id: 'post-1' }] })
  await Promise.resolve()

  intervalCallback()
  assert.equal(snapshotCalls, 2)
  assert.deepEqual(published, [{ posts: [{ id: 'post-1' }] }])

  publisher.stop()
})
