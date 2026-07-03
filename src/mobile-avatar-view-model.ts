import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'

type MobileDirectMessageAvatarInput = {
  alias?: string | null
  direction?: string | null
  fromProfileId?: string | null
  nick?: string | null
}

type MobileDirectAvatarContact = {
  alias?: string | null
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0] | null
  avatarUriSnapshot?: string | null
  profileId?: string | null
}

type MobileTreeholeAuthor = {
  author?: string | null
  authorDisplayName?: string | null
  authorProfileId?: string | null
}

export function createMobileTreeholeAuthorAvatar(
  author: MobileTreeholeAuthor
): ProfileAvatarViewModel {
  const displayName = author.authorDisplayName || author.author || ''

  return createProfileAvatarViewModel({
    displayName,
    profileId: author.authorProfileId || displayName
  })
}

export function createMobileDirectMessageAvatar(
  message: MobileDirectMessageAvatarInput,
  contacts: MobileDirectAvatarContact[] = [],
  resolveAvatarMediaUri: ResolveAvatarMediaUri | null = null
): ProfileAvatarViewModel {
  if (message.direction === 'out') {
    return createProfileAvatarViewModel({
      displayName: 'You',
      profileId: 'you'
    })
  }

  const contact = contacts.find((entry) => entry.profileId === message.fromProfileId)

  return createProfileAvatarViewModel({
    avatarMediaSnapshot: contact?.avatarMediaSnapshot || null,
    avatarUri: contact?.avatarUriSnapshot || '',
    displayName: contact?.alias || message.alias || message.nick || '',
    profileId: message.fromProfileId || '',
    resolveAvatarMediaUri
  })
}
