import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createContactBook, recordOutgoingFriendRequest } from '../src/contact-book.ts'
import { createDesktopMainBackendSession } from '../src/desktop-main-backend-session.ts'

test('desktop main backend session uses file profile context and local backend bridge', async () => {
  const calls = []
  const emitted = []
  const session = createDesktopMainBackendSession({
    createBackendSession: (options) => {
      calls.push(options)
      return {
        backendHost: {
          bridge: {
            dispatch: () => undefined,
            emit: (event, payload) => emitted.push([event, payload]),
            subscribe: () => () => {}
          }
        }
      }
    },
    createControllerState: () => createControllerState(calls),
    createId: () => 'id-1',
    createProfileContext: (options) => {
      calls.push(['profileContext', options])
      return {
        contactBook: { ownerProfileId: 'owner-1' },
        profile: { id: 'profile-1' },
        saveContactBook: () => {}
      }
    },
    createShareQrOutputs: ({ profile }) => ({
      homeUri: `kepos://home/${profile.id}`,
      profileUri: `kepos://profile/${profile.id}`
    }),
    storageBasePath: '/user-data/kepos/v1'
  })

  await Promise.resolve()

  assert.equal(typeof session.backendHost.bridge.dispatch, 'function')
  assert.equal(calls[0].storageBasePath, '/user-data/kepos/v1')
  assert.deepEqual(emitted, [
    ['desktopStateChanged', { notice: 'Ready.' }],
    ['contactBookChanged', { ownerProfileId: 'owner-1' }],
    ['dmMessageReceived', { messages: ['persisted request'] }],
    [
      'shareQrOutputsChanged',
      { homeUri: 'kepos://home/profile-1', profileUri: 'kepos://profile/profile-1' }
    ]
  ])

  calls[0].getProfileContext('Ada')
  calls[0].setContextFormDraft({ trustAlias: '', trustQrUri: '' })
  calls[0].setDirectComposerRecipient('friend-1')
  calls[0].setNotice('Ready.')
  calls[0].onChanged()
  await Promise.resolve()

  assert.deepEqual(calls.slice(1), [
    [
      'profileContext',
      { avatarUri: '', displayName: 'Desktop', storageBasePath: '/user-data/kepos/v1' }
    ],
    [
      'profileContext',
      { avatarUri: '', displayName: 'Desktop', storageBasePath: '/user-data/kepos/v1' }
    ],
    [
      'profileContext',
      { avatarUri: '', displayName: 'Ada', storageBasePath: '/user-data/kepos/v1' }
    ],
    ['setDirectComposerRecipient', 'friend-1'],
    ['updateState'],
    [
      'profileContext',
      { avatarUri: '', displayName: 'Desktop', storageBasePath: '/user-data/kepos/v1' }
    ],
    [
      'profileContext',
      { avatarUri: '', displayName: 'Desktop', storageBasePath: '/user-data/kepos/v1' }
    ]
  ])
  assert.deepEqual(emitted, [
    ['desktopStateChanged', { notice: 'Ready.' }],
    ['contactBookChanged', { ownerProfileId: 'owner-1' }],
    ['dmMessageReceived', { messages: ['persisted request'] }],
    [
      'shareQrOutputsChanged',
      { homeUri: 'kepos://home/profile-1', profileUri: 'kepos://profile/profile-1' }
    ],
    ['contextFormDraftChanged', { trustAlias: '', trustQrUri: '' }],
    ['directComposerRecipientChanged', 'friend-1'],
    ['desktopStateChanged', { notice: 'Ready.' }],
    ['contactBookChanged', { ownerProfileId: 'owner-1' }],
    ['dmMessageReceived', { messages: ['persisted request'] }],
    [
      'shareQrOutputsChanged',
      { homeUri: 'kepos://home/profile-1', profileUri: 'kepos://profile/profile-1' }
    ]
  ])
})

