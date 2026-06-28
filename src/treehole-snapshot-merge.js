export function mergeTreeholeSnapshots(...snapshots) {
  const postsById = new Map()

  for (const snapshot of snapshots) {
    for (const post of snapshot?.posts || []) {
      if (!post?.id) {
        continue
      }

      const existing = postsById.get(post.id)
      postsById.set(post.id, mergePost(existing, post))
    }
  }

  return {
    posts: Array.from(postsById.values()).sort(comparePosts)
  }
}

function mergePost(existing, next) {
  if (!existing) {
    return { ...next, comments: mergeComments(next.comments) }
  }

  return {
    ...existing,
    ...next,
    comments: mergeComments(existing.comments, next.comments)
  }
}

function mergeComments(...commentLists) {
  const commentsById = new Map()

  for (const comments of commentLists) {
    for (const comment of comments || []) {
      if (!comment?.id) {
        continue
      }

      commentsById.set(comment.id, {
        ...commentsById.get(comment.id),
        ...comment
      })
    }
  }

  return Array.from(commentsById.values()).sort(comparePosts)
}

function comparePosts(a, b) {
  return (b.createdAt || 0) - (a.createdAt || 0)
}
