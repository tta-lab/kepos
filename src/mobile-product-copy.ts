import { getProductSurfaceTitle } from './product-surfaces.ts'

export interface MobileHomeStatusInput {
  online: number
  session?: { roomKey?: string | null } | null
}

export interface MobileContactLike {
  alias?: string | null
  profileId?: string | null
  source?: string | null
  trustedAt?: number | null
}

export interface MobileMessageRequestLike {
  alias?: string | null
  profileId?: string | null
  text?: string | null
}

export interface MobileDirectMessageLike extends MobileMessageRequestLike {
  direction?: string
  fromProfileId?: string | null
  nick?: string | null
  toProfileId?: string | null
  type?: string
}

export interface MobileHomeMessageLike {
  nick?: string | null
}

export interface MobileTreeholePostLike {
  author?: string | null
  authorDisplayName?: string | null
  authorProfileId?: string | null
}

export type MobileTreeholeEmptyCopyOptions = {
  canPost?: boolean
}

export type MobileTimeFormatter = (
  value: number | string | Date,
  options: Intl.DateTimeFormatOptions
) => string

export function getMobileHomeStatus({ online, session }: MobileHomeStatusInput) {
  if (!session) {
    return 'Offline'
  }

  if (online > 0) {
    return 'Connected'
  }

  return 'Waiting for friends'
}

export function getMobileTreeholeStatus(status?: string) {
  if (status === 'ready') {
    return 'Treehole ready'
  }

  if (status === 'starting') {
    return 'Starting Treehole'
  }

  if (status === 'waiting' || status === 'waiting-for-bootstrap') {
    return 'Waiting for posts'
  }

  return 'Treehole offline'
}

export function getMobileBackendNotice(status?: string) {
  if (
    status === 'joining' ||
    status === 'preparing' ||
    status === 'joining-swarm' ||
    status === 'opening-dm' ||
    status === 'opening-treehole'
  ) {
    return 'Starting home...'
  }

  if (
    status === 'opening-treehole-store' ||
    status === 'opening-treehole-replication' ||
    status === 'opening-treehole-state'
  ) {
    return 'Syncing posts...'
  }

  if (status === 'joined') {
    return 'Connected.'
  }

  if (status === 'left') {
    return 'Left home.'
  }

  return 'Home status updated.'
}

export function getMobileRoomSurface(activeTab?: string) {
  return getProductSurfaceTitle(activeTab)
}

export function formatMobileTrustSource(source?: string | null) {
  if (source === 'profile_qr' || source === 'person_qr') return 'Profile QR'
  if (source === 'home_room') return 'Home'
  if (source === 'message_request') return 'Friend request'
  return 'This device'
}

export function formatMobileTrustTime(
  trustedAt?: number | null,
  formatDate: (value: number) => string = (value) => new Date(value).toLocaleDateString()
) {
  if (typeof trustedAt !== 'number' || !Number.isFinite(trustedAt)) return 'recently'
  return formatDate(trustedAt)
}

export function formatMobileTrustedContactName(contact?: MobileContactLike | null) {
  return contact?.alias?.trim() || displayDirectPeer(contact?.profileId)
}

export function formatRequestPreview(text?: string | null) {
  return text?.trim() || 'No message yet'
}

export function formatMessageRequestTitle(request?: MobileMessageRequestLike | null) {
  const name = request?.alias?.trim() || displayDirectPeer(request?.profileId)
  return `${name} sent a friend request.`
}

export function formatMessageRequestSubtitle(request?: MobileMessageRequestLike | null) {
  return request?.alias?.trim() || displayDirectPeer(request?.profileId)
}

export function formatOutgoingRequestTitle(request?: MobileMessageRequestLike | null) {
  const name =
    request?.alias?.trim() ||
    (request?.profileId ? displayDirectPeer(request.profileId) : 'This profile')
  return `${name} has not accepted yet.`
}

export function formatMobileDirectMessageMeta(
  message?: MobileDirectMessageLike | null,
  contacts: MobileContactLike[] = []
) {
  const outgoing = message?.direction === 'out'
  const isRequest = message?.type === 'kepos.message.request.v1'

  if (isRequest) {
    return outgoing
      ? 'You sent a friend request'
      : formatMessageRequestTitle({
          ...message,
          alias: findMobileContactName(contacts, message?.fromProfileId) || message?.alias,
          profileId: message?.fromProfileId || message?.profileId
        })
  }

  return outgoing
    ? `You to ${displayDirectPeer(
        message?.toProfileId,
        findMobileContactName(contacts, message?.toProfileId)
      )}`
    : `${displayDirectPeer(
        message?.fromProfileId,
        findMobileContactName(contacts, message?.fromProfileId) || message?.nick
      )} to you`
}

export function formatMobileHomeMessageMeta(message?: MobileHomeMessageLike | null) {
  return message?.nick?.trim() || 'Someone'
}

export function getMobileTabButtonLabel(label: string, badgeCount: number) {
  if (badgeCount > 0) {
    return `${label}, ${badgeCount} pending`
  }

  return label
}

export function formatPendingBadgeCount(badgeCount: number) {
  return badgeCount > 99 ? '99+' : String(badgeCount)
}

export function shortenProfileId(value?: string | null) {
  return value ? `${value.slice(0, 8)}...${value.slice(-8)}` : ''
}

export function displayDirectPeer(profileId?: string | null, displayName: string | null = '') {
  const shortProfileId = shortenProfileId(profileId)
  return displayName?.trim() || (shortProfileId ? `Profile ${shortProfileId}` : 'Someone')
}

function findMobileContactName(
  contacts: MobileContactLike[] = [],
  profileId?: string | null
): string {
  if (!profileId) return ''

  const contact = contacts.find((entry) => entry?.profileId === profileId)
  return contact?.alias?.trim() || ''
}

export function displayPostAuthor(post: MobileTreeholePostLike) {
  return post.authorDisplayName || post.author || displayDirectPeer(post.authorProfileId)
}

export function formatMobilePostTime(
  value: number | string | Date,
  formatTime: MobileTimeFormatter = (nextValue, options) =>
    new Date(nextValue).toLocaleTimeString([], options)
) {
  return formatTime(value, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getMobileTreeholeEmptyCopy(
  status?: string,
  { canPost = true }: MobileTreeholeEmptyCopyOptions = {}
) {
  if (status === 'waiting' || status === 'waiting-for-bootstrap') {
    return 'Waiting for the home owner to share posts.'
  }

  if (status === 'starting') {
    return 'Starting Treehole.'
  }

  if (!canPost) {
    return 'Posts from this home will appear here.'
  }

  return 'Write the first post from this phone.'
}
