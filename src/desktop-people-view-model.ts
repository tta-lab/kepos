import type { ContactBook, ContactBookContact, MessageRequestContact } from './contact-book.ts'
import { getBlockedContactCopy } from './blocked-contact-copy.ts'
import { isContactTrusted, listBlockedContacts } from './contact-book.ts'
import { createContactProfileViewModel } from './contact-profile-view-model.ts'
import type { ProfileAvatarViewModel } from './profile-avatar-view-model.ts'

type ShortenProfileId = (profileId: string) => string
type FormatDate = (value: number) => string

export type DesktopPeopleViewModel = {
  blockedContacts: DesktopBlockedContactViewModel[]
  messageRequests: DesktopMessageRequestViewModel[]
  outgoingRequests: DesktopOutgoingRequestViewModel[]
  trustedContacts: DesktopTrustedContactViewModel[]
}

export type DesktopBlockedContactViewModel = {
  blockedAtLabel: string
  copy: string
  profileId: string
  profileLabel: string
  shortProfileId: string
  statusLabel: string
}

export type DesktopTrustedContactViewModel = {
  alias: string
  avatar: ProfileAvatarViewModel
  homeActionEnabled: boolean
  homeActionLabel: string
  messageActionLabel: string
  profileId: string
  recentTitle: string
  shortProfileId: string
  sourceLabel: string
  statusLabel: string
  trustedAtLabel: string
}

export type DesktopMessageRequestViewModel = {
  acceptMessage: {
    fromProfileId: string
    nick: string
    type: 'kepos.message.request.v1'
  }
  profileId: string
  profileLabel: string
  preview: string
  title: string
}

export type DesktopOutgoingRequestViewModel = {
  profileId: string
  profileLabel: string
  requestedAtLabel: string
  statusLabel: string
  textPreview: string
  title: string
}

export function createDesktopPeopleViewModel({
  contactBook,
  formatDate = (value) => new Date(value).toLocaleDateString(),
  shortenProfileId = (profileId) => profileId
}: {
  contactBook?: ContactBook | null
  formatDate?: FormatDate
  shortenProfileId?: ShortenProfileId
}): DesktopPeopleViewModel {
  if (!contactBook) {
    return {
      blockedContacts: [],
      messageRequests: [],
      outgoingRequests: [],
      trustedContacts: []
    }
  }

  return {
    blockedContacts: listBlockedContacts(contactBook).map((contact) =>
      createBlockedContactViewModel({ contact, formatDate, shortenProfileId })
    ),
    messageRequests: Array.from(contactBook.pendingRequestsByProfileId.values()).map((request) =>
      createMessageRequestViewModel({ request, shortenProfileId })
    ),
    outgoingRequests: Array.from(contactBook.outgoingRequestsByProfileId.values()).map((request) =>
      createOutgoingRequestViewModel({ formatDate, request, shortenProfileId })
    ),
    trustedContacts: Array.from(contactBook.contactsByProfileId.values())
      .filter((contact) => isContactTrusted(contactBook, contact.profileId))
      .map((contact) => createTrustedContactViewModel({ contact, formatDate, shortenProfileId }))
      .sort((left, right) => left.alias.localeCompare(right.alias))
  }
}

export function formatDesktopMessageRequestTitle(
  request?: (Pick<MessageRequestContact, 'alias'> & { profileId?: string | null }) | null,
  { shortenProfileId = (profileId) => profileId }: { shortenProfileId?: ShortenProfileId } = {}
): string {
  const name = request?.alias?.trim() || displayProfileLabel(request?.profileId, shortenProfileId)
  return `${name} sent a friend request.`
}

export function formatDesktopRequestPreview(text?: string | null): string {
  return text?.trim() || 'No message yet'
}

function createBlockedContactViewModel({
  contact,
  formatDate,
  shortenProfileId
}: {
  contact: ContactBookContact
  formatDate: FormatDate
  shortenProfileId: ShortenProfileId
}): DesktopBlockedContactViewModel {
  const blockedCopy = getBlockedContactCopy(contact)
  const profileLabel =
    contact.alias ||
    contact.displayNameSnapshot ||
    displayProfileLabel(contact.profileId, shortenProfileId)

  return {
    blockedAtLabel: `${blockedCopy.statusLabel} ${formatTrustTime(blockedCopy.blockedAt, formatDate)}`,
    copy: blockedCopy.copy,
    profileId: contact.profileId,
    profileLabel,
    shortProfileId: shortenProfileId(contact.profileId),
    statusLabel: blockedCopy.statusLabel
  }
}

function createTrustedContactViewModel({
  contact,
  formatDate,
  shortenProfileId
}: {
  contact: ContactBookContact
  formatDate: FormatDate
  shortenProfileId: ShortenProfileId
}): DesktopTrustedContactViewModel {
  const profile = createContactProfileViewModel({
    contact,
    formatDate,
    shortenProfileId
  })

  return {
    alias: profile.displayName,
    avatar: profile.avatar,
    homeActionEnabled: profile.enterHomeEnabled,
    homeActionLabel: profile.enterHomeLabel,
    messageActionLabel: profile.messageLabel,
    profileId: profile.profileId,
    recentTitle: profile.recentTitle,
    shortProfileId: profile.shortProfileId,
    sourceLabel: profile.sourceLabel,
    statusLabel: profile.statusLabel,
    trustedAtLabel: profile.trustedAtLabel
  }
}

function createMessageRequestViewModel({
  request,
  shortenProfileId
}: {
  request: MessageRequestContact
  shortenProfileId: ShortenProfileId
}): DesktopMessageRequestViewModel {
  return {
    acceptMessage: {
      fromProfileId: request.profileId,
      nick: request.alias || '',
      type: 'kepos.message.request.v1'
    },
    profileId: request.profileId,
    profileLabel: request.alias || displayProfileLabel(request.profileId, shortenProfileId),
    preview: formatDesktopRequestPreview(request.text),
    title: formatDesktopMessageRequestTitle(request, { shortenProfileId })
  }
}

function createOutgoingRequestViewModel({
  formatDate,
  request,
  shortenProfileId
}: {
  formatDate: FormatDate
  request: MessageRequestContact
  shortenProfileId: ShortenProfileId
}): DesktopOutgoingRequestViewModel {
  const label =
    request.alias ||
    request.displayNameSnapshot ||
    displayProfileLabel(request.profileId, shortenProfileId)

  return {
    profileId: request.profileId,
    profileLabel: label,
    requestedAtLabel: `Sent ${formatTrustTime(request.requestedAt, formatDate)}`,
    statusLabel: 'Request sent',
    textPreview: formatDesktopRequestPreview(request.text),
    title: `${label} has not accepted yet.`
  }
}

function displayProfileLabel(
  profileId: string | null | undefined,
  shortenProfileId: ShortenProfileId
): string {
  return profileId ? `Profile ${shortenProfileId(profileId)}` : 'Someone'
}

function formatTrustTime(trustedAt: number | undefined, formatDate: FormatDate): string {
  if (typeof trustedAt !== 'number' || !Number.isFinite(trustedAt)) return 'recently'
  return formatDate(trustedAt)
}
