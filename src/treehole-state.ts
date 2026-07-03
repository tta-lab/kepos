const POST_CREATE = 'treehole.post.create'
const COMMENT_CREATE = 'treehole.comment.create'
const LIKE_ADD = 'treehole.like.add'

export type TreeholePostEvent = {
  author: string
  authorProfileId?: string
  createdAt: number
  id: string
  text: string
  type: typeof POST_CREATE
}

export type TreeholeCommentEvent = {
  author: string
  createdAt: number
  id: string
  postId: string
  text: string
  type: typeof COMMENT_CREATE
}

export type TreeholeLikeEvent = {
  author: string
  createdAt: number
  postId: string
  type: typeof LIKE_ADD
}

export type TreeholeEvent = TreeholePostEvent | TreeholeCommentEvent | TreeholeLikeEvent

export type TreeholePost = {
  author: string
  authorProfileId?: string
  commentCount: number
  createdAt: number
  id: string
  likeCount: number
  text: string
}

export type TreeholeComment = {
  author: string
  createdAt: number
  id: string
  postId: string
  text: string
}

export type TreeholeState = {
  commentsByPost: Map<string, TreeholeComment[]>
  likesByPost: Map<string, Set<string>>
  posts: TreeholePost[]
}

export function createPostEvent({
  id,
  author,
  authorProfileId,
  text,
  createdAt
}: {
  author?: string
  authorProfileId?: string | null
  createdAt: number
  id: string
  text?: string
}): TreeholePostEvent {
  const event: TreeholePostEvent = {
    type: POST_CREATE,
    id,
    author: cleanAuthor(author),
    text: cleanText(text),
    createdAt
  }

  const cleanAuthorProfileId = cleanProfileId(authorProfileId)

  if (cleanAuthorProfileId) {
    event.authorProfileId = cleanAuthorProfileId
  }

  return event
}

export function createCommentEvent({
  id,
  postId,
  author,
  text,
  createdAt
}: {
  author?: string
  createdAt: number
  id: string
  postId: string
  text?: string
}): TreeholeCommentEvent {
  return {
    type: COMMENT_CREATE,
    id,
    postId,
    author: cleanAuthor(author),
    text: cleanText(text),
    createdAt
  }
}

export function createLikeEvent({
  postId,
  author,
  createdAt
}: {
  author?: string
  createdAt: number
  postId: string
}): TreeholeLikeEvent {
  return {
    type: LIKE_ADD,
    postId,
    author: cleanAuthor(author),
    createdAt
  }
}

export function applyTreeholeEvents(events: TreeholeEvent[]): TreeholeState {
  const postsById = new Map<string, TreeholePost>()
  const commentsByPost = new Map<string, TreeholeComment[]>()
  const likesByPost = new Map<string, Set<string>>()

  for (const event of events) {
    if (event.type === POST_CREATE) {
      if (!event.id || !event.text || postsById.has(event.id)) {
        continue
      }

      const post: TreeholePost = {
        id: event.id,
        author: event.author,
        text: event.text,
        createdAt: event.createdAt,
        commentCount: 0,
        likeCount: 0
      }
      const cleanAuthorProfileId = cleanProfileId(event.authorProfileId)

      if (cleanAuthorProfileId) {
        post.authorProfileId = cleanAuthorProfileId
      }

      postsById.set(event.id, post)
      continue
    }

    if (event.type === COMMENT_CREATE) {
      if (!postsById.has(event.postId) || !event.id || !event.text) {
        continue
      }

      const comments = commentsByPost.get(event.postId) || []
      if (comments.some((comment) => comment.id === event.id)) {
        continue
      }

      commentsByPost.set(event.postId, [
        ...comments,
        {
          id: event.id,
          postId: event.postId,
          author: event.author,
          text: event.text,
          createdAt: event.createdAt
        }
      ])
      continue
    }

    if (event.type === LIKE_ADD && postsById.has(event.postId)) {
      const likes = likesByPost.get(event.postId) || new Set()
      likes.add(event.author)
      likesByPost.set(event.postId, likes)
    }
  }

  const posts = Array.from(postsById.values())
    .map((post) => ({
      ...post,
      commentCount: commentsByPost.get(post.id)?.length || 0,
      likeCount: likesByPost.get(post.id)?.size || 0
    }))
    .sort((left, right) => right.createdAt - left.createdAt)

  return {
    posts,
    commentsByPost,
    likesByPost
  }
}

export function isTreeholePostEvent(event: unknown): event is TreeholePostEvent {
  return isRecord(event) && event.type === POST_CREATE
}

function cleanAuthor(author: unknown): string {
  return typeof author === 'string' && author.trim() ? author.trim() : 'anon'
}

function cleanText(text: unknown): string {
  return typeof text === 'string' ? text.trim() : ''
}

function cleanProfileId(profileId: unknown): string | null {
  return typeof profileId === 'string' && profileId.trim() ? profileId.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}
