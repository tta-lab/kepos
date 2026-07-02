import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  createContactBook,
  ignoreMessageRequest,
  recordMessageRequest,
  recordOutgoingFriendRequest,
  revokeContact,
  trustContact
} from '../src/contact-book.ts'
import {
  createFriendRequestTargetViewModel,
  shouldBlockChatSendForFriendRequestTarget
} from '../src/friend-request-target-view-model.ts'
import { createProfileAvatarViewModel } from '../src/profile-avatar-view-model.ts'

const target = {
  avatarUri: 'kepos://avatar/ada',
  displayName: 'Ada',
  profileId: 'profile-ada'
}

function view(contactBook) {
  return createFriendRequestTargetViewModel({
    contactBook,
    shortenProfileId: (profileId) => `short:${profileId}`,
    target
  })
}

test('friend request target view model marks a new profile as sendable', () => {
  const book = createContactBook({ ownerProfileId: 'local' })

  assert.deepEqual(view(book), {
    canOpenProfile: true,
    canSendRequest: true,
    copy: 'Write an intro in Chat to send a friend request.',
    displayName: 'Ada',
    avatar: createProfileAvatarViewModel({
      avatarUri: 'kepos://avatar/ada',
      displayName: 'Ada',
      profileId: 'profile-ada'
    }),
    avatarUri: 'kepos://avatar/ada',
    profileId: 'profile-ada',
    relationshipState: 'new',
    shortProfileId: 'short:profile-ada',
    statusLabel: 'Friend request'
  })
})

test('friend request target view model marks an outgoing request as pending', () => {
  const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    profileId: 'profile-ada',
    requestedAt: 1000,
    requestId: 'request-1',
    text: 'hello'
  })

  assert.deepEqual(view(book), {
    canOpenProfile: true,
    canSendRequest: false,
    copy: 'Your request is pending. Wait for them to accept.',
    displayName: 'Ada',
    avatar: createProfileAvatarViewModel({
      avatarUri: 'kepos://avatar/ada',
      displayName: 'Ada',
      profileId: 'profile-ada'
    }),
    avatarUri: 'kepos://avatar/ada',
    profileId: 'profile-ada',
    relationshipState: 'outgoing_request',
    shortProfileId: 'short:profile-ada',
    statusLabel: 'Request pending'
  })
})

test('friend request target view model keeps delivered requests untrusted', () => {
  const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    deliveryState: 'delivered',
    profileId: 'profile-ada',
    requestedAt: 1000,
    requestId: 'request-1',
    text: 'hello'
  })
  const profile = view(book)

  assert.equal(profile.canSendRequest, false)
  assert.equal(profile.relationshipState, 'outgoing_request')
  assert.equal(profile.statusLabel, 'Request delivered')
  assert.equal(profile.copy, 'Your request is pending. Wait for them to accept.')
})

test('friend request target view model marks trusted contacts as existing friends', () => {
  const book = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada local',
    profileId: 'profile-ada',
    trustedAt: 1000
  })

  assert.equal(view(book).canSendRequest, false)
  assert.equal(view(book).displayName, 'Ada local')
  assert.equal(view(book).relationshipState, 'trusted')
  assert.equal(view(book).statusLabel, 'Already friends')
  assert.equal(view(book).copy, 'Open their profile from Contacts.')
})

test('friend request target view model prefers local contact avatar snapshots', () => {
  const book = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada local',
    avatarUriSnapshot: 'kepos://avatar/local-ada',
    profileId: 'profile-ada',
    trustedAt: 1000
  })

  assert.deepEqual(
    view(book).avatar,
    createProfileAvatarViewModel({
      avatarUri: 'kepos://avatar/local-ada',
      displayName: 'Ada local',
      profileId: 'profile-ada'
    })
  )
})

test('friend request target view model resolves stored avatar media snapshots', () => {
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const book = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada local',
    avatarMediaSnapshot,
    avatarUriSnapshot: 'kepos://avatar/old',
    profileId: 'profile-ada',
    trustedAt: 1000
  })

  assert.equal(
    createFriendRequestTargetViewModel({
      contactBook: book,
      resolveAvatarMediaUri: (reference) => `file:///avatars/${reference.digest}.png`,
      shortenProfileId: (profileId) => `short:${profileId}`,
      target
    }).avatar.imageUri,
    `file:///avatars/${'a'.repeat(64)}.png`
  )
})

test('friend request target view model stops requests for ignored and removed contacts', () => {
  const pending = recordMessageRequest(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    profileId: 'profile-ada',
    requestId: 'request-1'
  })
  const ignored = ignoreMessageRequest(pending, { ignoredAt: 1000, profileId: 'profile-ada' })
  const trusted = trustContact(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    profileId: 'profile-ada',
    trustedAt: 1000
  })
  const revoked = revokeContact(trusted, { profileId: 'profile-ada', revokedAt: 2000 })

  assert.equal(view(ignored).canSendRequest, false)
  assert.equal(view(ignored).relationshipState, 'blocked')
  assert.equal(view(ignored).statusLabel, 'Ignored')
  assert.equal(
    view(ignored).copy,
    'You ignored this request. Use Allow requests from Contacts before sending again.'
  )
  assert.equal(view(revoked).canSendRequest, false)
  assert.equal(view(revoked).relationshipState, 'blocked')
  assert.equal(view(revoked).statusLabel, 'Removed')
  assert.equal(
    view(revoked).copy,
    'You removed this friend. Use Allow requests from Contacts before sending again.'
  )
})

test('friend request target view model identifies states that block Chat sends', () => {
  assert.equal(shouldBlockChatSendForFriendRequestTarget({ relationshipState: 'blocked' }), true)
  assert.equal(
    shouldBlockChatSendForFriendRequestTarget({ relationshipState: 'incoming_request' }),
    true
  )
  assert.equal(
    shouldBlockChatSendForFriendRequestTarget({ relationshipState: 'outgoing_request' }),
    true
  )
  assert.equal(shouldBlockChatSendForFriendRequestTarget({ relationshipState: 'new' }), false)
  assert.equal(shouldBlockChatSendForFriendRequestTarget({ relationshipState: 'trusted' }), false)
})