test('desktop main backend session publishes restored outgoing friend requests on startup', () => {
  const emitted = []
  const restoredBook = recordOutgoingFriendRequest(
    createContactBook({ ownerProfileId: 'owner-1' }),
    {
      alias: 'Ada',
      profileId: 'profile-b',
      requestedAt: 1000,
      requestId: 'request-1',
      source: 'profile_qr',
      text: 'hello'
    }
  )

  createDesktopMainBackendSession({
    createBackendSession: () => ({
      backendHost: {
        bridge: {
          dispatch: () => undefined,
          emit: (event, payload) => emitted.push([event, payload]),
          subscribe: () => () => {}
        }
      }
    }),
    createControllerState: () => createControllerState([]),
    createProfileContext: () => ({
      contactBook: restoredBook,
      profile: { id: 'profile-1' },
      saveContactBook: () => {}
    }),
    createShareQrOutputs: () => ({}),
    storageBasePath: '/user-data/kepos/v1'
  })

  const publishedBook = emitted.find(([event]) => event === 'contactBookChanged')[1]

  assert.equal(publishedBook.outgoingRequestsByProfileId.get('profile-b').requestId, 'request-1')
  assert.equal(publishedBook.outgoingRequestsByProfileId.get('profile-b').text, 'hello')
})

test('desktop main backend session passes current avatar media into profile context', async () => {
  const avatarMedia = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1234,
    mimeType: 'image/png',
    sha256Hex: () => 'b'.repeat(64)
  })
  const calls = []
  const emitted = []

  createDesktopMainBackendSession({
    createBackendSession: (options) => {
      calls.push(options)
      options.controllerState.setCurrentAvatarMedia(avatarMedia)
      options.controllerState.setCurrentAvatarUri(avatarMedia.uri)
      options.onChanged()
      return {
        backendHost: {
          bridge: {
            dispatch: () => undefined,
            emit: (event, payload) => emitted.push([event, payload]),
            subscribe: () => () => {}
          }
        }
      }
    },
    createControllerState: () => createControllerState(calls),
    createProfileContext: (options) => {
      calls.push(['profileContext', options])
      return {
        contactBook: { ownerProfileId: 'owner-1' },
        profile: {
          id: 'profile-1',
          avatarMedia: options.avatarMedia,
          avatarUri: options.avatarUri
        },
        saveContactBook: () => {}
      }
    },
    createShareQrOutputs: ({ profile }) => ({
      profileAvatarMedia: profile.avatarMedia,
      profileUri: profile.avatarUri
    }),
    storageBasePath: '/user-data/kepos/v1'
  })

  await Promise.resolve()

  assert.equal(
    calls.some(
      (call) =>
        Array.isArray(call) &&
        call[0] === 'profileContext' &&
        call[1].avatarMedia?.digest === avatarMedia.digest &&
        call[1].avatarUri === avatarMedia.uri
    ),
    true
  )
  assert.equal(
    emitted.some(
      ([event, payload]) =>
        event === 'shareQrOutputsChanged' &&
        payload.profileAvatarMedia?.digest === avatarMedia.digest
    ),
    true
  )
})

function createControllerState(calls) {
  let avatarMedia = null
  let avatarUri = ''
  return {
    getCurrentAvatarMedia: () => avatarMedia,
    getCurrentAvatarUri: () => avatarUri,
    getCurrentDisplayName: () => 'Desktop',
    getDmSession: () => ({ messages: ['persisted request'] }),
    getState: () => ({ notice: 'Ready.' }),
    setDirectComposerRecipient: (profileId) =>
      calls.push(['setDirectComposerRecipient', profileId]),
    setCurrentAvatarMedia: (nextAvatarMedia) => {
      avatarMedia = nextAvatarMedia || null
    },
    setCurrentAvatarUri: (nextAvatarUri = '') => {
      avatarUri = nextAvatarUri
    },
    updateState: () => calls.push(['updateState'])
  }
}
