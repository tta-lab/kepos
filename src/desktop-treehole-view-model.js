export function createDesktopTreeholeViewModel({
  formatTime = (value) => String(value),
  posts = [],
  shortenProfileId = (profileId) => profileId
} = {}) {
  return posts.map((post) => ({
    actions: {
      commentPostId: post.id,
      likePostId: post.id
    },
    authorLabel: displayPostAuthor(post, { shortenProfileId }),
    className: 'item post',
    comments: (post.comments || []).map((comment) => ({
      authorLabel: displayPostAuthor(comment, { shortenProfileId }),
      className: 'comment',
      text: comment.text
    })),
    statsLabel: `${post.commentCount || 0} comments · ${post.likeCount || 0} likes`,
    text: post.text,
    timeLabel: formatTime(post.createdAt)
  }))
}

function displayPostAuthor(post, { shortenProfileId }) {
  return (
    post.authorDisplayName ||
    post.author ||
    shortenPostProfileId(post.authorProfileId, shortenProfileId) ||
    'anon'
  )
}

function shortenPostProfileId(value, shortenProfileId) {
  return value ? shortenProfileId(value) : ''
}
