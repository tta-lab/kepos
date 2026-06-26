export function serializeTreeholeState(state) {
  return {
    posts: (state.posts || []).map((post) => ({
      ...post,
      comments: state.commentsByPost?.get(post.id) || []
    }))
  }
}
