type FormatTime = (value: number | string | undefined) => string

type TreeholePostLikeSet = {
  size?: number
}

export type ProfileRecentTreeholePost = {
  commentCount?: number
  comments?: readonly unknown[]
  createdAt?: number | string
  id?: string
  likeCount?: number
  likes?: TreeholePostLikeSet
  text?: string
}

export type ProfileRecentPostView = {
  id: string
  metaLabel: string
  text: string
}

export type ProfileRecentPostsViewModel = {
  recentCopy: string
  recentPosts: ProfileRecentPostView[]
  recentTitle: string
}

export type ProfileRecentPostCache = Record<string, readonly ProfileRecentTreeholePost[]>

export function createProfileRecentPostsViewModel({
  activeHomeOwnerProfileId = '',
  cachedPostsByProfileId = {},
  formatTime = (value) => String(value ?? ''),
  limit = 3,
  posts = [],
  selectedProfileId = ''
}: {
  activeHomeOwnerProfileId?: string | null
  cachedPostsByProfileId?: ProfileRecentPostCache
  formatTime?: FormatTime
  limit?: number
  posts?: readonly ProfileRecentTreeholePost[]
  selectedProfileId?: string | null
} = {}): ProfileRecentPostsViewModel {
  const isActiveHome = Boolean(selectedProfileId && selectedProfileId === activeHomeOwnerProfileId)
  const sourcePosts = isActiveHome ? posts : cachedPostsByProfileId[selectedProfileId || ''] || []

  if (!selectedProfileId || (!isActiveHome && sourcePosts.length === 0)) {
    return {
      recentCopy: 'Recent posts from this profile will appear here when available.',
      recentPosts: [],
      recentTitle: 'Recent posts'
    }
  }

  const recentPosts = sourcePosts
    .filter((post) => post.text?.trim())
    .slice(0, limit)
    .map((post, index) => ({
      id: post.id || `post-${index}`,
      metaLabel: `${formatTime(post.createdAt)} · ${formatCount(readCommentCount(post), 'comment')} · ${formatCount(readLikeCount(post), 'like')}`,
      text: post.text?.trim() || ''
    }))

  return {
    recentCopy:
      recentPosts.length > 0
        ? formatRecentCopy({ count: recentPosts.length, isCached: !isActiveHome })
        : 'No recent posts yet.',
    recentPosts,
    recentTitle: 'Recent posts'
  }
}

function formatRecentCopy({ count, isCached }: { count: number; isCached: boolean }): string {
  const plural = count === 1 ? 'post' : 'posts'
  if (isCached) return `${count} cached recent ${plural} from this profile.`
  return `${count} recent ${plural} from this profile.`
}

function readCommentCount(post: ProfileRecentTreeholePost): number {
  if (typeof post.commentCount === 'number') return post.commentCount
  return post.comments?.length || 0
}

function readLikeCount(post: ProfileRecentTreeholePost): number {
  if (typeof post.likeCount === 'number') return post.likeCount
  return post.likes?.size || 0
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}
