import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopBackendSubscriptions } from '../src/desktop-backend-subscriptions.js'
import { createDesktopState } from '../src/desktop-state.js'

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
  let dmSession = null
  let homeSession = null
  let state = createDesktopState()

  const unsubscribe = createDesktopBackendSubscriptions({
    backendClient,
    getState: () => state,
    onError: (error) => errors.push(error),
    onRender: () => renders.push('render'),
    setContactBook: (nextContactBook) => {
      contactBook = nextContactBook
    },
    setDmSession: (nextSession) => {
      dmSession = nextSession
    },
    setHomeSession: (nextSession) => {
      homeSession = nextSession
    },
    setState: (nextState) => {
      state = nextState
    }
  })

  emit('homeMessageReceived', { messages: ['home'] })
  emit('contactBookChanged', { ownerProfileId: 'owner-1' })
  emit('desktopStateChanged', { ...state, mode: 'host', notice: 'Home joined.', view: 'room' })
  emit('dmMessageReceived', { messages: ['dm'] })
  emit('treeholeStateChanged', { canPost: false, posts: [], status: 'ready' })
  emit('peerCountChanged', { peers: 3 })
  emit('errorReceived', new Error('failed'))
  unsubscribe()

  assert.deepEqual(contactBook, { ownerProfileId: 'owner-1' })
  assert.deepEqual(homeSession, { messages: ['home'] })
  assert.deepEqual(dmSession, { messages: ['dm'] })
  assert.equal(state.mode, 'host')
  assert.equal(state.notice, 'Home joined.')
  assert.equal(state.view, 'room')
  assert.equal(state.treeholeStatus, 'ready')
  assert.equal(state.treeholeCanPost, false)
  assert.equal(state.peers, 3)
  assert.equal(errors[0].message, 'failed')
  assert.deepEqual(renders, ['render', 'render', 'render', 'render', 'render', 'render'])
  assert.deepEqual(subscriptions, [
    ['subscribe', 'homeMessageReceived'],
    ['subscribe', 'contactBookChanged'],
    ['subscribe', 'desktopStateChanged'],
    ['subscribe', 'dmMessageReceived'],
    ['subscribe', 'treeholeStateChanged'],
    ['subscribe', 'peerCountChanged'],
    ['subscribe', 'errorReceived'],
    ['unsubscribe', 'homeMessageReceived'],
    ['unsubscribe', 'contactBookChanged'],
    ['unsubscribe', 'desktopStateChanged'],
    ['unsubscribe', 'dmMessageReceived'],
    ['unsubscribe', 'treeholeStateChanged'],
    ['unsubscribe', 'peerCountChanged'],
    ['unsubscribe', 'errorReceived']
  ])
})
