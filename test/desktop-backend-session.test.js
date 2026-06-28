import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createDesktopBackendSession } from '../src/desktop-backend-session.js'

test('desktop backend session composes actions and runtime host behind one boundary', () => {
  const createdHosts = []
  const controllerState = createControllerState()
  const changes = []
  const session = createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createLocalBackendHost: (options) => {
      createdHosts.push(options)
      return {
        bridge: { label: 'bridge' },
        dmRuntime: {
          label: 'dm',
          loadThreads: () => [],
          replaceThreads: () => {},
          start: () => ({ id: 'dm-session' })
        },
        homeRuntime: { isJoined: () => false },
        runtime: {
          closeAll: () => Promise.resolve(),
          configure: (context) => createdHosts.push(context)
        },
        treeholeRuntime: { canPost: () => false }
      }
    },
    getCurrentDisplayName: () => 'Desktop',
    getProfileContext: () => createProfileContext(),
    onChanged: () => changes.push('changed'),
    setContextFormDraft: () => {},
    setDirectComposerRecipient: () => {},
    setNotice: () => {},
    shortenProfileId: (value) => value.slice(0, 8),
    storageBasePath: '/user-data/kepos/v1',
    updateState: (updater) => controllerState.updateState(updater)
  })

  assert.equal(session.backendHost.bridge.label, 'bridge')
  assert.equal(session.dmRuntime.label, 'dm')
  assert.equal(createdHosts[0].runtimeOptions.storageBasePath, '/user-data/kepos/v1')
  assert.equal(typeof createdHosts[0].actions.sendHomeMessage, 'function')
  assert.equal(typeof createdHosts[0].actions.updateDisplayName, 'function')
  createdHosts[0].actions.updateDisplayName({ displayName: 'Ada' })
  assert.equal(controllerState.getCurrentDisplayName(), 'Ada')
  assert.deepEqual(changes, ['changed'])
  assert.equal(typeof createdHosts[0].runtimeOptions.onHomeControl, 'function')
  assert.equal(typeof session.configureTreeholeRuntime, 'function')
  assert.equal(typeof session.openTreehole, 'function')
  assert.equal(typeof session.roomActions.leaveHome, 'function')
})

test('desktop backend session starts direct messages before joining a home', async () => {
  const controllerState = createControllerState()
  const changes = []
  const starts = []

  createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createLocalBackendHost: () => ({
      bridge: { label: 'bridge' },
      dmRuntime: {
        loadThreads: () => [],
        replaceThreads: () => {},
        start: (payload) => {
          starts.push(payload)
          return { id: 'restored-dm-session', messages: [{ text: 'saved request' }] }
        }
      },
      homeRuntime: { isJoined: () => false },
      runtime: {
        closeAll: () => Promise.resolve(),
        configure: () => {}
      },
      treeholeRuntime: { canPost: () => false }
    }),
    getCurrentDisplayName: () => 'Desktop',
    getProfileContext: () => createProfileContext(),
    onChanged: () => changes.push('changed'),
    setContextFormDraft: () => {},
    setDirectComposerRecipient: () => {},
    setNotice: () => {},
    shortenProfileId: (value) => value.slice(0, 8),
    storageBasePath: '/user-data/kepos/v1',
    updateState: (updater) => controllerState.updateState(updater)
  })
  await Promise.resolve()

  assert.equal(controllerState.getDmSession().id, 'restored-dm-session')
  assert.deepEqual(starts, [
    {
      nick: 'Desktop',
      profile: createProfileContext().profile,
      storage: createProfileContext().storage
    }
  ])
  assert.deepEqual(changes, ['changed'])
})

test('desktop backend session keeps runtime DM changes in controller state', () => {
  const controllerState = createControllerState()
  const changes = []
  const createdHosts = []

  createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createLocalBackendHost: (options) => {
      createdHosts.push(options)
      return {
        bridge: { label: 'bridge' },
        dmRuntime: {
          loadThreads: () => [],
          replaceThreads: () => {},
          start: () => ({ id: 'restored-dm-session' })
        },
        homeRuntime: { isJoined: () => false },
        runtime: {
          closeAll: () => Promise.resolve(),
          configure: () => {}
        },
        treeholeRuntime: { canPost: () => false }
      }
    },
    getCurrentDisplayName: () => 'Desktop',
    getProfileContext: () => createProfileContext(),
    onChanged: () => changes.push('changed'),
    setContextFormDraft: () => {},
    setDirectComposerRecipient: () => {},
    setNotice: () => {},
    shortenProfileId: (value) => value.slice(0, 8),
    storageBasePath: '/user-data/kepos/v1',
    updateState: (updater) => controllerState.updateState(updater)
  })

  createdHosts[0].runtimeOptions.onDmSessionChanged({
    id: 'runtime-dm-session',
    messages: [{ text: 'runtime request' }]
  })

  assert.equal(controllerState.getDmSession().id, 'runtime-dm-session')
  assert.deepEqual(changes, ['changed'])
})

test('desktop controller delegates backend session composition to a boundary', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const localBackendSource = await readFile(
    new URL('../desktop/local-backend.js', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(source, /import \{ createDesktopBackendSession \}/)
  assert.match(source, /function getLocalBackendSession\(\)/)
  assert.match(source, /loadLocalBackendSessionFactory\(\)/)
  assert.match(source, /require\('\.\/local-backend\.bundle\.cjs'\)/)
  assert.match(localBackendSource, /createDesktopBackendSession/)
  assert.match(localBackendSource, /export function createLocalBackendSession/)
  assert.match(source, /mode: globalThis\.keposBackend \? 'preload' : 'auto'/)
  assert.match(
    source,
    /createLocalBackend: \(\) => getLocalBackendSession\(\)\.backendHost\.bridge/
  )
  assert.doesNotMatch(source, /createDesktopMessageActions/)
  assert.doesNotMatch(source, /createDesktopMessageRequestActions/)
  assert.doesNotMatch(source, /createDesktopRoomActions/)
  assert.doesNotMatch(source, /createDesktopTrustActions/)
  assert.doesNotMatch(source, /createDesktopBackendActions/)
  assert.doesNotMatch(source, /createDesktopLocalBackendHost/)
})

function createControllerState() {
  let state = {
    treeholeCanPost: false,
    treeholePosts: [],
    treeholeStatus: 'closed'
  }
  let dmSession = null
  let homeJoinDetails = null
  let currentDisplayName = 'Desktop'
  let session = null

  return {
    getDirectComposerRecipientProfileId: () => '',
    getCurrentDisplayName: () => currentDisplayName,
    getDmSession: () => dmSession,
    getHomeJoinDetails: () => homeJoinDetails,
    getSession: () => session,
    getState: () => state,
    setDirectComposerRecipient: () => {},
    setCurrentDisplayName: (displayName = 'Desktop') => {
      currentDisplayName = displayName.trim() || 'Desktop'
    },
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
    }
  }
}

function createProfileContext() {
  return {
    contactBook: {
      contactsByProfileId: new Map(),
      ownerProfileId: 'a'.repeat(64)
    },
    profile: {
      dmEncryptionKeyPair: {
        publicKey: 'b'.repeat(64),
        secretKey: 'c'.repeat(64)
      },
      homeRoom: { roomKey: 'd'.repeat(64) },
      id: 'a'.repeat(64),
      identity: {
        publicKey: 'a'.repeat(64),
        secretKey: 'e'.repeat(64)
      }
    },
    saveContactBook: () => {}
  }
}
