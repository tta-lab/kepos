import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel
} from './profile-avatar-view-model.ts'

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
  authorAvatar: ProfileAvatarViewModel
  authorLabel: string
  className: string
  comments: {
    authorAvatar: ProfileAvatarViewModel
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
    authorAvatar: createTreeholeAuthorAvatar(post),
    authorLabel: displayPostAuthor(post, { shortenProfileId }),
    className: 'item post',
    comments: (post.comments || []).map((comment) => ({
      authorAvatar: createTreeholeAuthorAvatar(comment),
      authorLabel: displayPostAuthor(comment, { shortenProfileId }),
      className: 'comment',
      text: comment.text
    })),
    statsLabel: `${post.commentCount || 0} comments · ${post.likeCount || 0} likes`,
    text: post.text,
    timeLabel: formatTime(post.createdAt)
  }))
}

function createTreeholeAuthorAvatar(author: DesktopTreeholeComment): ProfileAvatarViewModel {
  const displayName = author.authorDisplayName || author.author || ''

  return createProfileAvatarViewModel({
    displayName,
    profileId: author.authorProfileId || displayName
  })
}

function displayPostAuthor(
  post: DesktopTreeholeComment,
  { shortenProfileId }: { shortenProfileId: ShortenProfileId }
): string {
  const shortProfileId = shortenPostProfileId(post.authorProfileId, shortenProfileId)

  return (
    post.authorDisplayName ||
    post.author ||
    (shortProfileId ? `Profile ${shortProfileId}` : 'Someone')
  )
}

function shortenPostProfileId(
  value: string | undefined,
  shortenProfileId: ShortenProfileId
): string {
  return value ? shortenProfileId(value) : ''
}
