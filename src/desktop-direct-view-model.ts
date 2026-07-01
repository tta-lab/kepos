import { formatDesktopMessageRequestTitle } from './desktop-people-view-model.ts'
import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'
import type { ContactBook } from './contact-book.ts'

type ShortenProfileId = (profileId: string) => string

type DesktopDirectMessage = {
  alias?: string
  direction?: string
  fromProfileId?: string
  nick?: string
  text?: string
  toProfileId?: string
  type?: string
}

type DirectContact = {
  alias?: string
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
  avatarUriSnapshot?: string
  displayNameSnapshot?: string
  profileId: string
}

export type DesktopDirectMessageViewModel = {
  actions: {
    acceptMessage: DesktopDirectMessage
    ignoreMessage: DesktopDirectMessage
  } | null
  avatar: ProfileAvatarViewModel
  className: string
  meta: string
  text?: string
}

export function createDesktopDirectMessageListViewModel({
  contactBook = null,
  contacts = [],
  messages = [],
  resolveAvatarMediaUri = null,
  shortenProfileId = (profileId) => profileId
}: {
  contactBook?: ContactBook | null
  contacts?: readonly DirectContact[]
  messages?: readonly DesktopDirectMessage[]
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  shortenProfileId?: ShortenProfileId
}): DesktopDirectMessageViewModel[] {
  return messages.map((message) => ({
    actions: getDirectMessageActions(message),
    avatar: createDirectMessageAvatar(message, { contactBook, contacts, resolveAvatarMediaUri }),
    className: `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`,
    meta: formatDirectMessageMeta(message, { contactBook, contacts, shortenProfileId }),
    text: message.text
  }))
}

function createDirectMessageAvatar(
  message: DesktopDirectMessage,
  {
    contactBook,
    contacts,
    resolveAvatarMediaUri
  }: {
    contactBook: ContactBook | null
    contacts: readonly DirectContact[]
    resolveAvatarMediaUri: ResolveAvatarMediaUri | null
  }
): ProfileAvatarViewModel {
  if (message.direction === 'out') {
    return createProfileAvatarViewModel({
      displayName: 'You',
      profileId: 'you'
    })
  }

  const displayName = findContactDisplayName({
    contactBook,
    contacts,
    profileId: message.fromProfileId
  })

  return createProfileAvatarViewModel({
    avatarMediaSnapshot: findContactAvatarMediaSnapshot({
      contactBook,
      contacts,
      profileId: message.fromProfileId
    }),
    avatarUri: findContactAvatarUri({
      contactBook,
      contacts,
      profileId: message.fromProfileId
    }),
    displayName: displayName || message.alias || message.nick || '',
    profileId: message.fromProfileId || '',
    resolveAvatarMediaUri
  })
}

function getDirectMessageActions(
  message: DesktopDirectMessage
): DesktopDirectMessageViewModel['actions'] {
  if (message.type !== 'kepos.message.request.v1' || message.direction !== 'in') {
    return null
  }

  return {
    acceptMessage: message,
    ignoreMessage: message
  }
}

function formatDirectMessageMeta(
  message: DesktopDirectMessage,
  {
    contactBook,
    contacts,
    shortenProfileId
  }: {
    contactBook: ContactBook | null
    contacts: readonly DirectContact[]
    shortenProfileId: ShortenProfileId
  }
): string {
  if (message.type === 'kepos.message.request.v1') {
    return message.direction === 'out'
      ? 'You sent a friend request'
      : formatDesktopMessageRequestTitle({
          ...message,
          alias:
            findContactDisplayName({
              contactBook,
              contacts,
              profileId: message.fromProfileId
            }) ||
            message.alias ||
            message.nick ||
            '',
          profileId: message.fromProfileId
        })
  }

  return message.direction === 'out'
    ? `You to ${displayDirectPeer(message.toProfileId, {
        contactBook,
        contacts,
        shortenProfileId
      })}`
    : `${displayDirectPeer(message.fromProfileId, {
        contactBook,
        contacts,
        displayName: message.nick,
        shortenProfileId
      })} to you`
}

function displayDirectPeer(
  profileId: string | undefined,
  {
    contactBook = null,
    contacts = [],
    displayName = '',
    shortenProfileId
  }: {
    contactBook?: ContactBook | null
    contacts?: readonly DirectContact[]
    displayName?: string
    shortenProfileId: ShortenProfileId
  }
): string {
  return (
    findContactDisplayName({ contactBook, contacts, profileId }) ||
    displayName?.trim() ||
    (profileId ? `Profile ${shortenProfileId(profileId)}` : 'Someone')
  )
}

function findContactDisplayName({
  contactBook,
  contacts,
  profileId
}: {
  contactBook: ContactBook | null
  contacts: readonly DirectContact[]
  profileId?: string
}): string {
  if (!profileId) return ''

  const contact =
    contactBook?.contactsByProfileId?.get(profileId) ||
    contacts.find((entry) => entry.profileId === profileId)

  return contact?.alias?.trim() || contact?.displayNameSnapshot?.trim() || ''
}

function findContactAvatarUri({
  contactBook,
  contacts,
  profileId
}: {
  contactBook: ContactBook | null
  contacts: readonly DirectContact[]
  profileId?: string
}): string {
  if (!profileId) return ''

  const contact =
    contactBook?.contactsByProfileId?.get(profileId) ||
    contacts.find((entry) => entry.profileId === profileId)

  return contact?.avatarUriSnapshot?.trim() || ''
}

function findContactAvatarMediaSnapshot({
  contactBook,
  contacts,
  profileId
}: {
  contactBook: ContactBook | null
  contacts: readonly DirectContact[]
  profileId?: string
}): Parameters<ResolveAvatarMediaUri>[0] | null {
  if (!profileId) return null

  const contact =
    contactBook?.contactsByProfileId?.get(profileId) ||
    contacts.find((entry) => entry.profileId === profileId)

  return contact?.avatarMediaSnapshot || null
}
