import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createContactBook,
  ignoreMessageRequest,
  recordMessageRequest,
  recordOutgoingFriendRequest,
  revokeContact,
  trustContact
} from '../src/contact-book.ts'
import { createDesktopPeopleViewModel } from '../src/desktop-people-view-model.ts'

test('desktop people view model formats trusted contacts for rendering', () => {
  const profileId = 'b'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId,
    source: 'profile_qr',
    trustedAt: 2000
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: () => 'Jan 1, 1970',
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.trustedContacts, [
    {
      alias: 'Ada',
      avatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone3'
      },
      homeActionEnabled: false,
      homeActionLabel: 'Enter Home',
      messageActionEnabled: true,
      messageActionLabel: 'Message',
      profileId,
      recentCopy: 'Recent posts from this profile will appear here when available.',
      recentTitle: 'Recent posts',
      relationshipState: 'trusted',
      revokeActionLabel: 'Remove friend',
      shortProfileId: `short:${profileId}`,
      sourceLabel: 'From Profile QR',
      statusLabel: 'Trusted',
      trustedAtLabel: 'Trusted Jan 1, 1970'
    }
  ])
})

test('desktop people view model uses product copy for home-sourced trust', () => {
  const profileId = 'b'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId,
    source: 'home_room',
    trustedAt: 2000
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: () => 'Jan 1, 1970'
  })

  assert.equal(viewModel.trustedContacts[0].sourceLabel, 'From Home')
})

test('desktop people view model enables home entry when a descriptor is saved', () => {
  const profileId = 'b'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    homeAddress: 'c'.repeat(64),
    homeExpiresAt: 9999999999999,
    homePolicy: 'trusted_only',
    homeRoomKey: 'd'.repeat(64),
    proof: { signature: 'owner-proof' },
    profileId,
    source: 'profile_qr',
    trustedAt: 2000
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: () => 'Jan 1, 1970'
  })

  assert.equal(viewModel.trustedContacts[0].homeActionEnabled, true)
})

test('desktop people view model keeps home entry disabled without a descriptor room key', () => {
  const profileId = 'b'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    homeAddress: 'c'.repeat(64),
    profileId,
    source: 'profile_qr',
    trustedAt: 2000
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: () => 'Jan 1, 1970'
  })

  assert.equal(viewModel.trustedContacts[0].homeActionEnabled, false)
})

test('desktop people view model formats pending message requests for rendering', () => {
  const profileId = 'b'.repeat(64)
  const book = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId,
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'home_room',
    text: ' hello '
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.messageRequests, [
    {
      acceptMessage: {
        fromProfileId: profileId,
        nick: 'Ada',
        type: 'kepos.message.request.v1'
      },
      profileId,
      profileLabel: 'Ada',
      preview: 'hello',
      title: 'Ada sent a friend request.'
    }
  ])
})

test('desktop people view model formats outgoing friend requests for rendering', () => {
  const profileId = 'b'.repeat(64)
  const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId,
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'profile_qr',
    text: ' hello '
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: () => 'Jan 1, 1970',
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.outgoingRequests, [
    {
      profileId,
      profileLabel: 'Ada',
      retryActionEnabled: false,
      retryActionLabel: 'Retry',
      requestedAtLabel: 'Queued Jan 1, 1970',
      statusLabel: 'Request pending',
      textPreview: 'hello',
      title: 'Ada has not accepted yet.'
    }
  ])
})

test('desktop people view model enables retry when a signed outgoing request is stored', () => {
  const profileId = 'b'.repeat(64)
  const book = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    deliveryState: 'failed',
    profileId,
    requestedAt: 1000,
    requestId: 'request-1',
    signedRequest: {
      fromProfileId: 'owner-a',
      requestId: 'request-1',
      text: 'hello',
      toProfileId: profileId
    },
    source: 'profile_qr',
    text: ' hello '
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: () => 'Jan 1, 1970'
  })

  assert.equal(viewModel.outgoingRequests[0].retryActionEnabled, true)
  assert.equal(viewModel.outgoingRequests[0].retryActionLabel, 'Retry')
  assert.equal(viewModel.outgoingRequests[0].statusLabel, 'Request failed')
})

