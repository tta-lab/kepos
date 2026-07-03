import compact from 'compact-encoding'
import { createSignedRecord, verifySignedRecord } from './signed-record.ts'
import type { PayloadEncoding } from './signed-record.ts'

const POST_CREATE = 'treehole.post.create'
const POST_TOMBSTONE = 'treehole.post.delete'
const COMMENT_CREATE = 'treehole.comment.create'
const COMMENT_TOMBSTONE = 'treehole.comment.delete'
const LIKE_ADD = 'treehole.like.add'
const LIKE_REMOVE = 'treehole.like.remove'
const WRITER_GRANT = 'treehole.writer.grant.v1'
const RECORD_VERSION = 1
const KEY_PATTERN = /^[0-9a-f]{64}$/

type Identity = {
  publicKey: string
  secretKey: string
}

type TreeholePolicy = {
  ownerProfileId: string
  trustedProfileIds?: string[]
  revokedProfileIds?: string[]
}

type TreeholeEvent = {
  type: string
  treeholeOwnerProfileId: string
  createdAt: number
  proof: {
    createdAt: number
    signature: string
    signerProfileId: string
    type: string
    version: number
  }
  actorProfileId?: string
  authorDisplayName?: string
  authorProfileId?: string
  commentId?: string
  postId?: string
  text?: string
  writerKey?: string
  writerProfileId?: string
}

type TreeholeState = {
  commentsByPost: Map<string, Array<Record<string, unknown>>>
  likesByPost: Map<string, Set<string>>
  posts: Array<Record<string, unknown>>
}

type VisiblePost = Record<string, unknown> & {
  createdAt: number
  id: string
}

const postCreateEncoding = createPayloadEncoding([
  'treeholeOwnerProfileId',
  'postId',
  'authorProfileId',
  'authorDisplayName',
  'text'
])
const postTombstoneEncoding = createPayloadEncoding([
  'treeholeOwnerProfileId',
  'postId',
  'actorProfileId'
])
const commentCreateEncoding = createPayloadEncoding([
  'treeholeOwnerProfileId',
  'postId',
  'commentId',
  'authorProfileId',
  'authorDisplayName',
  'text'
])
const commentTombstoneEncoding = createPayloadEncoding([
  'treeholeOwnerProfileId',
  'postId',
  'commentId',
  'actorProfileId'
])
const likeEncoding = createPayloadEncoding(['treeholeOwnerProfileId', 'postId', 'actorProfileId'])
const writerGrantEncoding = createPayloadEncoding([
  'treeholeOwnerProfileId',
  'writerProfileId',
  'writerKey'
])

export function createSignedTreeholePost({
  authorDisplayName = '',
  createdAt = Date.now(),
  identity,
  postId,
  text,
  treeholeOwnerProfileId
}: {
  authorDisplayName?: string
  createdAt?: number
  identity: Identity
  postId: string
  text: string
  treeholeOwnerProfileId: string
}): TreeholeEvent {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      authorDisplayName: cleanOptionalString(authorDisplayName),
      authorProfileId: cleanKey(identity.publicKey, 'Author profile id is required'),
      postId: cleanRequiredString(postId, 'Post id is required'),
      text: cleanRequiredString(text, 'Post text is required'),
      treeholeOwnerProfileId: cleanKey(
        treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    },
    payloadEncoding: postCreateEncoding,
    type: POST_CREATE
  })
}

export function createSignedTreeholePostTombstone({
  createdAt = Date.now(),
  identity,
  postId,
  treeholeOwnerProfileId
}: {
  createdAt?: number
  identity: Identity
  postId: string
  treeholeOwnerProfileId: string
}): TreeholeEvent {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      actorProfileId: cleanKey(identity.publicKey, 'Actor profile id is required'),
      postId: cleanRequiredString(postId, 'Post id is required'),
      treeholeOwnerProfileId: cleanKey(
        treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    },
    payloadEncoding: postTombstoneEncoding,
    type: POST_TOMBSTONE
  })
}

