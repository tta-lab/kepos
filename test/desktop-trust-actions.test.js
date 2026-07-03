import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canContactAccessHome,
  canSendMessageRequest,
  createContactBook,
  getContact,
  recordOutgoingFriendRequest,
  revokeContact,
  trustContact
} from '../src/contact-book.ts'
import { createDesktopTrustActions } from '../src/desktop-trust-actions.ts'

function createHarness(overrides = {}) {
  const calls = []
  let homeJoinDetails = { profileId: 'local', treeholePolicy: { trusted: [] } }
  let selectedRecipientProfileId = 'friend'
  const context = {
    contactBook: createContactBook({ ownerProfileId: 'local' }),
    profile: {
      id: 'local',
      identity: { publicKey: 'local-public' }
    },
    saveContactBook(book) {
      calls.push(['saveContactBook', book])
    }
  }
  const dmRuntime = {
    closeThreads(threadIds) {
      calls.push(['dm.closeThreads', threadIds])
    },
    loadThreads() {
      calls.push(['dm.loadThreads'])
      return [{ threadId: 'thread-1' }]
    },
    replaceThreads(threads) {
      calls.push(['dm.replaceThreads', threads])
    }
  }
  const actions = createDesktopTrustActions({
    configureTreeholeRuntime: () => calls.push(['treehole.configure']),
    createContactRevoke: ({ profileId, selectedRecipientProfileId, threads }) => ({
      book: { revoked: profileId },
      nextThreads: threads.map((thread) => ({ ...thread, state: 'revoked' })),
      revokedThreadIds: ['thread-1'],
      shouldClearRecipient: selectedRecipientProfileId === profileId,
      treeholePolicy: { trusted: [] }
    }),
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => homeJoinDetails,
    getProfileContext: () => context,
    getSelectedRecipientProfileId: () => selectedRecipientProfileId,
    onChanged: () => calls.push(['render']),
    readProfileTrustQr: ({ uri }) => {
      calls.push(['readProfileQr', uri])
      return {
        createdAt: 123,
        displayName: 'Ada',
        kind: 'profile_request_target',
        profileId: 'friend'
      }
    },
    setContextFormDraft: (draft) => calls.push(['form.draft', draft]),
    setDirectComposerRecipient: (profileId) => {
      selectedRecipientProfileId = profileId
      calls.push(['composer.recipient', profileId])
    },
    setProfileRequestTarget: (target) => calls.push(['request.target', target]),
    setHomeJoinDetails: (nextDetails) => {
      homeJoinDetails = nextDetails
    },
    setNotice: (notice) => calls.push(['notice', notice]),
    ...overrides
  })

  return {
    actions,
    calls,
    get homeJoinDetails() {
      return homeJoinDetails
    },
    get selectedRecipientProfileId() {
      return selectedRecipientProfileId
    }
  }
}

test('desktop trust actions prepare a friend request target from a profile QR', () => {
  const harness = createHarness()

  harness.actions.prepareProfileRequestTarget({
    alias: 'Ada',
    displayName: 'Neil',
    uri: 'kepos://profile'
  })

  assert.deepEqual(harness.homeJoinDetails, {
    profileId: 'local',
    treeholePolicy: { trusted: [] }
  })
  assert.deepEqual(harness.calls, [
    ['readProfileQr', 'kepos://profile'],
    ['composer.recipient', 'friend'],
    [
      'request.target',
      {
        avatar: {
          initials: 'A',
          label: 'Ada avatar',
          tone: 'avatarTone3'
        },
        canOpenProfile: true,
        canSendRequest: true,
        copy: 'Write an intro in Chat to send a friend request.',
        displayName: 'Ada',
        profileId: 'friend',
        relationshipState: 'request_target',
        shortProfileId: 'friend...friend',
        statusLabel: 'Friend request'
      }
    ],
    ['form.draft', { trustAlias: '', trustQrUri: '' }],
    ['notice', 'Friend request target ready.'],
    ['render']
  ])
})

test('desktop trust actions mark repeated profile QR requests as pending', () => {
  const contactBook = recordOutgoingFriendRequest(createContactBook({ ownerProfileId: 'local' }), {
    alias: 'Ada',
    profileId: 'friend',
    requestedAt: 1000,
    requestId: 'request-1',
    text: 'hello'
  })
  const harness = createHarness({
    getProfileContext: () => ({
      contactBook,
      profile: {
        id: 'local',
        identity: { publicKey: 'local-public' }
      },
      saveContactBook: (book) => harness.calls.push(['saveContactBook', book])
    })
  })

  harness.actions.prepareProfileRequestTarget({ uri: 'kepos://profile' })

  assert.deepEqual(harness.calls.slice(0, 3), [
    ['readProfileQr', 'kepos://profile'],
    ['composer.recipient', 'friend'],
    [
      'request.target',
      {
        avatar: {
          initials: 'A',
          label: 'Ada avatar',
          tone: 'avatarTone3'
        },
        canOpenProfile: true,
        canSendRequest: false,
        copy: 'Your request is pending. Wait for them to accept.',
        displayName: 'Ada',
        profileId: 'friend',
        relationshipState: 'outgoing_request',
        shortProfileId: 'friend...friend',
        statusLabel: 'Request pending'
      }
    ]
  ])
})

test('desktop trust actions revoke contact threads and clear selected direct recipient', async () => {
  const harness = createHarness()

  await harness.actions.revokeContact('friend')

  assert.equal(harness.selectedRecipientProfileId, '')
  assert.deepEqual(harness.homeJoinDetails, {
    profileId: 'local',
    treeholePolicy: { trusted: [] }
  })
  assert.deepEqual(harness.calls, [
    ['dm.loadThreads'],
    ['saveContactBook', { revoked: 'friend' }],
    ['dm.replaceThreads', [{ threadId: 'thread-1', state: 'revoked' }]],
    ['dm.closeThreads', ['thread-1']],
    ['treehole.configure'],
    ['composer.recipient', ''],
    ['notice', 'Friend removed.'],
    ['render']
  ])
})

test('desktop trust actions allow requests again without restoring revoked trust', async () => {
  let contactBook = revokeContact(
    trustContact(createContactBook({ ownerProfileId: 'local' }), {
      alias: 'Ada',
      displayNameSnapshot: 'Ada Lovelace',
      homeAddress: 'home-b',
      profileId: 'friend',
      trustedAt: 1000
    }),
    { profileId: 'friend', revokedAt: 2000 }
  )
  const harness = createHarness({
    getProfileContext: () => ({
      contactBook,
      profile: {
        id: 'local',
        identity: { publicKey: 'local-public' }
      },
      saveContactBook: (book) => {
        contactBook = book
        harness.calls.push(['saveContactBook', book])
      }
    })
  })

  await harness.actions.allowContactRequests('friend')

  assert.equal(canSendMessageRequest(contactBook, 'friend'), true)
  assert.equal(canContactAccessHome(contactBook, 'friend'), false)
  assert.equal(getContact(contactBook, 'friend').trustedAt, undefined)
  assert.deepEqual(harness.homeJoinDetails, {
    profileId: 'local',
    treeholePolicy: {
      ownerProfileId: 'local',
      revokedProfileIds: [],
      trustedProfileIds: []
    }
  })
  assert.deepEqual(
    harness.calls.map((call) => call[0]),
    ['saveContactBook', 'treehole.configure', 'notice', 'render']
  )
})

test('desktop trust actions ignore empty profile request target input', () => {
  const harness = createHarness()

  harness.actions.prepareProfileRequestTarget({ uri: '' })

  assert.deepEqual(harness.calls, [])
})
