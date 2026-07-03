import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createContactBook, trustContact } from '../src/contact-book.ts'
import { createDesktopDirectMessageListViewModel } from '../src/desktop-direct-view-model.ts'

test('desktop direct view model formats normal direct messages', () => {
  const viewModel = createDesktopDirectMessageListViewModel({
    messages: [
      {
        direction: 'out',
        text: 'hello',
        toProfileId: 'b'.repeat(64),
        type: 'kepos.dm.message.v1'
      },
      {
        direction: 'in',
        fromProfileId: 'c'.repeat(64),
        nick: 'Ada',
        text: 'hi',
        type: 'kepos.dm.message.v1'
      }
    ],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.deepEqual(viewModel, [
    {
      actions: null,
      avatar: {
        initials: 'Y',
        label: 'You avatar',
        tone: 'avatarTone4'
      },
      className: 'item outgoing',
      meta: 'You to Profile bbbb',
      text: 'hello'
    },
    {
      actions: null,
      avatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone1'
      },
      className: 'item incoming',
      meta: 'Ada to you',
      text: 'hi'
    }
  ])

  const fallbackMessages = createDesktopDirectMessageListViewModel({
    messages: [
      {
        direction: 'out',
        text: 'hello',
        type: 'kepos.dm.message.v1'
      },
      {
        direction: 'in',
        text: 'hi',
        type: 'kepos.dm.message.v1'
      }
    ],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.equal(fallbackMessages[0].meta, 'You to Someone')
  assert.equal(fallbackMessages[1].meta, 'Someone to you')
})

test('desktop direct view model formats message request actions', () => {
  const message = {
    direction: 'in',
    fromProfileId: 'b'.repeat(64),
    nick: 'Ada',
    text: 'can we chat?',
    type: 'kepos.message.request.v1'
  }

  const viewModel = createDesktopDirectMessageListViewModel({
    messages: [message],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.deepEqual(viewModel, [
    {
      actions: {
        acceptMessage: message,
        ignoreMessage: message
      },
      avatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone3'
      },
      className: 'item incoming',
      meta: 'Ada sent a friend request.',
      text: 'can we chat?'
    }
  ])
})

test('desktop direct view model formats outgoing message requests', () => {
  const viewModel = createDesktopDirectMessageListViewModel({
    messages: [
      {
        direction: 'out',
        text: 'hello',
        toProfileId: 'b'.repeat(64),
        type: 'kepos.message.request.v1'
      }
    ],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.equal(viewModel[0].meta, 'You sent a friend request')
  assert.equal(viewModel[0].actions, null)
})

test('desktop direct view model prefers local contact snapshots over stale message nicknames', () => {
  const profileId = 'b'.repeat(64)
  const contactBook = trustContact(createContactBook({ ownerProfileId: 'a'.repeat(64) }), {
    alias: 'Local Mina',
    avatarUriSnapshot: 'kepos://avatar/mina',
    displayNameSnapshot: 'Remote Mina',
    profileId,
    trustedAt: 1000
  })

  const viewModel = createDesktopDirectMessageListViewModel({
    contactBook,
    messages: [
      {
        direction: 'in',
        fromProfileId: profileId,
        nick: 'Old Mina',
        text: 'hi',
        type: 'kepos.dm.message.v1'
      }
    ],
    shortenProfileId: (value) => value.slice(0, 4)
  })

  assert.equal(viewModel[0].meta, 'Local Mina to you')
  assert.deepEqual(viewModel[0].avatar, {
    imageUri: 'kepos://avatar/mina',
    initials: 'LM',
    label: 'Local Mina avatar',
    tone: 'avatarTone3'
  })
})

test('desktop direct view model resolves contact avatar media snapshots for message bubbles', () => {
  const profileId = 'b'.repeat(64)
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const contactBook = trustContact(createContactBook({ ownerProfileId: 'a'.repeat(64) }), {
    alias: 'Local Mina',
    avatarMediaSnapshot,
    avatarUriSnapshot: 'kepos://avatar/old',
    profileId,
    trustedAt: 1000
  })

  const [message] = createDesktopDirectMessageListViewModel({
    contactBook,
    messages: [
      {
        direction: 'in',
        fromProfileId: profileId,
        text: 'hi',
        type: 'kepos.dm.message.v1'
      }
    ],
    resolveAvatarMediaUri: (reference) => `file:///avatars/${reference.digest}.png`,
    shortenProfileId: (value) => value.slice(0, 4)
  })

  assert.equal(message.avatar.imageUri, `file:///avatars/${'a'.repeat(64)}.png`)
})
