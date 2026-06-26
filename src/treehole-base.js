import Autobase from 'autobase'
import Corestore from 'corestore'
import b4a from 'b4a'
import {
  applyTreeholeEvents,
  createCommentEvent,
  createLikeEvent,
  createPostEvent
} from './treehole-state.js'
import {
  applySignedTreeholeEvents,
  createSignedTreeholeComment,
  createSignedTreeholeCommentTombstone,
  createSignedTreeholeLike,
  createSignedTreeholePost,
  createSignedTreeholePostTombstone,
  createSignedTreeholeWriterGrant,
  verifySignedTreeholeEvent
} from './treehole-signed-events.ts'
import { createSignedTreeholePolicy } from './treehole-policy.ts'

export async function createTreeholeBase({
  identity = null,
  mode = 'prototype',
  storage,
  bootstrapKey = null,
  nick = 'anon',
  profileId = null,
  treeholeOwnerProfileId = null,
  treeholePolicy = null
} = {}) {
  const signedMode = mode === 'signed'
  if (mode !== 'prototype' && !signedMode) {
    throw new Error('Unsupported treehole mode')
  }
  if (signedMode && !identity) {
    throw new Error('Signed treehole mode requires an identity')
  }

  const ownerProfileId = treeholeOwnerProfileId || profileId || identity?.publicKey || null
  const signedPolicy = signedMode
    ? createSignedTreeholePolicy({ ownerProfileId, treeholePolicy })
    : null
  const store = new Corestore(storage || randomAccessMemory())
  await store.ready()

  const base = new Autobase(store, bootstrapKey ? b4a.from(bootstrapKey, 'hex') : null, {
    open,
    apply: (nodes, view, host) => apply(nodes, view, host, { ownerProfileId, signedMode }),
    valueEncoding: 'json'
  })
  await base.ready()

  async function post({ id, text, createdAt = Date.now() }) {
    if (signedMode) {
      await base.append(
        createSignedTreeholePost({
          authorDisplayName: nick,
          createdAt,
          identity,
          postId: id,
          text,
          treeholeOwnerProfileId: ownerProfileId
        })
      )
      await base.update()
      return
    }

    await base.append(
      createPostEvent({
        id,
        author: nick,
        authorProfileId: profileId,
        text,
        createdAt
      })
    )
    await base.update()
  }

  async function comment({ id, postId, text, createdAt = Date.now() }) {
    if (signedMode) {
      await base.append(
        createSignedTreeholeComment({
          authorDisplayName: nick,
          commentId: id,
          createdAt,
          identity,
          postId,
          text,
          treeholeOwnerProfileId: ownerProfileId
        })
      )
      await base.update()
      return
    }

    await base.append(
      createCommentEvent({
        id,
        postId,
        author: nick,
        text,
        createdAt
      })
    )
    await base.update()
  }

  async function like({ postId, createdAt = Date.now(), action = 'add' }) {
    if (signedMode) {
      await base.append(
        createSignedTreeholeLike({
          action,
          createdAt,
          identity,
          postId,
          treeholeOwnerProfileId: ownerProfileId
        })
      )
      await base.update()
      return
    }

    await base.append(
      createLikeEvent({
        postId,
        author: nick,
        createdAt
      })
    )
    await base.update()
  }

  async function deletePost({ postId, createdAt = Date.now() }) {
    assertSignedMode('deletePost')
    await base.append(
      createSignedTreeholePostTombstone({
        createdAt,
        identity,
        postId,
        treeholeOwnerProfileId: ownerProfileId
      })
    )
    await base.update()
  }

  async function deleteComment({ commentId, postId, createdAt = Date.now() }) {
    assertSignedMode('deleteComment')
    await base.append(
      createSignedTreeholeCommentTombstone({
        commentId,
        createdAt,
        identity,
        postId,
        treeholeOwnerProfileId: ownerProfileId
      })
    )
    await base.update()
  }

  async function addWriter(
    key,
    { createdAt = Date.now(), profileId: writerProfileId = null } = {}
  ) {
    if (signedMode) {
      if (!writerProfileId) {
        throw new Error('Signed treehole writer grant requires writer profile id')
      }

      await base.append(
        createSignedTreeholeWriterGrant({
          createdAt,
          identity,
          treeholeOwnerProfileId: ownerProfileId,
          writerKey: key,
          writerProfileId
        })
      )
      await base.update()
      return
    }

    await base.append({
      type: 'treehole.writer.add',
      key
    })
    await base.update()
  }

  async function getEvents() {
    await base.update()

    const events = []
    for (let index = 0; index < base.view.length; index += 1) {
      const event = await base.view.get(index)
      if (event) {
        events.push(event)
      }
    }

    return events
  }

  async function getState() {
    if (signedMode) {
      return applySignedTreeholeEvents(await getEvents(), signedPolicy)
    }

    return applyTreeholeEvents(await getEvents())
  }

  async function close() {
    await base.close()
    await store.close()
  }

  return {
    addWriter,
    base,
    close,
    comment,
    deleteComment,
    deletePost,
    getEvents,
    getState,
    key: b4a.toString(base.key, 'hex'),
    like,
    localWriterKey: b4a.toString(base.local.key, 'hex'),
    post,
    replicate: (...args) => base.replicate(...args)
  }

  function assertSignedMode(method) {
    if (!signedMode) {
      throw new Error(`${method} requires signed treehole mode`)
    }
  }
}

function open(store) {
  return store.get({ name: 'treehole-events', valueEncoding: 'json' })
}

async function apply(nodes, view, host, { ownerProfileId = null, signedMode = false } = {}) {
  for (const node of nodes) {
    const event = node.value

    if (!event) {
      continue
    }

    if (event.type === 'treehole.writer.add') {
      if (signedMode) {
        continue
      }

      await host.addWriter(b4a.from(event.key, 'hex'), { indexer: true })
      continue
    }

    if (event.type === 'treehole.writer.grant.v1') {
      if (
        signedMode &&
        event.treeholeOwnerProfileId === ownerProfileId &&
        verifySignedTreeholeEvent(event)
      ) {
        await host.addWriter(b4a.from(event.writerKey, 'hex'), { indexer: true })
        await view.append(event)
      }
      continue
    }

    await view.append(event)
  }
}

function randomAccessMemory() {
  throw new Error('Treehole storage path is required')
}
