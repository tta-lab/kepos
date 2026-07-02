import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createDesktopBackendSession } from '../src/desktop-backend-session.ts'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { createMessageRequest } from '../src/message-request.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

test('desktop backend session composes actions and runtime host behind one boundary', () => {
  const createdHosts = []
  const controllerState = createControllerState()
  const changes = []
  const profileRequestRuntimeFactory = createFakeProfileRequestRuntimeFactory()
  const session = createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createProfileRequestRuntime: profileRequestRuntimeFactory,
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
        treeholeRuntime: { canPost: () => false, open: () => {} }
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
  assert.equal(typeof createdHosts[0].runtimeOptions.onVerifiedHello, 'function')
  assert.equal(typeof session.configureTreeholeRuntime, 'function')
  assert.equal(typeof session.openTreehole, 'function')
  assert.equal(typeof session.roomActions.leaveHome, 'function')
})

test('desktop backend session wires configured direct transport into room actions and runtime', async () => {
  const controllerState = createControllerState()
  const createdHosts = []
  const homeJoins = []
  const profileRequestRuntimeFactory = createFakeProfileRequestRuntimeFactory()

  createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createProfileRequestRuntime: profileRequestRuntimeFactory,
    createLocalBackendHost: (options) => {
      createdHosts.push(options)
      return {
        bridge: { label: 'bridge' },
        dmRuntime: {
          loadThreads: () => [],
          replaceThreads: () => {},
          start: () => ({ id: 'dm-session' })
        },
        homeRuntime: {
          isJoined: () => false,
          join: (payload) => homeJoins.push(payload),
          requestHomeHello: () => {}
        },
        runtime: {
          closeAll: () => Promise.resolve(),
          configure: () => {}
        },
        treeholeRuntime: { canPost: () => false, open: () => {} }
      }
    },
    env: {
      KEPOS_DIRECT_ADVERTISED_HOST: '192.168.1.203',
      KEPOS_DIRECT_LISTEN_HOST: '0.0.0.0'
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

  await createdHosts[0].actions.joinHome({ createTreehole: true, mode: 'host' })

  assert.equal(typeof createdHosts[0].runtimeOptions.createDirectTransport, 'function')
  const directTransport = createdHosts[0].runtimeOptions.createDirectTransport({
    addPeer: () => {},
    advertisedHost: '127.0.0.1',
    listenHost: '127.0.0.1',
    mode: 'host'
  })
  const directEndpoint = await directTransport.ready
  await directTransport.close()

  assert.equal(directEndpoint.host, '127.0.0.1')
  assert.equal(Number.isInteger(directEndpoint.port), true)
  assert.deepEqual(homeJoins[0].homeJoinDetails.directTransport, {
    advertisedHost: '192.168.1.203',
    listenHost: '0.0.0.0',
    mode: 'host'
  })
})

test('desktop backend session starts direct messages before joining a home', async () => {
  const controllerState = createControllerState()
  const changes = []
  const starts = []
  const profileRequestRuntimes = []

  createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createProfileRequestRuntime: createFakeProfileRequestRuntimeFactory(profileRequestRuntimes),
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
  await flushAsync()

  assert.equal(controllerState.getDmSession().id, 'restored-dm-session')
  assert.equal(profileRequestRuntimes[0].opened, true)
  assert.equal(profileRequestRuntimes[0].options.localProfileId, 'a'.repeat(64))
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
  const profileRequestRuntimeFactory = createFakeProfileRequestRuntimeFactory()

  createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createProfileRequestRuntime: profileRequestRuntimeFactory,
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

test('desktop backend session persists outgoing friend requests from message actions', async () => {
  const controllerState = createControllerState()
  const createdHosts = []
  const savedBooks = []
  const context = createProfileContext()
  const profileRequestRuntimes = []
  context.contactBook = {
    contactsByProfileId: new Map(),
    outgoingRequestsByProfileId: new Map(),
    ownerProfileId: 'a'.repeat(64),
    pendingRequestsByProfileId: new Map()
  }
  context.saveContactBook = (book) => savedBooks.push(book)

  createDesktopBackendSession({
    controllerState,
    createId: (() => {
      let id = 0
      return () => `id-${id++}`
    })(),
    createProfileRequestRuntime: createFakeProfileRequestRuntimeFactory(profileRequestRuntimes),
    createLocalBackendHost: (options) => {
      createdHosts.push(options)
      return {
        bridge: { label: 'bridge' },
        dmRuntime: {
          loadThreads: () => [],
          replaceThreads: () => {},
          sendMessageOrRequest(payload) {
            return {
              kind: 'request',
              request: {
                createdAt: 1000,
                fromProfileId: 'a'.repeat(64),
                requestId: payload.requestId,
                senderEncryptionPublicKey: 'b'.repeat(64),
                text: payload.text,
                toProfileId: payload.toProfileId,
                type: 'kepos.message.request.v1'
              }
            }
          },
          start: () => ({ id: 'restored-dm-session', messages: [] })
        },
        homeRuntime: {
          broadcastControl() {},
          isJoined: () => true
        },
        runtime: {
          closeAll: () => Promise.resolve(),
          configure: () => {}
        },
        treeholeRuntime: { canPost: () => false }
      }
    },
    getCurrentDisplayName: () => 'Desktop',
    getProfileContext: () => context,
    onChanged: () => {},
    setContextFormDraft: () => {},
    setDirectComposerRecipient: () => {},
    setNotice: () => {},
    shortenProfileId: (value) => value.slice(0, 8),
    storageBasePath: '/user-data/kepos/v1',
    updateState: (updater) => controllerState.updateState(updater)
  })
  await flushAsync()

  await createdHosts[0].actions.sendDmMessage({
    text: 'hello',
    toProfileId: 'b'.repeat(64)
  })

  assert.equal(savedBooks.length, 1)
  assert.equal(savedBooks[0].outgoingRequestsByProfileId.get('b'.repeat(64)).requestId, 'id-1')
  assert.equal(profileRequestRuntimes[0].sent[0].requestId, 'id-1')
})

test('desktop backend session records incoming profile-level friend requests', async () => {
  const controllerState = createControllerState()
  const savedBooks = []
  const incomingRequests = []
  const context = createProfileContext()
  const profileRequestRuntimes = []
  const remote = createSigningKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: remote,
    requestId: 'request-1',
    senderEncryptionPublicKey: createDmEncryptionKeyPair().publicKey,
    text: 'hello',
    toProfileId: 'a'.repeat(64)
  })
  context.contactBook = {
    contactsByProfileId: new Map(),
    outgoingRequestsByProfileId: new Map(),
    ownerProfileId: 'a'.repeat(64),
    pendingRequestsByProfileId: new Map()
  }
  context.saveContactBook = (book) => savedBooks.push(book)

  createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createProfileRequestRuntime: createFakeProfileRequestRuntimeFactory(profileRequestRuntimes),
    createLocalBackendHost: () => ({
      bridge: { label: 'bridge' },
      dmRuntime: {
        appendIncomingRequest: (nextRequest) => incomingRequests.push(nextRequest),
        getSession: () => controllerState.getDmSession(),
        loadThreads: () => [],
        replaceThreads: () => {},
        start: () => ({ id: 'restored-dm-session', localProfileId: 'a'.repeat(64), messages: [] })
      },
      homeRuntime: {
        broadcastControl() {},
        isJoined: () => false,
        sendControl() {}
      },
      runtime: {
        closeAll: () => Promise.resolve(),
        configure: () => {}
      },
      treeholeRuntime: { canPost: () => false }
    }),
    getCurrentDisplayName: () => 'Desktop',
    getProfileContext: () => context,
    onChanged: () => {},
    setContextFormDraft: () => {},
    setDirectComposerRecipient: () => {},
    setNotice: () => {},
    shortenProfileId: (value) => value.slice(0, 8),
    storageBasePath: '/user-data/kepos/v1',
    updateState: (updater) => controllerState.updateState(updater)
  })
  await flushAsync()

  profileRequestRuntimes[0].options.onRequest(request)
  await flushAsync()

  assert.equal(savedBooks.length, 1)
  assert.deepEqual(
    savedBooks[0].pendingRequestsByProfileId.get(remote.publicKey).requestId,
    'request-1'
  )
  assert.deepEqual(incomingRequests, [request])
})

