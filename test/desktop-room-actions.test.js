import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopRoomActions } from '../src/desktop-room-actions.js'

function createHarness(overrides = {}) {
  const calls = []
  let state = { treeholePosts: [], treeholeStatus: 'idle', treeholeCanPost: false }
  let session = null
  let dmSession = null
  let homeJoinDetails = null
  const homeRuntime = {
    join(payload) {
      calls.push(['home.join', payload])
    },
    requestHomeHello() {
      calls.push(['home.requestHomeHello'])
    }
  }
  const dmRuntime = {
    start(payload) {
      calls.push(['dm.start', payload])
      return { id: 'dm-session' }
    }
  }
  const actions = createDesktopRoomActions({
    applyHomeQr: ({ uri }) => ({
      address: `address:${uri}`,
      ownerProfileId: 'owner-from-qr',
      policy: 'trusted',
      roomKey: `room:${uri}`
    }),
    closeAll: () => calls.push(['runtime.closeAll']),
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
    getDmRuntime: () => dmRuntime,
    getHomeRuntime: () => homeRuntime,
    getProfileContext: (displayName = 'Neil') => ({
      contactBook: { ownerProfileId: 'profile-1' },
      profile: {
        displayName,
        id: 'profile-1'
      },
      storage: { key: 'storage' }
    }),
    getTreeholeRuntime: () => ({
      canPost: () => true
    }),
    onChanged: () => calls.push(['render']),
    openTreehole: (bootstrapKey) => calls.push(['treehole.open', bootstrapKey]),
    setContextFormDraft: (draft) => calls.push(['form.draft', draft]),
    setDmSession: (nextSession) => {
      dmSession = nextSession
    },
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
    get dmSession() {
      return dmSession
    },
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

test('desktop room actions create a host home and start runtimes', async () => {
  const harness = createHarness()

  await harness.actions.joinHome({ createTreehole: true, displayName: 'Ada', mode: 'host' })

  assert.deepEqual(harness.homeJoinDetails, {
    ownerProfileId: null,
    profileId: 'profile-1',
    roomKey: 'created-room'
  })
  assert.deepEqual(harness.session, { id: 'home-session', nick: 'Ada' })
  assert.deepEqual(harness.dmSession, { id: 'dm-session' })
  assert.equal(harness.state.view, 'room')
  assert.equal(harness.state.notice, 'Home joined.')
  assert.deepEqual(harness.calls, [
    ['runtime.closeAll'],
    ['treehole.configure'],
    ['render'],
    ['form.draft', { roomKey: 'created-room' }],
    ['treehole.configure'],
    [
      'dm.start',
      {
        nick: 'Ada',
        profile: { displayName: 'Ada', id: 'profile-1' },
        storage: { key: 'storage' }
      }
    ],
    ['render'],
    [
      'home.join',
      { homeJoinDetails: { ownerProfileId: null, profileId: 'profile-1', roomKey: 'created-room' } }
    ],
    ['treehole.open', undefined],
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

test('desktop room actions leave home and reset local state', async () => {
  const harness = createHarness({
    createInitialState: () => ({ notice: 'Create or join a home.', view: 'lobby' })
  })

  await harness.actions.leaveHome()

  assert.equal(harness.session, null)
  assert.equal(harness.dmSession, null)
  assert.equal(harness.homeJoinDetails, null)
  assert.deepEqual(harness.state, { notice: 'Create or join a home.', view: 'lobby' })
  assert.deepEqual(harness.calls, [['runtime.closeAll'], ['treehole.configure'], ['render']])
})