export function createSignedTreeholeComment({
  authorDisplayName = '',
  commentId,
  createdAt = Date.now(),
  identity,
  postId,
  text,
  treeholeOwnerProfileId
}: {
  authorDisplayName?: string
  commentId: string
  createdAt?: number
  identity: Identity
  postId: string
  text: string
  treeholeOwnerProfileId: string
}): TreeholeEvent {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      authorDisplayName: cleanOptionalString(authorDisplayName),
      authorProfileId: cleanKey(identity.publicKey, 'Author profile id is required'),
      commentId: cleanRequiredString(commentId, 'Comment id is required'),
      postId: cleanRequiredString(postId, 'Post id is required'),
      text: cleanRequiredString(text, 'Comment text is required'),
      treeholeOwnerProfileId: cleanKey(
        treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    },
    payloadEncoding: commentCreateEncoding,
    type: COMMENT_CREATE
  })
}

export function createSignedTreeholeCommentTombstone({
  commentId,
  createdAt = Date.now(),
  identity,
  postId,
  treeholeOwnerProfileId
}: {
  commentId: string
  createdAt?: number
  identity: Identity
  postId: string
  treeholeOwnerProfileId: string
}): TreeholeEvent {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      actorProfileId: cleanKey(identity.publicKey, 'Actor profile id is required'),
      commentId: cleanRequiredString(commentId, 'Comment id is required'),
      postId: cleanRequiredString(postId, 'Post id is required'),
      treeholeOwnerProfileId: cleanKey(
        treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    },
    payloadEncoding: commentTombstoneEncoding,
    type: COMMENT_TOMBSTONE
  })
}

export function createSignedTreeholeLike({
  action = 'add',
  createdAt = Date.now(),
  identity,
  postId,
  treeholeOwnerProfileId
}: {
  action?: 'add' | 'remove'
  createdAt?: number
  identity: Identity
  postId: string
  treeholeOwnerProfileId: string
}): TreeholeEvent {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      actorProfileId: cleanKey(identity.publicKey, 'Actor profile id is required'),
      postId: cleanRequiredString(postId, 'Post id is required'),
      treeholeOwnerProfileId: cleanKey(
        treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    },
    payloadEncoding: likeEncoding,
    type: action === 'remove' ? LIKE_REMOVE : LIKE_ADD
  })
}

export function createSignedTreeholeWriterGrant({
  createdAt = Date.now(),
  identity,
  treeholeOwnerProfileId,
  writerKey,
  writerProfileId
}: {
  createdAt?: number
  identity: Identity
  treeholeOwnerProfileId: string
  writerKey: string
  writerProfileId: string
}): TreeholeEvent {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      treeholeOwnerProfileId: cleanKey(
        treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      ),
      writerKey: cleanKey(writerKey, 'Writer key is required'),
      writerProfileId: cleanKey(writerProfileId, 'Writer profile id is required')
    },
    payloadEncoding: writerGrantEncoding,
    type: WRITER_GRANT
  })
}

export function verifySignedTreeholeEvent(event: TreeholeEvent): boolean {
  try {
    const payload = payloadFromEvent(event)

    return verifySignedRecord({
      payloadEncoding: encodingForType(event.type),
      record: {
        createdAt: event.proof.createdAt,
        payload,
        signature: event.proof.signature,
        signerProfileId: event.proof.signerProfileId,
        type: event.proof.type,
        version: event.proof.version
      }
    })
  } catch {
    return false
  }
}