test('desktop backend session keeps runtime transport debug in controller state', () => {
  const controllerState = createControllerState()
  const changes = []
  const createdHosts = []
  const profileRequestRuntimeFactory = createFakeProfileRequestRuntimeFactory()

  createDesktopBackendSession({
    controllerState,
    createId: () => 'id-1',
    createProfileRequestRuntime: profileRequestRuntimeFactory,
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

  createdHosts[0].runtimeOptions.onHomeDebugState({
    connections: 0,
    localPeers: 1,
    stage: 'flushed'
  })

  assert.deepEqual(controllerState.getState().transportDebug, {
    connections: 0,
    localPeers: 1,
    stage: 'flushed'
  })
  assert.equal(controllerState.getState().peers, 1)
  assert.deepEqual(changes, ['changed'])
})

test('desktop controller delegates backend session composition to a boundary', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const localBackendSource = await readFile(
    new URL('../desktop/local-backend.ts', import.meta.url),
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

test('desktop backend session keeps Home DM body fallback debug-only', async () => {
  const source = await readFile(
    new URL('../src/desktop-backend-session.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /KEPOS_ALLOW_HOME_DM_BODY_FALLBACK/)
  assert.match(source, /allowHomeDmBodyFallback,\s*\n\s*createId/)
  assert.match(source, /allowHomeDmBodyFallback,\s*\n\s*configureTreeholeRuntime/)
})

function createFakeProfileRequestRuntimeFactory(runtimes = []) {
  return (options) => {
    const runtime = {
      closed: false,
      opened: false,
      options,
      sent: [],
      async close() {
        runtime.closed = true
      },
      async open() {
        runtime.opened = true
      },
      send(request) {
        runtime.sent.push(request)
        options.onDeliveryState?.({
          requestId: request.requestId,
          state: 'sent',
          toProfileId: request.toProfileId
        })
        return { state: 'sent' }
      }
    }
    runtimes.push(runtime)
    return runtime
  }
}

function flushAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

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
      homeRoom: { ownerProfileId: 'a'.repeat(64), roomKey: 'd'.repeat(64) },
      id: 'a'.repeat(64),
      identity: {
        publicKey: 'a'.repeat(64),
        secretKey: 'e'.repeat(64)
      }
    },
    saveContactBook: () => {}
  }
}
