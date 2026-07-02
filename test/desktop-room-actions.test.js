import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopRoomActions } from '../src/desktop-room-actions.ts'
import { createSignedHomeAddressPayload } from '../src/signed-qr-payload.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

function createHarness(overrides = {}) {
  const calls = []
  let state = { treeholePosts: [], treeholeStatus: 'idle', treeholeCanPost: false }
  let session = null
  let homeJoinDetails = null
  const homeRuntime = {
    join(payload) {
      calls.push(['home.join', payload])
    },
    requestHomeHello() {
      calls.push(['home.requestHomeHello'])
    }
  }
  const actions = createDesktopRoomActions({
    applyHomeQr: ({ uri }) => ({
      address: `address:${uri}`,
      ownerProfileId: 'owner-from-qr',
      policy: 'trusted',
      roomKey: `room:${uri}`
    }),
    closeHome: () => calls.push(['runtime.closeHome']),
    configureTreeholeRuntime: () => calls.push(['treehole.configure']),
    createHomeJoinDetails: ({ homeAddress, mode, nick, roomKey }) => ({
      homeJoinDetails: {
        ownerProfileId: homeAddress?.ownerProfileId || null,
        profileId: 'profile-1',
        roomKey: homeAddress?.roomKey || roomKey || 'created-room'
      },
      mode,
      session: { id: 'home-session', nick }
    }),
    getCurrentDisplayName: () => 'Neil',
    getHomeRuntime: () => homeRuntime,
    getProfileContext: (displayName = 'Neil') => ({
      contactBook: { ownerProfileId: 'profile-1' },
      profile: {
        displayName,
        id: 'profile-1'
      },
      saveContactBook: (book) => calls.push(['contactBook.save', book]),
      storage: { key: 'storage' }
    }),
    getTreeholeRuntime: () => ({
      canPost: () => true
    }),
    onChanged: () => calls.push(['render']),
    openTreehole: (bootstrapKey, scope) => calls.push(['treehole.open', bootstrapKey, scope]),
    setContextFormDraft: (draft) => calls.push(['form.draft', draft]),
    setHomeJoinDetails: (nextDetails) => {
      homeJoinDetails = nextDetails
    },
    setSession: (nextSession) => {
      session = nextSession
    },
    updateState: (updater) => {
      state = updater(state)
    },
    ...overrides
  })

  return {
    actions,
    calls,
    get homeJoinDetails() {
      return homeJoinDetails
    },
    get session() {
      return session
    },
    get state() {
      return state
    }
  }
}

test('desktop room actions create a host home without restarting social runtimes', async () => {
  const harness = createHarness()

  await harness.actions.joinHome({ createTreehole: true, displayName: 'Ada', mode: 'host' })

  assert.deepEqual(harness.homeJoinDetails, {
    ownerProfileId: null,
    profileId: 'profile-1',
    roomKey: 'created-room'
  })
  assert.deepEqual(harness.session, { id: 'home-session', nick: 'Ada' })
  assert.equal(harness.state.view, 'room')
  assert.equal(harness.state.notice, 'Home joined.')
  assert.deepEqual(harness.calls, [
    ['runtime.closeHome'],
    ['treehole.configure'],
    ['render'],
    ['form.draft', { roomKey: 'created-room' }],
    ['treehole.configure'],
    ['render'],
    [
      'home.join',
      { homeJoinDetails: { ownerProfileId: null, profileId: 'profile-1', roomKey: 'created-room' } }
    ],
    ['treehole.open', null, 'profile'],
    ['home.requestHomeHello'],
    ['render']
  ])
})

test('desktop room actions attach host direct transport when configured', async () => {
  const harness = createHarness({
    getDirectTransportConfig: ({ mode }) =>
      mode === 'host' ? { advertisedHost: '192.168.1.203', listenHost: '0.0.0.0' } : null
  })

  await harness.actions.joinHome({ createTreehole: true, displayName: 'Ada', mode: 'host' })

  assert.deepEqual(harness.homeJoinDetails.directTransport, {
    advertisedHost: '192.168.1.203',
    listenHost: '0.0.0.0',
    mode: 'host'
  })
})

test('desktop room actions join a home from QR details', async () => {
  const harness = createHarness()

  await harness.actions.joinHomeUri({ displayName: 'Friend', uri: 'kepos://home' })

  assert.equal(harness.homeJoinDetails.ownerProfileId, 'owner-from-qr')
  assert.equal(harness.homeJoinDetails.roomKey, 'room:kepos://home')
  assert.equal(harness.state.treeholeStatus, 'waiting-for-bootstrap')
  assert.equal(harness.state.treeholeCanPost, true)
  assert.deepEqual(
    harness.calls.filter(([name]) => name === 'form.draft'),
    [
      ['form.draft', { homeQrUri: '' }],
      ['form.draft', { roomKey: 'room:kepos://home' }]
    ]
  )
  assert.deepEqual(
    harness.calls.filter(([name]) => name === 'treehole.open' || name === 'home.requestHomeHello'),
    []
  )
})

