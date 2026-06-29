import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopBackendSubscriptions } from '../src/desktop-backend-subscriptions.js'
import { createDesktopState } from '../src/desktop-state.ts'

function createBackendClient() {
  const handlers = new Map()
  const subscriptions = []

  return {
    backendClient: {
      subscribe(event, handler) {
        handlers.set(event, handler)
        const unsubscribe = () => subscriptions.push(['unsubscribe', event])
        subscriptions.push(['subscribe', event])
        return unsubscribe
      }
    },
    emit(event, payload) {
      handlers.get(event)?.(payload)
    },
    subscriptions
  }
}

test('desktop backend subscriptions update renderer snapshots from backend events', () => {
  const { backendClient, emit, subscriptions } = createBackendClient()
  const renders = []
  const errors = []
  let contactBook = null
  let contextFormDraft = null
  let directComposerRecipient = 'friend-old'
  let dmSession = null
  let homeSession = null
  let shareQrOutputs = null
  let state = createDesktopState()

  const unsubscribe = createDesktopBackendSubscriptions({
    backendClient,
    getState: () => state,
    onError: (error) => errors.push(error),
    onRender: () => renders.push('render'),
    setContactBook: (nextContactBook) => {
      contactBook = nextContactBook
    },
    setContextFormDraft: (draft) => {
      contextFormDraft = draft
    },
    setDirectComposerRecipient: (profileId) => {
      directComposerRecipient = profileId
    },
    setDmSession: (nextSession) => {
      dmSession = nextSession
    },
    setHomeSession: (nextSession) => {
      homeSession = nextSession
    },
    setShareQrOutputs: (nextOutputs) => {
      shareQrOutputs = nextOutputs
    },
    setState: (nextState) => {
      state = nextState
    }
  })

  emit('homeMessageReceived', { messages: ['home'] })
  emit('contactBookChanged', { ownerProfileId: 'owner-1' })
  emit('contextFormDraftChanged', { trustAlias: '', trustQrUri: '' })
  emit('desktopStateChanged', { ...state, mode: 'host', notice: 'Home joined.', view: 'room' })
  emit('directComposerRecipientChanged', '')
  emit('dmMessageReceived', { messages: ['dm'] })
  emit('shareQrOutputsChanged', { homeUri: 'kepos://home', profileUri: 'kepos://profile' })
  emit('treeholeStateChanged', { canPost: false, posts: [], status: 'ready' })
  emit('peerCountChanged', { peers: 3 })
  emit('transportDebugChanged', { stage: 'flushed' })
  emit('errorReceived', new Error('failed'))
  unsubscribe()

  assert.deepEqual(contactBook, { ownerProfileId: 'owner-1' })
  assert.deepEqual(contextFormDraft, { trustAlias: '', trustQrUri: '' })
  assert.equal(directComposerRecipient, '')
  assert.deepEqual(homeSession, { messages: ['home'] })
  assert.deepEqual(dmSession, { messages: ['dm'] })
  assert.deepEqual(shareQrOutputs, { homeUri: 'kepos://home', profileUri: 'kepos://profile' })
  assert.equal(state.mode, 'host')
  assert.equal(state.notice, 'Home joined.')
  assert.equal(state.view, 'room')
  assert.equal(state.treeholeStatus, 'ready')
  assert.equal(state.treeholeCanPost, false)
  assert.equal(state.peers, 3)
  assert.deepEqual(state.transportDebug, { stage: 'flushed' })
  assert.equal(errors[0].message, 'failed')
  assert.deepEqual(renders, [
    'render',
    'render',
    'render',
    'render',
    'render',
    'render',
    'render',
    'render',
    'render',
    'render'
  ])
  assert.deepEqual(subscriptions, [
    ['subscribe', 'homeMessageReceived'],
    ['subscribe', 'contactBookChanged'],
    ['subscribe', 'contextFormDraftChanged'],
    ['subscribe', 'desktopStateChanged'],
    ['subscribe', 'directComposerRecipientChanged'],
    ['subscribe', 'dmMessageReceived'],
    ['subscribe', 'treeholeStateChanged'],
    ['subscribe', 'peerCountChanged'],
    ['subscribe', 'transportDebugChanged'],
    ['subscribe', 'shareQrOutputsChanged'],
    ['subscribe', 'errorReceived'],
    ['unsubscribe', 'homeMessageReceived'],
    ['unsubscribe', 'contactBookChanged'],
    ['unsubscribe', 'contextFormDraftChanged'],
    ['unsubscribe', 'desktopStateChanged'],
    ['unsubscribe', 'directComposerRecipientChanged'],
    ['unsubscribe', 'dmMessageReceived'],
    ['unsubscribe', 'treeholeStateChanged'],
    ['unsubscribe', 'peerCountChanged'],
    ['unsubscribe', 'transportDebugChanged'],
    ['unsubscribe', 'shareQrOutputsChanged'],
    ['unsubscribe', 'errorReceived']
  ])
})

test('desktop backend subscriptions preserve selected tab across backend state snapshots', () => {
  const { backendClient, emit } = createBackendClient()
  let state = { ...createDesktopState(), activeTab: 'treehole' }

  createDesktopBackendSubscriptions({
    backendClient,
    getState: () => state,
    onError: () => {},
    onRender: () => {},
    setContactBook: () => {},
    setDmSession: () => {},
    setHomeSession: () => {},
    setState: (nextState) => {
      state = nextState
    }
  })

  emit('desktopStateChanged', {
    ...createDesktopState(),
    mode: 'host',
    notice: 'Home joined.',
    view: 'room'
  })

  assert.equal(state.activeTab, 'treehole')
  assert.equal(state.mode, 'host')
  assert.equal(state.notice, 'Home joined.')
  assert.equal(state.view, 'room')
})
