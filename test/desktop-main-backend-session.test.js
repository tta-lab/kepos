import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopMainBackendSession } from '../src/desktop-main-backend-session.js'

test('desktop main backend session uses file profile context and local backend bridge', () => {
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
      return { contactBook: { ownerProfileId: 'owner-1' }, profile: {}, saveContactBook: () => {} }
    },
    storageBasePath: '/user-data/kepos/v1'
  })

  assert.equal(typeof session.backendHost.bridge.dispatch, 'function')
  assert.equal(calls[0].storageBasePath, '/user-data/kepos/v1')

  calls[0].getProfileContext('Ada')
  calls[0].setContextFormDraft({ trustAlias: '', trustQrUri: '' })
  calls[0].setDirectComposerRecipient('friend-1')
  calls[0].setNotice('Ready.')
  calls[0].onChanged()

  assert.deepEqual(calls.slice(1), [
    ['profileContext', { displayName: 'Ada', storageBasePath: '/user-data/kepos/v1' }],
    ['setDirectComposerRecipient', 'friend-1'],
    ['updateState'],
    ['profileContext', { displayName: 'Desktop', storageBasePath: '/user-data/kepos/v1' }]
  ])
  assert.deepEqual(emitted, [
    ['contextFormDraftChanged', { trustAlias: '', trustQrUri: '' }],
    ['directComposerRecipientChanged', 'friend-1'],
    ['desktopStateChanged', { notice: 'Ready.' }],
    ['contactBookChanged', { ownerProfileId: 'owner-1' }]
  ])
})

function createControllerState(calls) {
  return {
    getCurrentDisplayName: () => 'Desktop',
    getState: () => ({ notice: 'Ready.' }),
    setDirectComposerRecipient: (profileId) =>
      calls.push(['setDirectComposerRecipient', profileId]),
    updateState: () => calls.push(['updateState'])
  }
}
