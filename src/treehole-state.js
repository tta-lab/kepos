const POST_CREATE = 'treehole.post.create'
const COMMENT_CREATE = 'treehole.comment.create'
const LIKE_ADD = 'treehole.like.add'

export function createPostEvent({ id, author, text, createdAt }) {
  return {
    type: POST_CREATE,
    id,
    author: cleanAuthor(author),
    text: cleanText(text),
    createdAt
  }
}

export function createCommentEvent({ id, postId, author, text, createdAt }) {
  return {
    type: COMMENT_CREATE,
    id,
    postId,
    author: cleanAuthor(author),
    text: cleanText(text),
    createdAt
  }
}

export function createLikeEvent({ postId, author, createdAt }) {
  return {
    type: LIKE_ADD,
    postId,
    author: cleanAuthor(author),
    createdAt
  }
}

export function applyTreeholeEvents(events) {
  const postsById = new Map()
  const commentsByPost = new Map()
  const likesByPost = new Map()

  for (const event of events) {
    if (event.type === POST_CREATE) {
      if (!event.id || !event.text || postsById.has(event.id)) {
        continue
      }

      postsById.set(event.id, {
        id: event.id,
        author: event.author,
        text: event.text,
        createdAt: event.createdAt
      })
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

export function isTreeholePostEvent(event) {
  return event?.type === POST_CREATE
}

function cleanAuthor(author) {
  return author?.trim() || 'anon'
}

function cleanText(text) {
  return text?.trim() || ''
}
