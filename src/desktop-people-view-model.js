import { isContactTrusted } from './contact-book.ts'

export function createDesktopPeopleViewModel({
  contactBook,
  formatDate = (value) => new Date(value).toLocaleDateString(),
  shortenProfileId = (profileId) => profileId
}) {
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

export function formatDesktopMessageRequestTitle(request) {
  const name = request?.alias?.trim() || 'Someone'
  return `${name} wants to start a DM.`
}

export function formatDesktopRequestPreview(text) {
  return text?.trim() || 'No message yet'
}

function createTrustedContactViewModel({ contact, formatDate, shortenProfileId }) {
  return {
    alias: contact.alias,
    profileId: contact.profileId,
    shortProfileId: shortenProfileId(contact.profileId),
    sourceLabel: `From ${formatTrustSource(contact.source)}`,
    statusLabel: 'Trusted',
    trustedAtLabel: `Trusted ${formatTrustTime(contact.trustedAt, formatDate)}`
  }
}

function createMessageRequestViewModel({ request, shortenProfileId }) {
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

function formatTrustSource(source) {
  if (source === 'profile_qr' || source === 'person_qr') return 'Profile QR'
  if (source === 'home_room') return 'Home room'
  if (source === 'message_request') return 'Message request'
  return 'local trust'
}

function formatTrustTime(trustedAt, formatDate) {
  if (!Number.isFinite(trustedAt)) return 'recently'
  return formatDate(trustedAt)
}
