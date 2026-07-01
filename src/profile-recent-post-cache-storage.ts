import type {
  ProfileRecentPostCache,
  ProfileRecentTreeholePost
} from './profile-recent-posts-view-model.ts'

const PROFILE_RECENT_POST_CACHE_KEY = 'kepos.profileRecentPostCache.v1'
const PROFILE_RECENT_POST_CACHE_FILE = 'profile-recent-post-cache.json'

type SyncStorage = {
  getItem?: (key: string) => string | null | undefined
  setItem?: (key: string, value: string) => unknown
}

type AsyncFileSystem = {
  makeDirectoryAsync(path: string, options: { intermediates: boolean }): Promise<unknown> | unknown
  readAsStringAsync(path: string): Promise<string> | string
  writeAsStringAsync(path: string, value: string): Promise<unknown> | unknown
}

type SerializableProfileRecentPost = {
  commentCount: number
  createdAt?: number | string
  id: string
  likeCount: number
  text: string
}

export function updateProfileRecentPostCache(
  cache: ProfileRecentPostCache = {},
  {
    limit = 10,
    ownerProfileId,
    posts
  }: {
    limit?: number
    ownerProfileId: string
    posts: readonly ProfileRecentTreeholePost[]
  }
): ProfileRecentPostCache {
  if (!ownerProfileId || !posts?.length) return cache

  const nextPosts = posts
    .filter((post) => post.text?.trim())
    .slice(0, limit)
    .map((post, index) => ({
      commentCount: readCommentCount(post),
      ...(post.createdAt !== undefined ? { createdAt: post.createdAt } : {}),
      id: post.id || `post-${index}`,
      likeCount: readLikeCount(post),
      text: post.text?.trim() || ''
    }))

  if (nextPosts.length === 0) return cache

  return {
    ...cache,
    [ownerProfileId]: nextPosts
  }
}

export function loadProfileRecentPostCacheFromStorage({
  storage
}: {
  storage?: SyncStorage | null
} = {}): ProfileRecentPostCache {
  const stored = storage?.getItem?.(PROFILE_RECENT_POST_CACHE_KEY)
  if (!stored) return {}

  try {
    return deserializeProfileRecentPostCache(stored)
  } catch {
    return {}
  }
}

export function saveProfileRecentPostCacheToStorage({
  cache,
  storage
}: {
  cache: ProfileRecentPostCache
  storage?: SyncStorage | null
}): void {
  storage?.setItem?.(
    PROFILE_RECENT_POST_CACHE_KEY,
    JSON.stringify(serializeProfileRecentPostCache(cache))
  )
}

export async function loadProfileRecentPostCacheFromFileSystem({
  baseUri,
  fileSystem
}: {
  baseUri: string
  fileSystem: AsyncFileSystem
}): Promise<ProfileRecentPostCache> {
  const path = profileRecentPostCachePath(baseUri)

  try {
    return deserializeProfileRecentPostCache(await fileSystem.readAsStringAsync(path))
  } catch (error) {
    if (isMissingFileError(error)) return {}
    if (error instanceof SyntaxError) return {}

    throw new Error('Corrupt profile recent post cache storage', { cause: error })
  }
}

export async function saveProfileRecentPostCacheToFileSystem({
  baseUri,
  cache,
  fileSystem
}: {
  baseUri: string
  cache: ProfileRecentPostCache
  fileSystem: AsyncFileSystem
}): Promise<void> {
  const dir = profileRecentPostCacheDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    `${dir}/${PROFILE_RECENT_POST_CACHE_FILE}`,
    JSON.stringify(serializeProfileRecentPostCache(cache))
  )
}

function serializeProfileRecentPostCache(
  cache: ProfileRecentPostCache
): Record<string, SerializableProfileRecentPost[]> {
  const serialized: Record<string, SerializableProfileRecentPost[]> = {}

  for (const [profileId, posts] of Object.entries(cache || {})) {
    if (!profileId || !Array.isArray(posts)) continue
    serialized[profileId] = posts
      .filter((post) => post.text?.trim())
      .map((post, index) => ({
        commentCount: readCommentCount(post),
        ...(post.createdAt !== undefined ? { createdAt: post.createdAt } : {}),
        id: post.id || `post-${index}`,
        likeCount: readLikeCount(post),
        text: post.text?.trim() || ''
      }))
  }

  return serialized
}

function deserializeProfileRecentPostCache(stored: string): ProfileRecentPostCache {
  const value = JSON.parse(stored)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const cache: Record<string, SerializableProfileRecentPost[]> = {}

  for (const [profileId, posts] of Object.entries(value)) {
    if (!profileId || !Array.isArray(posts)) continue
    const cleanPosts = posts
      .map((post) => deserializeProfileRecentPost(post))
      .filter((post): post is SerializableProfileRecentPost => Boolean(post))

    if (cleanPosts.length > 0) cache[profileId] = cleanPosts
  }

  return cache
}

function deserializeProfileRecentPost(value: unknown): SerializableProfileRecentPost | null {
  if (!value || typeof value !== 'object') return null
  const post = value as Partial<SerializableProfileRecentPost>
  const text = typeof post.text === 'string' ? post.text.trim() : ''
  if (!text) return null

  return {
    commentCount: readFiniteCount(post.commentCount),
    ...(typeof post.createdAt === 'number' || typeof post.createdAt === 'string'
      ? { createdAt: post.createdAt }
      : {}),
    id: typeof post.id === 'string' && post.id ? post.id : text.slice(0, 32),
    likeCount: readFiniteCount(post.likeCount),
    text
  }
}

function readCommentCount(post: ProfileRecentTreeholePost): number {
  if (typeof post.commentCount === 'number') return readFiniteCount(post.commentCount)
  return post.comments?.length || 0
}

function readLikeCount(post: ProfileRecentTreeholePost): number {
  if (typeof post.likeCount === 'number') return readFiniteCount(post.likeCount)
  return post.likes?.size || 0
}

function readFiniteCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function profileRecentPostCachePath(baseUri: string): string {
  return `${profileRecentPostCacheDir(baseUri)}/${PROFILE_RECENT_POST_CACHE_FILE}`
}

function profileRecentPostCacheDir(baseUri: string): string {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos`
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
