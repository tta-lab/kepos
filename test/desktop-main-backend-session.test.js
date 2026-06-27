import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopMainBackendSession } from '../src/desktop-main-backend-session.js'

test('desktop main backend session uses file profile context and local backend bridge', () => {
  const calls = []
  const session = createDesktopMainBackendSession({
    createBackendSession: (options) => {
      calls.push(options)
      return {
        backendHost: {
          bridge: { dispatch: () => undefined, subscribe: () => () => {} }
        }
      }
    },
    createControllerState: () => createControllerState(calls),
    createId: () => 'id-1',
    createProfileContext: (options) => {
      calls.push(['profileContext', options])
      return { contactBook: {}, profile: {}, saveContactBook: () => {} }
    },
    storageBasePath: '/user-data/kepos/v1'
  })

  assert.equal(typeof session.backendHost.bridge.dispatch, 'function')
  assert.equal(calls[0].storageBasePath, '/user-data/kepos/v1')

  calls[0].getProfileContext('Ada')
  calls[0].setDirectComposerRecipient('friend-1')
  calls[0].setNotice('Ready.')

  assert.deepEqual(calls.slice(1), [
    ['profileContext', { displayName: 'Ada', storageBasePath: '/user-data/kepos/v1' }],
    ['setDirectComposerRecipient', 'friend-1'],
    ['updateState']
  ])
})

function createControllerState(calls) {
  return {
    getCurrentDisplayName: () => 'Desktop',
    setDirectComposerRecipient: (profileId) =>
      calls.push(['setDirectComposerRecipient', profileId]),
    updateState: () => calls.push(['updateState'])
  }
}
