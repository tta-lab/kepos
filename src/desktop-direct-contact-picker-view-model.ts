import { listTrustedContacts } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'
import {
  createProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'

const EMPTY_DIRECT_CONTACT_PICKER = {
  actionLabel: 'Open Contacts',
  copy: 'Open Contacts to scan a profile or accept a friend request.',
  title: 'No message threads yet'
}

export function createDesktopDirectContactPickerViewModel({
  contactBook = null,
  resolveAvatarMediaUri = null,
  selectedProfileId = ''
}: {
  contactBook?: ContactBook | null
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  selectedProfileId?: string
} = {}) {
  return {
    contacts: (contactBook ? listTrustedContacts(contactBook) : []).map((contact) => ({
      alias: contact.alias,
      avatar: createProfileAvatarViewModel({
        avatarMediaSnapshot: contact.avatarMediaSnapshot,
        avatarUri: contact.avatarUriSnapshot,
        displayName: contact.alias,
        profileId: contact.profileId,
        resolveAvatarMediaUri
      }),
      isSelected: contact.profileId === selectedProfileId,
      profileId: contact.profileId
    })),
    empty: EMPTY_DIRECT_CONTACT_PICKER
  }
}
