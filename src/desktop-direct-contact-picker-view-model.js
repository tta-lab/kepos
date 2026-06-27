import { listTrustedContacts } from './contact-book.ts'

const EMPTY_DIRECT_CONTACT_PICKER = {
  actionLabel: 'Add trusted friend',
  copy: 'Add a trusted friend before starting a direct message.',
  title: 'No trusted friends yet'
}

export function createDesktopDirectContactPickerViewModel({
  contactBook = null,
  selectedProfileId = ''
} = {}) {
  return {
    contacts: listTrustedContacts(contactBook).map((contact) => ({
      alias: contact.alias,
      isSelected: contact.profileId === selectedProfileId,
      profileId: contact.profileId
    })),
    empty: EMPTY_DIRECT_CONTACT_PICKER
  }
}