export function applySignedTreeholeEvents(
  events: TreeholeEvent[],
  policy: TreeholePolicy
): TreeholeState {
  const ownerProfileId = cleanKey(policy.ownerProfileId, 'Treehole owner profile id is required')
  const trusted = new Set(policy.trustedProfileIds || [])
  const revoked = new Set(policy.revokedProfileIds || [])
  const postsById = new Map<string, VisiblePost>()
  const tombstonedPosts = new Set<string>()
  const commentsByPost = new Map<string, Array<Record<string, unknown>>>()
  const commentsById = new Map<string, Record<string, unknown>>()
  const tombstonedComments = new Set<string>()
  const likesByPost = new Map<string, Set<string>>()

  for (const event of events) {
    if (!verifySignedTreeholeEvent(event) || event.treeholeOwnerProfileId !== ownerProfileId) {
      continue
    }

    if (event.type === POST_CREATE) {
      if (
        event.authorProfileId !== ownerProfileId ||
        !event.postId ||
        postsById.has(event.postId)
      ) {
        continue
      }

      postsById.set(event.postId, {
        ...dropEmpty({
          authorDisplayName: cleanOptionalString(event.authorDisplayName),
          authorProfileId: event.authorProfileId,
          text: event.text
        }),
        createdAt: event.createdAt,
        id: event.postId
      })
      continue
    }

    if (event.type === POST_TOMBSTONE) {
      if (event.actorProfileId === ownerProfileId && event.postId && postsById.has(event.postId)) {
        tombstonedPosts.add(event.postId)
      }
      continue
    }

    if (event.type === COMMENT_CREATE) {
      if (
        !event.authorProfileId ||
        !event.commentId ||
        !event.postId ||
        !postsById.has(event.postId) ||
        tombstonedPosts.has(event.postId) ||
        commentsById.has(event.commentId) ||
        !canTrustedWrite({ ownerProfileId, profileId: event.authorProfileId, revoked, trusted })
      ) {
        continue
      }

      const comment = dropEmpty({
        authorDisplayName: cleanOptionalString(event.authorDisplayName),
        authorProfileId: event.authorProfileId,
        createdAt: event.createdAt,
        id: event.commentId,
        postId: event.postId,
        text: event.text
      })
      commentsById.set(event.commentId, comment)
      commentsByPost.set(event.postId, [...(commentsByPost.get(event.postId) || []), comment])
      continue
    }

    if (event.type === COMMENT_TOMBSTONE) {
      const comment = event.commentId ? commentsById.get(event.commentId) : null
      if (
        comment &&
        event.actorProfileId &&
        (event.actorProfileId === comment.authorProfileId ||
          event.actorProfileId === ownerProfileId)
      ) {
        tombstonedComments.add(event.commentId as string)
      }
      continue
    }

    if (event.type === LIKE_ADD || event.type === LIKE_REMOVE) {
      if (
        !event.actorProfileId ||
        !event.postId ||
        !postsById.has(event.postId) ||
        tombstonedPosts.has(event.postId) ||
        !canTrustedWrite({ ownerProfileId, profileId: event.actorProfileId, revoked, trusted })
      ) {
        continue
      }

      const likes = likesByPost.get(event.postId) || new Set<string>()
      if (event.type === LIKE_ADD) {
        likes.add(event.actorProfileId)
      } else {
        likes.delete(event.actorProfileId)
      }
      likesByPost.set(event.postId, likes)
    }
  }

  const visibleCommentsByPost = new Map<string, Array<Record<string, unknown>>>()
  for (const [postId, comments] of commentsByPost) {
    if (tombstonedPosts.has(postId)) {
      continue
    }

    visibleCommentsByPost.set(
      postId,
      comments.filter((comment) => !tombstonedComments.has(comment.id as string))
    )
  }

  const visibleLikesByPost = new Map<string, Set<string>>()
  for (const [postId, likes] of likesByPost) {
    if (!tombstonedPosts.has(postId)) {
      visibleLikesByPost.set(postId, likes)
    }
  }

  const posts = Array.from(postsById.values())
    .filter((post) => !tombstonedPosts.has(post.id as string))
    .map((post) => ({
      ...post,
      commentCount: visibleCommentsByPost.get(post.id as string)?.length || 0,
      likeCount: visibleLikesByPost.get(post.id as string)?.size || 0
    }))

  posts.sort((left, right) => right.createdAt - left.createdAt)

  return {
    commentsByPost: visibleCommentsByPost,
    likesByPost: visibleLikesByPost,
    posts
  }
}

function signTreeholeEvent({
  createdAt,
  identity,
  payload,
  payloadEncoding,
  type
}: {
  createdAt: number
  identity: Identity
  payload: Record<string, string>
  payloadEncoding: PayloadEncoding<Record<string, string>>
  type: string
}): TreeholeEvent {
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding,
    type,
    version: RECORD_VERSION
  })

  return {
    type,
    ...payload,
    createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  } as TreeholeEvent
}

function payloadFromEvent(event: TreeholeEvent): Record<string, string> {
  if (
    event.proof?.type !== event.type ||
    event.proof?.version !== RECORD_VERSION ||
    event.proof?.createdAt !== event.createdAt
  ) {
    throw new Error('Invalid treehole event proof')
  }

  const payload = cleanPayloadForType(event)
  const signerField =
    payload.authorProfileId || payload.actorProfileId || payload.treeholeOwnerProfileId

  if (event.proof.signerProfileId !== signerField) {
    throw new Error('Invalid treehole event signer')
  }

  return payload
}

