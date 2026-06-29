export type SerializableTreeholePost = {
  comments?: unknown[]
  id: string
  [key: string]: unknown
}

export type TreeholeViewState = {
  commentsByPost?: Map<string, unknown[]>
  posts?: SerializableTreeholePost[]
}

export function serializeTreeholeState(state: TreeholeViewState): {
  posts: SerializableTreeholePost[]
} {
  return {
    posts: (state.posts || []).map((post) => ({
      ...post,
      comments: state.commentsByPost?.get(post.id) || []
    }))
  }
}
