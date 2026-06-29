import type { ContactBook, ContactBookContact, MessageRequestContact } from './contact-book.ts'
import { isContactTrusted } from './contact-book.ts'

type ShortenProfileId = (profileId: string) => string
type FormatDate = (value: number) => string

export type DesktopPeopleViewModel = {
  messageRequests: DesktopMessageRequestViewModel[]
  trustedContacts: DesktopTrustedContactViewModel[]
}

export type DesktopTrustedContactViewModel = {
  alias: string
  profileId: string
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
      messageRequests: [],
      trustedContacts: []
    }
  }

  return {
    messageRequests: Array.from(contactBook.pendingRequestsByProfileId.values()).map((request) =>
      createMessageRequestViewModel({ request, shortenProfileId })
    ),
    trustedContacts: Array.from(contactBook.contactsByProfileId.values())
      .filter((contact) => isContactTrusted(contactBook, contact.profileId))
      .map((contact) => createTrustedContactViewModel({ contact, formatDate, shortenProfileId }))
      .sort((left, right) => left.alias.localeCompare(right.alias))
  }
}

export function formatDesktopMessageRequestTitle(
  request?: Pick<MessageRequestContact, 'alias'> | null
): string {
  const name = request?.alias?.trim() || 'Someone'
  return `${name} wants to start a direct chat.`
}

export function formatDesktopRequestPreview(text?: string | null): string {
  return text?.trim() || 'No message yet'
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
  return {
    alias: contact.alias || '',
    profileId: contact.profileId,
    shortProfileId: shortenProfileId(contact.profileId),
    sourceLabel: `From ${formatTrustSource(contact.source)}`,
    statusLabel: 'Trusted',
    trustedAtLabel: `Trusted ${formatTrustTime(contact.trustedAt, formatDate)}`
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
    profileLabel: request.alias || shortenProfileId(request.profileId),
    preview: formatDesktopRequestPreview(request.text),
    title: formatDesktopMessageRequestTitle(request)
  }
}

function formatTrustSource(source?: string): string {
  if (source === 'profile_qr' || source === 'person_qr') return 'Profile QR'
  if (source === 'home_room') return 'Home'
  if (source === 'message_request') return 'Message request'
  return 'local trust'
}

function formatTrustTime(trustedAt: number | undefined, formatDate: FormatDate): string {
  if (typeof trustedAt !== 'number' || !Number.isFinite(trustedAt)) return 'recently'
  return formatDate(trustedAt)
}
