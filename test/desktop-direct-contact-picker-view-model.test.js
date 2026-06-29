import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook, trustContact } from '../src/contact-book.ts'
import { createDesktopDirectContactPickerViewModel } from '../src/desktop-direct-contact-picker-view-model.ts'

test('desktop direct contact picker view model marks the selected trusted contact', () => {
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId: 'profile-a',
    trustedAt: 1000
  })

  assert.deepEqual(
    createDesktopDirectContactPickerViewModel({
      contactBook: book,
      selectedProfileId: 'profile-a'
    }),
    {
      contacts: [
        {
          alias: 'Ada',
          isSelected: true,
          profileId: 'profile-a'
        }
      ],
      empty: {
        actionLabel: 'Add trusted friend',
        copy: 'Add a trusted friend before starting a direct message.',
        title: 'No trusted friends yet'
      }
    }
  )
})

test('desktop direct contact picker view model defaults to an empty picker', () => {
  assert.deepEqual(createDesktopDirectContactPickerViewModel(), {
    contacts: [],
    empty: {
      actionLabel: 'Add trusted friend',
      copy: 'Add a trusted friend before starting a direct message.',
      title: 'No trusted friends yet'
    }
  })
})
