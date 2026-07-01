import Autobase from 'autobase'
import Corestore from 'corestore'
import b4a from 'b4a'
import {
  applyTreeholeEvents,
  createCommentEvent,
  createLikeEvent,
  createPostEvent
} from './treehole-state.ts'
import type { TreeholeEvent as PrototypeTreeholeEvent, TreeholeState } from './treehole-state.ts'
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
import type { TreeholeIdentity, TreeholePolicy } from './treehole-policy.ts'

export async function createTreeholeBase({
  identity = null,
  mode = 'prototype',
  storage,
  bootstrapKey = null,
  nick = 'anon',
  profileId = null,
  treeholeOwnerProfileId = null,
  treeholePolicy = null
}: CreateTreeholeBaseOptions = {}): Promise<TreeholeBase> {
  const signedMode = mode === 'signed'
  if (mode !== 'prototype' && !signedMode) {
    throw new Error('Unsupported treehole mode')
  }
  if (signedMode && !identity) {
    throw new Error('Signed treehole mode requires an identity')
  }

  const ownerProfileId = treeholeOwnerProfileId || profileId || identity?.publicKey || null
  let signedPolicy: Required<TreeholePolicy> | null = signedMode
    ? createSignedTreeholePolicy({
        ownerProfileId: requireSignedOwnerProfileId(ownerProfileId),
        treeholePolicy
      })
    : null
  const CorestoreClass = Corestore as unknown as CorestoreConstructor
  const AutobaseClass = Autobase as unknown as AutobaseConstructor
  const store = new CorestoreClass(storage || randomAccessMemory())
  await store.ready()

  const base = new AutobaseClass(store, bootstrapKey ? b4a.from(bootstrapKey, 'hex') : null, {
    open,
    apply: (
      nodes: Array<{ value?: TreeholeBaseEvent | null }>,
      view: AutobaseView,
      host: AutobaseHost
    ) => apply(nodes, view, host, { ownerProfileId, signedMode }),
    valueEncoding: 'json'
  })
  await base.ready()

  async function post({ id, text, createdAt = Date.now() }: TreeholePostInput): Promise<void> {
    if (signedMode) {
      await base.append(
        createSignedTreeholePost({
          authorDisplayName: nick,
          createdAt,
          identity: requireSignedIdentity(identity),
          postId: id,
          text,
          treeholeOwnerProfileId: requireSignedOwnerProfileId(ownerProfileId)
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

  async function comment({
    id,
    postId,
    text,
    createdAt = Date.now()
  }: TreeholeCommentInput): Promise<void> {
    if (signedMode) {
      await base.append(
        createSignedTreeholeComment({
          authorDisplayName: nick,
          commentId: id,
          createdAt,
          identity: requireSignedIdentity(identity),
          postId,
          text,
          treeholeOwnerProfileId: requireSignedOwnerProfileId(ownerProfileId)
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

  async function like({
    postId,
    createdAt = Date.now(),
    action = 'add'
  }: TreeholeLikeInput): Promise<void> {
    if (signedMode) {
      await base.append(
        createSignedTreeholeLike({
          action,
          createdAt,
          identity: requireSignedIdentity(identity),
          postId,
          treeholeOwnerProfileId: requireSignedOwnerProfileId(ownerProfileId)
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

  async function deletePost({
    postId,
    createdAt = Date.now()
  }: TreeholeDeletePostInput): Promise<void> {
    assertSignedMode('deletePost')
    await base.append(
      createSignedTreeholePostTombstone({
        createdAt,
        identity: requireSignedIdentity(identity),
        postId,
        treeholeOwnerProfileId: requireSignedOwnerProfileId(ownerProfileId)
      })
    )
    await base.update()
  }

  async function deleteComment({
    commentId,
    postId,
    createdAt = Date.now()
  }: TreeholeDeleteCommentInput): Promise<void> {
    assertSignedMode('deleteComment')
    await base.append(
      createSignedTreeholeCommentTombstone({
        commentId,
        createdAt,
        identity: requireSignedIdentity(identity),
        postId,
        treeholeOwnerProfileId: requireSignedOwnerProfileId(ownerProfileId)
      })
    )
    await base.update()
  }

  async function addWriter(
    key: string,
    { createdAt = Date.now(), profileId: writerProfileId = null }: TreeholeWriterInput = {}
  ): Promise<void> {
    if (signedMode) {
      if (!writerProfileId) {
        throw new Error('Signed treehole writer grant requires writer profile id')
      }

      await base.append(
        createSignedTreeholeWriterGrant({
          createdAt,
          identity: requireSignedIdentity(identity),
          treeholeOwnerProfileId: requireSignedOwnerProfileId(ownerProfileId),
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

  async function getEvents(): Promise<TreeholeBaseEvent[]> {
    await base.update()

    const events: TreeholeBaseEvent[] = []
    for (let index = 0; index < base.view.length; index += 1) {
      const event = await base.view.get(index)
      if (event) {
        events.push(event as TreeholeBaseEvent)
      }
    }

    return events
  }

  async function getState(): Promise<TreeholeState | SignedTreeholeState> {
    if (signedMode) {
      return applySignedTreeholeEvents(
        (await getEvents()).filter(isSignedTreeholeEvent),
        requireSignedPolicy(signedPolicy)
      )
    }

    return applyTreeholeEvents((await getEvents()).filter(isPrototypeTreeholeEvent))
  }

  function updateTreeholePolicy(nextTreeholePolicy: Partial<TreeholePolicy> | null = null): void {
    if (!signedMode) {
      return
    }

    signedPolicy = createSignedTreeholePolicy({
      ownerProfileId: requireSignedOwnerProfileId(ownerProfileId),
      treeholePolicy: nextTreeholePolicy
    })
  }

  async function close(): Promise<void> {
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
    replicate: (...args: unknown[]) => base.replicate(...args),
    updateTreeholePolicy
  }

  function assertSignedMode(method: string): void {
    if (!signedMode) {
      throw new Error(`${method} requires signed treehole mode`)
    }
  }
}

function open(store: CorestoreLike) {
  return store.get({ name: 'treehole-events', valueEncoding: 'json' })
}

async function apply(
  nodes: Array<{ value?: TreeholeBaseEvent | null }>,
  view: AutobaseView,
  host: AutobaseHost,
  { ownerProfileId = null, signedMode = false }: ApplyTreeholeBaseOptions = {}
): Promise<void> {
  for (const node of nodes) {
    const event = node.value

    if (!event) {
      continue
    }

    if (event.type === 'treehole.writer.add') {
      if (signedMode) {
        continue
      }

      const writerAdd = event as TreeholeWriterAddEvent
      await host.addWriter(b4a.from(writerAdd.key, 'hex'), { indexer: true })
      continue
    }

    if (event.type === 'treehole.writer.grant.v1') {
      if (
        signedMode &&
        event.treeholeOwnerProfileId === ownerProfileId &&
        verifySignedTreeholeEvent(event)
      ) {
        await host.addWriter(b4a.from(requireWriterKey(event), 'hex'), { indexer: true })
        await view.append(event)
      }
      continue
    }

    await view.append(event)
  }
}

function randomAccessMemory(): never {
  throw new Error('Treehole storage path is required')
}

type SignedTreeholeEvent =
  | ReturnType<typeof createSignedTreeholeComment>
  | ReturnType<typeof createSignedTreeholeCommentTombstone>
  | ReturnType<typeof createSignedTreeholeLike>
  | ReturnType<typeof createSignedTreeholePost>
  | ReturnType<typeof createSignedTreeholePostTombstone>
  | ReturnType<typeof createSignedTreeholeWriterGrant>

type TreeholeWriterAddEvent = {
  key: string
  type: 'treehole.writer.add'
}

type TreeholeBaseEvent = PrototypeTreeholeEvent | SignedTreeholeEvent | TreeholeWriterAddEvent

type SignedTreeholeState = ReturnType<typeof applySignedTreeholeEvents>

type CreateTreeholeBaseOptions = {
  bootstrapKey?: string | null
  identity?: TreeholeIdentity | null
  mode?: 'prototype' | 'signed'
  nick?: string
  profileId?: string | null
  storage?: unknown
  treeholeOwnerProfileId?: string | null
  treeholePolicy?: Partial<TreeholePolicy> | null
}

type TreeholePostInput = {
  createdAt?: number
  id: string
  text: string
}

type TreeholeCommentInput = {
  createdAt?: number
  id: string
  postId: string
  text: string
}

type TreeholeLikeInput = {
  action?: 'add' | 'remove'
  createdAt?: number
  postId: string
}

type TreeholeDeletePostInput = {
  createdAt?: number
  postId: string
}

type TreeholeDeleteCommentInput = {
  commentId: string
  createdAt?: number
  postId: string
}

type TreeholeWriterInput = {
  createdAt?: number
  profileId?: string | null
}

export type TreeholeBase = {
  addWriter(key: string, options?: TreeholeWriterInput): Promise<void>
  base: AutobaseLike
  close(): Promise<void>
  comment(input: TreeholeCommentInput): Promise<void>
  deleteComment(input: TreeholeDeleteCommentInput): Promise<void>
  deletePost(input: TreeholeDeletePostInput): Promise<void>
  getEvents(): Promise<TreeholeBaseEvent[]>
  getState(): Promise<TreeholeState | SignedTreeholeState>
  key: string
  like(input: TreeholeLikeInput): Promise<void>
  localWriterKey: string
  post(input: TreeholePostInput): Promise<void>
  replicate(...args: unknown[]): unknown
  updateTreeholePolicy(nextTreeholePolicy?: Partial<TreeholePolicy> | null): void
}

type AutobaseLike = {
  append(event: TreeholeBaseEvent): Promise<unknown>
  close(): Promise<unknown>
  key: Uint8Array
  local: { key: Uint8Array }
  ready(): Promise<unknown>
  replicate(...args: unknown[]): unknown
  update(): Promise<unknown>
  view: AutobaseView & { length: number; get(index: number): Promise<unknown> }
}

type AutobaseConstructor = new (
  store: unknown,
  bootstrapKey: Uint8Array | null,
  options: {
    apply: (
      nodes: Array<{ value?: TreeholeBaseEvent | null }>,
      view: AutobaseView,
      host: AutobaseHost
    ) => Promise<void>
    open: (store: CorestoreLike) => unknown
    valueEncoding: string
  }
) => AutobaseLike

type CorestoreConstructor = new (storage: unknown) => CorestoreLike

type CorestoreLike = {
  close(): Promise<unknown>
  get(options: { name: string; valueEncoding: string }): unknown
  ready(): Promise<unknown>
}

type AutobaseView = {
  append(event: TreeholeBaseEvent): Promise<unknown>
}

type AutobaseHost = {
  addWriter(key: Uint8Array, options: { indexer: boolean }): Promise<unknown>
}

type ApplyTreeholeBaseOptions = {
  ownerProfileId?: string | null
  signedMode?: boolean
}

function requireSignedIdentity(identity: TreeholeIdentity | null): TreeholeIdentity {
  if (!identity) throw new Error('Signed treehole mode requires an identity')

  return identity
}

function requireSignedOwnerProfileId(ownerProfileId: string | null): string {
  if (!ownerProfileId) throw new Error('Signed treehole mode requires an owner profile id')

  return ownerProfileId
}

function requireSignedPolicy(policy: Required<TreeholePolicy> | null): Required<TreeholePolicy> {
  if (!policy) throw new Error('Signed treehole mode requires a policy')

  return policy
}

function requireWriterKey(event: SignedTreeholeEvent): string {
  if (!event.writerKey) throw new Error('Signed treehole writer grant requires writer key')

  return event.writerKey
}

function isPrototypeTreeholeEvent(event: TreeholeBaseEvent): event is PrototypeTreeholeEvent {
  if (hasSignedProof(event)) return false

  return (
    event.type === 'treehole.post.create' ||
    event.type === 'treehole.comment.create' ||
    event.type === 'treehole.like.add'
  )
}

function isSignedTreeholeEvent(event: TreeholeBaseEvent): event is SignedTreeholeEvent {
  return hasSignedProof(event)
}

function hasSignedProof(event: TreeholeBaseEvent): event is SignedTreeholeEvent {
  return Boolean((event as { proof?: unknown }).proof)
}
