type ShortenProfileId = (profileId: string) => string
type FormatTime = (value: number | string | undefined) => string

type DesktopTreeholeComment = {
  author?: string
  authorDisplayName?: string
  authorProfileId?: string
  text?: string
}

type DesktopTreeholePost = DesktopTreeholeComment & {
  commentCount?: number
  comments?: readonly DesktopTreeholeComment[]
  createdAt?: number | string
  id: string
  likeCount?: number
}

export type DesktopTreeholePostViewModel = {
  actions: {
    commentPostId: string
    likePostId: string
  }
  authorLabel: string
  className: string
  comments: {
    authorLabel: string
    className: string
    text?: string
  }[]
  statsLabel: string
  text?: string
  timeLabel: string
}

export function createDesktopTreeholeViewModel({
  formatTime = (value) => String(value),
  posts = [],
  shortenProfileId = (profileId) => profileId
}: {
  formatTime?: FormatTime
  posts?: readonly DesktopTreeholePost[]
  shortenProfileId?: ShortenProfileId
} = {}): DesktopTreeholePostViewModel[] {
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

function displayPostAuthor(
  post: DesktopTreeholeComment,
  { shortenProfileId }: { shortenProfileId: ShortenProfileId }
): string {
  return (
    post.authorDisplayName ||
    post.author ||
    shortenPostProfileId(post.authorProfileId, shortenProfileId) ||
    'anon'
  )
}

function shortenPostProfileId(
  value: string | undefined,
  shortenProfileId: ShortenProfileId
): string {
  return value ? shortenProfileId(value) : ''
}
