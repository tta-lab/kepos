export type TreeholeSnapshotPost = {
  comments?: TreeholeSnapshotComment[]
  createdAt?: number
  id: string
  [key: string]: unknown
}

export type TreeholeSnapshotComment = {
  createdAt?: number
  id: string
  [key: string]: unknown
}

export type TreeholeSnapshot = {
  posts?: TreeholeSnapshotPost[]
}

export function mergeTreeholeSnapshots(...snapshots: TreeholeSnapshot[]): {
  posts: TreeholeSnapshotPost[]
} {
  const postsById = new Map<string, TreeholeSnapshotPost>()

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

function mergePost(
  existing: TreeholeSnapshotPost | undefined,
  next: TreeholeSnapshotPost
): TreeholeSnapshotPost {
  if (!existing) {
    return { ...next, comments: mergeComments(next.comments) }
  }

  return {
    ...existing,
    ...next,
    comments: mergeComments(existing.comments, next.comments)
  }
}

function mergeComments(
  ...commentLists: Array<TreeholeSnapshotComment[] | undefined>
): TreeholeSnapshotComment[] {
  const commentsById = new Map<string, TreeholeSnapshotComment>()

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

function comparePosts(a: { createdAt?: number }, b: { createdAt?: number }): number {
  return (b.createdAt || 0) - (a.createdAt || 0)
}