test('desktop room actions persist a trusted contact descriptor from Home QR', async () => {
  const savedBook = { ownerProfileId: 'profile-1', saved: true }
  const harness = createHarness({
    applyHomeQr: ({ uri }) => ({
      address: `address:${uri}`,
      book: savedBook,
      ownerProfileId: 'owner-from-qr',
      policy: 'trusted_only',
      roomKey: `room:${uri}`
    })
  })

  await harness.actions.joinHomeUri({ displayName: 'Friend', uri: 'kepos://home' })

  assert.deepEqual(
    harness.calls.filter(([name]) => name === 'contactBook.save'),
    [['contactBook.save', savedBook]]
  )
})

test('desktop room actions enter a trusted contact Home from saved descriptor', async () => {
  const friend = createSigningKeyPair()
  const descriptor = createSignedHomeAddressPayload({
    address: 'a'.repeat(64),
    createdAt: 1000,
    identity: friend,
    policy: 'trusted_only',
    roomKey: 'b'.repeat(64)
  })
  const contactBook = {
    contactsByProfileId: new Map([
      [
        friend.publicKey,
        {
          alias: 'Ada',
          homeAddress: descriptor.address,
          homePolicy: 'trusted_only',
          homeRoomKey: descriptor.roomKey,
          profileId: friend.publicKey,
          proof: descriptor.proof,
          trustedAt: 1000
        }
      ]
    ]),
    ownerProfileId: 'profile-1'
  }
  const harness = createHarness({
    getProfileContext: (displayName = 'Neil') => ({
      contactBook,
      profile: {
        displayName,
        id: 'profile-1'
      },
      saveContactBook: (book) => harness.calls.push(['contactBook.save', book]),
      storage: { key: 'storage' }
    })
  })

  await harness.actions.enterContactHome({ displayName: 'Friend', profileId: friend.publicKey })

  assert.equal(harness.homeJoinDetails.ownerProfileId, friend.publicKey)
  assert.equal(harness.homeJoinDetails.roomKey, 'b'.repeat(64))
  assert.equal(harness.state.treeholeStatus, 'waiting-for-bootstrap')
})

test('desktop room actions reject a saved contact Home descriptor with invalid proof', async () => {
  const friend = createSigningKeyPair()
  const descriptor = createSignedHomeAddressPayload({
    address: 'a'.repeat(64),
    createdAt: 1000,
    identity: friend,
    policy: 'trusted_only',
    roomKey: 'b'.repeat(64)
  })
  const contactBook = {
    contactsByProfileId: new Map([
      [
        friend.publicKey,
        {
          alias: 'Ada',
          homeAddress: descriptor.address,
          homePolicy: 'trusted_only',
          homeRoomKey: 'c'.repeat(64),
          profileId: friend.publicKey,
          proof: descriptor.proof,
          trustedAt: 1000
        }
      ]
    ]),
    ownerProfileId: 'profile-1'
  }
  const harness = createHarness({
    getProfileContext: (displayName = 'Neil') => ({
      contactBook,
      profile: {
        displayName,
        id: 'profile-1'
      },
      saveContactBook: (book) => harness.calls.push(['contactBook.save', book]),
      storage: { key: 'storage' }
    })
  })

  await assert.rejects(
    () => harness.actions.enterContactHome({ displayName: 'Friend', profileId: friend.publicKey }),
    /Invalid saved Home descriptor/
  )
  assert.equal(harness.homeJoinDetails, null)
})

test('desktop room actions reject contact Home entry without a saved descriptor', async () => {
  const contactBook = {
    contactsByProfileId: new Map([
      [
        'profile-a',
        {
          alias: 'Ada',
          profileId: 'profile-a',
          trustedAt: 1000
        }
      ]
    ]),
    ownerProfileId: 'profile-1'
  }
  const harness = createHarness({
    getProfileContext: (displayName = 'Neil') => ({
      contactBook,
      profile: {
        displayName,
        id: 'profile-1'
      },
      saveContactBook: (book) => harness.calls.push(['contactBook.save', book]),
      storage: { key: 'storage' }
    })
  })

  await assert.rejects(
    () => harness.actions.enterContactHome({ displayName: 'Friend', profileId: 'profile-a' }),
    /saved Home descriptor/
  )
})

test('desktop room actions leave home and reset local state', async () => {
  const harness = createHarness({
    createInitialState: () => ({ notice: 'Show My QR or add a friend.', view: 'lobby' })
  })

  await harness.actions.leaveHome()

  assert.equal(harness.session, null)
  assert.equal(harness.homeJoinDetails, null)
  assert.deepEqual(harness.state, { notice: 'Show My QR or add a friend.', view: 'lobby' })
  assert.deepEqual(harness.calls, [
    ['runtime.closeHome'],
    ['treehole.configure'],
    ['treehole.open', null, 'profile'],
    ['render']
  ])
})
