import type { ContactBookContact } from './contact-book.ts'
import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'

type FormatDate = (value: number) => string
type ShortenProfileId = (profileId: string) => string

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
  formatDate,
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
    | 'source'
    | 'trustedAt'
  >
  formatDate: FormatDate
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  shortenProfileId: ShortenProfileId
}): ContactProfileViewModel {
  const shortProfileId = shortenProfileId(contact.profileId)
  const displayName = readDisplayName(contact, shortProfileId)

  return {
    avatar: createProfileAvatarViewModel({
      avatarMediaSnapshot: contact.avatarMediaSnapshot,
      avatarUri: contact.avatarUriSnapshot,
      displayName,
      profileId: contact.profileId,
      resolveAvatarMediaUri
    }),
    displayName,
    enterHomeEnabled: hasUsableHomeDescriptor(contact),
    enterHomeLabel: 'Enter Home',
    messageLabel: 'Message',
    profileId: contact.profileId,
    recentCopy: 'Posts from this profile will appear after you enter their home.',
    recentTitle: 'Recent posts',
    revokeLabel: 'Remove friend',
    shortProfileId,
    sourceLabel: `From ${formatTrustSource(contact.source)}`,
    statusLabel: 'Trusted',
    trustedAtLabel: `Trusted ${formatTrustTime(contact.trustedAt, formatDate)}`
  }
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