test('desktop people view model formats removed and ignored contacts for rendering', () => {
  const revokedProfileId = 'b'.repeat(64)
  const ignoredProfileId = 'c'.repeat(64)
  let book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId: revokedProfileId,
    source: 'profile_qr',
    trustedAt: 1000
  })

  book = revokeContact(book, { profileId: revokedProfileId, revokedAt: 2000 })
  book = recordMessageRequest(book, {
    alias: 'Grace',
    profileId: ignoredProfileId,
    requestedAt: 3000,
    source: 'home_room',
    text: 'hello'
  })
  book = ignoreMessageRequest(book, { profileId: ignoredProfileId, ignoredAt: 4000 })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: (value) => `date:${value}`,
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.trustedContacts, [])
  assert.deepEqual(viewModel.messageRequests, [])
  assert.deepEqual(viewModel.blockedContacts, [
    {
      blockedAtLabel: 'Removed date:2000',
      copy: 'Future access is stopped. Data already copied to them is not erased.',
      profileId: revokedProfileId,
      profileLabel: 'Ada',
      shortProfileId: `short:${revokedProfileId}`,
      statusLabel: 'Removed'
    },
    {
      blockedAtLabel: 'Ignored date:4000',
      copy: 'This request is hidden. Allow requests before a new friend request.',
      profileId: ignoredProfileId,
      profileLabel: 'Grace',
      shortProfileId: `short:${ignoredProfileId}`,
      statusLabel: 'Ignored'
    }
  ])
})

test('desktop people view model uses stable fallbacks', () => {
  const profileId = 'b'.repeat(64)
  const book = createContactBook({ ownerProfileId: 'owner-a' })

  book.pendingRequestsByProfileId.set(profileId, {
    profileId,
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'home_room',
    text: ''
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.messageRequests, [
    {
      acceptMessage: {
        fromProfileId: profileId,
        nick: '',
        type: 'kepos.message.request.v1'
      },
      profileId,
      profileLabel: `Profile short:${profileId}`,
      preview: 'No message yet',
      title: `Profile short:${profileId} sent a friend request.`
    }
  ])
})

test('desktop people view model can render before a contact book snapshot arrives', () => {
  const viewModel = createDesktopPeopleViewModel({
    contactBook: null
  })

  assert.deepEqual(viewModel, {
    blockedContacts: [],
    messageRequests: [],
    outgoingRequests: [],
    profileDetails: [],
    trustedContacts: []
  })
})

test('desktop people view model exposes profile details for request and blocked rows', () => {
  const incomingProfileId = 'b'.repeat(64)
  const outgoingProfileId = 'c'.repeat(64)
  const ignoredProfileId = 'd'.repeat(64)
  let book = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Incoming Ada',
    profileId: incomingProfileId,
    requestedAt: 1000,
    requestId: 'request-in'
  })
  book = recordOutgoingFriendRequest(book, {
    alias: 'Outgoing Grace',
    deliveryState: 'delivered',
    profileId: outgoingProfileId,
    requestedAt: 1100,
    requestId: 'request-out'
  })
  book = recordMessageRequest(book, {
    alias: 'Ignored Mina',
    profileId: ignoredProfileId,
    requestedAt: 1200,
    requestId: 'request-ignored'
  })
  book = ignoreMessageRequest(book, { ignoredAt: 1300, profileId: ignoredProfileId })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: (value) => `date:${value}`,
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(
    viewModel.profileDetails.map((profile) => ({
      alias: profile.alias,
      acceptMessage: profile.acceptMessage,
      canRemove: profile.canRemove,
      profileId: profile.profileId,
      relationshipState: profile.relationshipState,
      statusLabel: profile.statusLabel,
      trustedAtLabel: profile.trustedAtLabel
    })),
    [
      {
        acceptMessage: {
          fromProfileId: incomingProfileId,
          nick: 'Incoming Ada',
          type: 'kepos.message.request.v1'
        },
        alias: 'Incoming Ada',
        canRemove: false,
        profileId: incomingProfileId,
        relationshipState: 'incoming_request',
        statusLabel: 'Incoming request',
        trustedAtLabel: 'Not trusted yet'
      },
      {
        acceptMessage: undefined,
        alias: 'Outgoing Grace',
        canRemove: false,
        profileId: outgoingProfileId,
        relationshipState: 'outgoing_request',
        statusLabel: 'Request delivered',
        trustedAtLabel: 'Not trusted yet'
      },
      {
        acceptMessage: undefined,
        alias: 'Ignored Mina',
        canRemove: false,
        profileId: ignoredProfileId,
        relationshipState: 'ignored',
        statusLabel: 'Ignored',
        trustedAtLabel: 'Ignored date:1300'
      }
    ]
  )
})
