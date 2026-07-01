import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createDesktopTreeholeRuntime } from '../src/desktop-treehole-runtime.ts'

const ownerProfileId = 'a'.repeat(64)
const trustedProfileId = 'b'.repeat(64)
const strangerProfileId = 'c'.repeat(64)

function createFakeTreehole() {
  const calls = []

  return {
    base: { discoveryKey: Buffer.from('discovery') },
    calls,
    key: 'tree-key',
    localWriterKey: 'writer-key',
    addWriter: (key, options) => calls.push(['addWriter', key, options]),
    close: () => calls.push(['close']),
    comment: (payload) => calls.push(['comment', payload]),
    getState: () => ({
      posts: [{ id: 'post-1', text: 'hello' }]
    }),
    like: (payload) => calls.push(['like', payload]),
    post: (payload) => calls.push(['post', payload]),
    replicate: (socket) => calls.push(['replicate', socket]),
    updateTreeholePolicy: (policy) => calls.push(['updateTreeholePolicy', policy])
  }
}

function createRuntime(overrides = {}) {
  const emitted = []
  const errors = []
  const treehole = overrides.treehole || createFakeTreehole()
  const swarm = {
    destroyed: false,
    handlers: new Map(),
    destroy: () => {
      swarm.destroyed = true
    },
    join: () => ({
      flushed: () => Promise.resolve()
    }),
    on: (event, handler) => {
      swarm.handlers.set(event, handler)
    }
  }
  const publisher = {
    stopped: false,
    stop: () => {
      publisher.stopped = true
    }
  }

  const runtime = createDesktopTreeholeRuntime({
    createPublisher: ({ publish }) => {
      publisher.publish = publish
      return publisher
    },
    createSwarm: () => swarm,
    createTreehole: (options) => {
      treehole.options = options
      return treehole
    },
    homeDir: () => '/home/test',
    onError: (error) => errors.push(error.message),
    onStateChanged: (snapshot) => emitted.push(snapshot),
    storageBasePath: overrides.storageBasePath
  })

  runtime.configure({
    homeJoinDetails: {
      identity: { publicKey: ownerProfileId, secretKey: 'secret' },
      ownerProfileId,
      treeholePolicy: {
        ownerProfileId,
        revokedProfileIds: [],
        trustedProfileIds: [trustedProfileId]
      }
    },
    session: {
      nick: 'Owner',
      profileId: ownerProfileId,
      roomKey: 'd'.repeat(64)
    }
  })

  return { emitted, errors, publisher, runtime, swarm, treehole }
}

test('desktop treehole runtime uses injected storage base path', async () => {
  const { runtime, treehole } = createRuntime({
    storageBasePath: '/app/user-data/kepos/v1'
  })

  await runtime.open({ bootstrapKey: 'e'.repeat(64) })

  assert.equal(
    treehole.options.storage,
    '/app/user-data/kepos/v1/kepos-treehole-dddddddddddddddd-eeeeeeeeeeeeeeee'
  )
})

test('desktop treehole runtime keeps worker path free of node os imports', async () => {
  const source = await readFile(
    new URL('../src/desktop-treehole-runtime.ts', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(source, /node:os/)
})

test('desktop treehole runtime opens, publishes state, and closes lifecycle resources', async () => {
  const { emitted, publisher, runtime, swarm, treehole } = createRuntime()

  await runtime.open()
  await publisher.publish({ posts: [{ id: 'post-2' }] })
  await runtime.close()

  assert.deepEqual(emitted, [
    { canPost: true, posts: [], status: 'ready' },
    { canPost: true, posts: [{ id: 'post-2' }], status: 'ready' }
  ])
  assert.equal(swarm.destroyed, true)
  assert.equal(publisher.stopped, true)
  assert.deepEqual(treehole.calls.at(-1), ['close'])
})

test('desktop treehole runtime refreshes state after post comment and like', async () => {
  const { emitted, runtime, treehole } = createRuntime()

  await runtime.open()
  await runtime.post({ createdAt: 1, id: 'post-1', text: '  hello  ' })
  await runtime.comment({ createdAt: 2, id: 'comment-1', postId: 'post-1', text: '  reply  ' })
  await runtime.post({ createdAt: 4, id: 'blank-post', text: '   ' })
  await runtime.comment({ createdAt: 5, id: 'blank-comment', postId: 'post-1', text: '   ' })
  await runtime.like({ createdAt: 3, postId: 'post-1' })

  assert.deepEqual(treehole.calls.slice(0, 3), [
    ['post', { createdAt: 1, id: 'post-1', text: 'hello' }],
    ['comment', { createdAt: 2, id: 'comment-1', postId: 'post-1', text: 'reply' }],
    ['like', { createdAt: 3, postId: 'post-1' }]
  ])
  assert.equal(emitted.at(-1).posts[0].id, 'post-1')
})

test('desktop treehole runtime gates bootstrap and writer controls by policy', async () => {
  const { runtime } = createRuntime()

  await runtime.open()

  assert.deepEqual(runtime.createBootstrapControl(trustedProfileId), {
    key: 'tree-key',
    ownerProfileId,
    type: 'treehole.bootstrap'
  })
  assert.equal(runtime.createBootstrapControl(strangerProfileId), null)
  assert.deepEqual(runtime.createWriterControl(), {
    key: 'writer-key',
    profileId: ownerProfileId,
    type: 'treehole.writer'
  })
})

test('desktop treehole runtime updates active treehole policy when configured', async () => {
  const { emitted, runtime, treehole } = createRuntime()

  await runtime.open()
  await runtime.configure({
    homeJoinDetails: {
      identity: { publicKey: ownerProfileId, secretKey: 'secret' },
      ownerProfileId,
      treeholePolicy: {
        ownerProfileId,
        revokedProfileIds: [trustedProfileId],
        trustedProfileIds: []
      }
    },
    session: {
      nick: 'Owner',
      profileId: ownerProfileId,
      roomKey: 'd'.repeat(64)
    }
  })

  assert.deepEqual(treehole.calls.at(-1), [
    'updateTreeholePolicy',
    {
      ownerProfileId,
      revokedProfileIds: [trustedProfileId],
      trustedProfileIds: []
    }
  ])
  assert.deepEqual(emitted.at(-1), {
    canPost: true,
    posts: [{ comments: [], id: 'post-1', text: 'hello' }],
    status: 'ready'
  })
})

test('desktop treehole runtime adds allowed writers once and ignores denied writers', async () => {
  const { runtime, treehole } = createRuntime()

  await runtime.open()

  assert.equal(
    await runtime.addWriter({ key: 'trusted-writer', profileId: trustedProfileId }),
    true
  )
  assert.equal(
    await runtime.addWriter({ key: 'trusted-writer', profileId: trustedProfileId }),
    false
  )
  assert.equal(
    await runtime.addWriter({ key: 'stranger-writer', profileId: strangerProfileId }),
    false
  )
  assert.deepEqual(
    treehole.calls.filter(([name]) => name === 'addWriter'),
    [['addWriter', 'trusted-writer', { profileId: trustedProfileId }]]
  )
})