function cleanPayloadForType(event: TreeholeEvent): Record<string, string> {
  if (event.type === POST_CREATE) {
    return {
      authorDisplayName: cleanOptionalString(event.authorDisplayName),
      authorProfileId: cleanKey(event.authorProfileId, 'Author profile id is required'),
      postId: cleanRequiredString(event.postId, 'Post id is required'),
      text: cleanRequiredString(event.text, 'Post text is required'),
      treeholeOwnerProfileId: cleanKey(
        event.treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    }
  }

  if (event.type === POST_TOMBSTONE) {
    return {
      actorProfileId: cleanKey(event.actorProfileId, 'Actor profile id is required'),
      postId: cleanRequiredString(event.postId, 'Post id is required'),
      treeholeOwnerProfileId: cleanKey(
        event.treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    }
  }

  if (event.type === COMMENT_CREATE) {
    return {
      authorDisplayName: cleanOptionalString(event.authorDisplayName),
      authorProfileId: cleanKey(event.authorProfileId, 'Author profile id is required'),
      commentId: cleanRequiredString(event.commentId, 'Comment id is required'),
      postId: cleanRequiredString(event.postId, 'Post id is required'),
      text: cleanRequiredString(event.text, 'Comment text is required'),
      treeholeOwnerProfileId: cleanKey(
        event.treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    }
  }

  if (event.type === COMMENT_TOMBSTONE) {
    return {
      actorProfileId: cleanKey(event.actorProfileId, 'Actor profile id is required'),
      commentId: cleanRequiredString(event.commentId, 'Comment id is required'),
      postId: cleanRequiredString(event.postId, 'Post id is required'),
      treeholeOwnerProfileId: cleanKey(
        event.treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    }
  }

  if (event.type === LIKE_ADD || event.type === LIKE_REMOVE) {
    return {
      actorProfileId: cleanKey(event.actorProfileId, 'Actor profile id is required'),
      postId: cleanRequiredString(event.postId, 'Post id is required'),
      treeholeOwnerProfileId: cleanKey(
        event.treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      )
    }
  }

  if (event.type === WRITER_GRANT) {
    return {
      treeholeOwnerProfileId: cleanKey(
        event.treeholeOwnerProfileId,
        'Treehole owner profile id is required'
      ),
      writerKey: cleanKey(event.writerKey, 'Writer key is required'),
      writerProfileId: cleanKey(event.writerProfileId, 'Writer profile id is required')
    }
  }

  throw new Error('Unsupported treehole event')
}

function encodingForType(type: string): PayloadEncoding<Record<string, string>> {
  if (type === POST_CREATE) return postCreateEncoding
  if (type === POST_TOMBSTONE) return postTombstoneEncoding
  if (type === COMMENT_CREATE) return commentCreateEncoding
  if (type === COMMENT_TOMBSTONE) return commentTombstoneEncoding
  if (type === LIKE_ADD || type === LIKE_REMOVE) return likeEncoding
  if (type === WRITER_GRANT) return writerGrantEncoding
  throw new Error('Unsupported treehole event')
}

function createPayloadEncoding(fields: string[]) {
  return {
    preencode(state: unknown, payload: Record<string, string>) {
      for (const field of fields) {
        compact.string.preencode(state, payload[field] || '')
      }
    },
    encode(state: unknown, payload: Record<string, string>) {
      for (const field of fields) {
        compact.string.encode(state, payload[field] || '')
      }
    },
    decode(state: unknown) {
      const payload: Record<string, string> = {}
      for (const field of fields) {
        payload[field] = compact.string.decode(state)
      }
      return payload
    }
  }
}

function canTrustedWrite({
  ownerProfileId,
  profileId,
  revoked,
  trusted
}: {
  ownerProfileId: string
  profileId: string
  revoked: Set<string>
  trusted: Set<string>
}): boolean {
  if (profileId === ownerProfileId) {
    return !revoked.has(profileId)
  }

  return trusted.has(profileId) && !revoked.has(profileId)
}

function dropEmpty(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== undefined && entry !== null && entry !== ''
    )
  )
}

function cleanKey(value: string | undefined, message: string): string {
  const cleaned = cleanRequiredString(value, message)

  if (!KEY_PATTERN.test(cleaned)) {
    throw new Error('Invalid profile id')
  }

  return cleaned
}

function cleanRequiredString(value: string | undefined, message: string): string {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanOptionalString(value: string | undefined): string {
  return value?.trim() || ''
}
