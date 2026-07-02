import type { ContactBookContact } from './contact-book.ts'
import type { ProfileFriendRequestDeliveryState } from './profile-friend-request-transport.ts'
import { formatProfileFriendRequestDeliveryState } from './profile-friend-request-transport.ts'
import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'

type FormatDate = (value: number) => string
type ShortenProfileId = (profileId: string) => string
export type ContactProfileRelationshipState =
  | 'ignored'
  | 'incoming_request'
  | 'outgoing_request'
  | 'removed'
  | 'trusted'

export type ContactProfileViewModel = {
  avatar: ProfileAvatarViewModel
  displayName: string
  enterHomeEnabled: boolean
  enterHomeLabel: string
  messageLabel: string
  profileId: string
  recentCopy: string
  recentTitle: string
  revokeLabel: string
  shortProfileId: string
  sourceLabel: string
  statusLabel: string
  trustedAtLabel: string
}

export function createContactProfileViewModel({
  contact,
  deliveryState,
  formatDate,
  relationshipState,
  resolveAvatarMediaUri,
  shortenProfileId
}: {
  contact: Pick<
    ContactBookContact,
    | 'alias'
    | 'avatarMediaSnapshot'
    | 'avatarUriSnapshot'
    | 'displayNameSnapshot'
    | 'homeAddress'
    | 'homeExpiresAt'
    | 'homeRoomKey'
    | 'profileId'
    | 'proof'
    | 'requestIgnoredAt'
    | 'revokedAt'
    | 'source'
    | 'trustedAt'
  >
  deliveryState?: ProfileFriendRequestDeliveryState | string | null
  formatDate: FormatDate
  relationshipState?: ContactProfileRelationshipState
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  shortenProfileId: ShortenProfileId
}): ContactProfileViewModel {
  const shortProfileId = shortenProfileId(contact.profileId)
  const displayName = readDisplayName(contact, shortProfileId)
  const state = relationshipState || inferRelationshipState(contact)
  const isTrusted = state === 'trusted'

  return {
    avatar: createProfileAvatarViewModel({
      avatarMediaSnapshot: contact.avatarMediaSnapshot,
      avatarUri: contact.avatarUriSnapshot,
      displayName,
      profileId: contact.profileId,
      resolveAvatarMediaUri
    }),
    displayName,
    enterHomeEnabled: isTrusted && hasUsableHomeDescriptor(contact),
    enterHomeLabel: 'Enter Home',
    messageLabel: 'Message',
    profileId: contact.profileId,
    recentCopy: formatRecentCopy(state),
    recentTitle: 'Recent posts',
    revokeLabel: formatRevokeLabel(state),
    shortProfileId,
    sourceLabel: `From ${formatTrustSource(contact.source)}`,
    statusLabel: formatStatusLabel(state, deliveryState),
    trustedAtLabel: formatRelationshipTime({ contact, formatDate, state })
  }
}

function inferRelationshipState(
  contact: Pick<ContactBookContact, 'requestIgnoredAt' | 'revokedAt' | 'trustedAt'>
): ContactProfileRelationshipState {
  if (contact.revokedAt !== undefined && contact.revokedAt !== null) return 'removed'
  if (contact.requestIgnoredAt !== undefined && contact.requestIgnoredAt !== null) return 'ignored'
  return 'trusted'
}

function hasUsableHomeDescriptor(
  contact: Pick<ContactBookContact, 'homeAddress' | 'homeExpiresAt' | 'homeRoomKey' | 'proof'>
): boolean {
  if (!contact.homeAddress || !contact.homeRoomKey || !contact.proof) return false
  if (typeof contact.homeExpiresAt === 'number' && contact.homeExpiresAt <= Date.now()) {
    return false
  }

  return true
}

function readDisplayName(
  contact: Pick<ContactBookContact, 'alias' | 'displayNameSnapshot'>,
  shortProfileId: string
): string {
  return contact.alias?.trim() || contact.displayNameSnapshot?.trim() || `Profile ${shortProfileId}`
}

function formatTrustSource(source?: string): string {
  if (source === 'profile_qr' || source === 'person_qr') return 'Profile QR'
  if (source === 'home_room') return 'Home'
  if (source === 'message_request') return 'Friend request'
  return 'this device'
}

function formatTrustTime(trustedAt: number | undefined, formatDate: FormatDate): string {
  if (typeof trustedAt !== 'number' || !Number.isFinite(trustedAt)) return 'recently'
  return formatDate(trustedAt)
}

function formatRecentCopy(state: ContactProfileRelationshipState): string {
  if (state === 'trusted') {
    return 'Posts from this profile will appear after you enter their home.'
  }
  return 'Recent posts will appear after this profile becomes trusted.'
}

function formatRevokeLabel(state: ContactProfileRelationshipState): string {
  if (state === 'trusted') return 'Remove friend'
  if (state === 'ignored' || state === 'removed') return 'Allow requests'
  return 'Request pending'
}

function formatStatusLabel(
  state: ContactProfileRelationshipState,
  deliveryState?: ProfileFriendRequestDeliveryState | string | null
): string {
  if (state === 'trusted') return 'Trusted'
  if (state === 'removed') return 'Removed'
  if (state === 'ignored') return 'Ignored'
  if (state === 'incoming_request') return 'Incoming request'
  return formatProfileFriendRequestDeliveryState(deliveryState)
}

function formatRelationshipTime({
  contact,
  formatDate,
  state
}: {
  contact: Pick<ContactBookContact, 'requestIgnoredAt' | 'revokedAt' | 'trustedAt'>
  formatDate: FormatDate
  state: ContactProfileRelationshipState
}): string {
  if (state === 'trusted') return `Trusted ${formatTrustTime(contact.trustedAt, formatDate)}`
  if (state === 'removed') return `Removed ${formatTrustTime(contact.revokedAt, formatDate)}`
  if (state === 'ignored') return `Ignored ${formatTrustTime(contact.requestIgnoredAt, formatDate)}`
  return 'Not trusted yet'
}
