import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createContactBook, trustContact } from '../src/contact-book.ts'
import { createDesktopDirectContactPickerViewModel } from '../src/desktop-direct-contact-picker-view-model.ts'
import { createProfileAvatarViewModel } from '../src/profile-avatar-view-model.ts'

test('desktop direct contact picker view model marks the selected trusted contact', () => {
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    avatarUriSnapshot: 'kepos://avatar/ada',
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
          avatar: createProfileAvatarViewModel({
            avatarUri: 'kepos://avatar/ada',
            displayName: 'Ada',
            profileId: 'profile-a'
          }),
          isSelected: true,
          profileId: 'profile-a'
        }
      ],
      empty: {
        actionLabel: 'Open Contacts',
        copy: 'Open Contacts to scan a profile or accept a friend request.',
        title: 'No message threads yet'
      }
    }
  )
})

test('desktop direct contact picker view model defaults to an empty picker', () => {
  assert.deepEqual(createDesktopDirectContactPickerViewModel(), {
    contacts: [],
    empty: {
      actionLabel: 'Open Contacts',
      copy: 'Open Contacts to scan a profile or accept a friend request.',
      title: 'No message threads yet'
    }
  })
})

test('desktop direct contact picker resolves stored avatar media snapshots', () => {
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    avatarMediaSnapshot,
    avatarUriSnapshot: 'kepos://avatar/old',
    profileId: 'profile-a',
    trustedAt: 1000
  })

  const viewModel = createDesktopDirectContactPickerViewModel({
    contactBook: book,
    resolveAvatarMediaUri: (reference) => `file:///avatars/${reference.digest}.png`
  })

  assert.equal(viewModel.contacts[0].avatar.imageUri, `file:///avatars/${'a'.repeat(64)}.png`)
})
