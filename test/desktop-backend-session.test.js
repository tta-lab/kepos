import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createDesktopBackendSession } from '../src/desktop-backend-session.js'

test('desktop backend session composes actions and runtime host behind one boundary', () => {
  const createdHosts = []
  const controllerState = createControllerState()
  const session = createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createLocalBackendHost: (options) => {
      createdHosts.push(options)
      return {
        bridge: { label: 'bridge' },
        dmRuntime: { label: 'dm', loadThreads: () => [], replaceThreads: () => {} },
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
    onChanged: () => {},
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
  assert.equal(typeof createdHosts[0].runtimeOptions.onHomeControl, 'function')
  assert.equal(typeof session.configureTreeholeRuntime, 'function')
  assert.equal(typeof session.openTreehole, 'function')
  assert.equal(typeof session.roomActions.leaveHome, 'function')
})

test('desktop controller delegates backend session composition to a boundary', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopBackendSession/)
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
  let session = null

  return {
    getDirectComposerRecipientProfileId: () => '',
    getDmSession: () => dmSession,
    getHomeJoinDetails: () => homeJoinDetails,
    getSession: () => session,
    getState: () => state,
    setDirectComposerRecipient: () => {},
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
