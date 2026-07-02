import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopMessageRequestActions } from '../src/desktop-message-request-actions.ts'

function createHarness(overrides = {}) {
  const calls = []
  const context = {
    contactBook: { ownerProfileId: 'local' },
    saveContactBook(book) {
      calls.push(['saveContactBook', book])
    }
  }
  const homeRuntime = {
    broadcastControl(message) {
      calls.push(['home.broadcastControl', message])
    },
    isJoined: () => true
  }
  const friendRequestTransport = {
    send(message) {
      calls.push(['profileTransport.send', message])
      return { state: 'sent' }
    }
  }
  const dmRuntime = {
    acceptMessageRequest(payload) {
      calls.push(['dm.acceptMessageRequest', payload])
      return {
        book: { accepted: payload.remoteProfileId },
        invite: { type: 'kepos.dm.invite.v1' }
      }
    },
    dismissMessage(payload) {
      calls.push(['dm.dismissMessage', payload])
    }
  }
  const actions = createDesktopMessageRequestActions({
    createId: () => 'thread-1',
    getDmRuntime: () => dmRuntime,
    getDmSession: () => ({ id: 'dm-session' }),
    getFriendRequestTransport: () => friendRequestTransport,
    getHomeRuntime: () => homeRuntime,
    getProfileContext: () => context,
    now: () => 123,
    onChanged: () => calls.push(['render']),
    setNotice: (notice) => calls.push(['notice', notice]),
    ...overrides
  })

  return { actions, calls }
}

test('desktop message request actions accept requests and sends invites over profile transport', async () => {
  const { actions, calls } = createHarness()

  await actions.acceptMessageRequest({ fromProfileId: 'friend' })

  assert.deepEqual(calls, [
    [
      'dm.acceptMessageRequest',
      {
        acceptedAt: 123,
        book: { ownerProfileId: 'local' },
        remoteProfileId: 'friend',
        threadId: 'thread-1'
      }
    ],
    ['saveContactBook', { accepted: 'friend' }],
    ['profileTransport.send', { type: 'kepos.dm.invite.v1' }],
    ['notice', 'Friend request accepted.'],
    ['render']
  ])
})

test('desktop message request actions accept requests without joining Home', async () => {
  const { actions, calls } = createHarness({
    getHomeRuntime: () => ({
      broadcastControl(message) {
        calls.push(['home.broadcastControl', message])
      },
      isJoined: () => false
    })
  })

  await actions.acceptMessageRequest({ fromProfileId: 'friend' })

  assert.equal(
    calls.some(([name]) => name === 'profileTransport.send'),
    true
  )
  assert.equal(
    calls.some(([name]) => name === 'home.broadcastControl'),
    false
  )
})

test('desktop message request actions ignore requests and dismiss visible messages', () => {
  const { actions, calls } = createHarness({
    ignoreMessageRequest: ({ book, hasDmSession, message, profileId }) => ({
      book: { ...book, ignored: profileId || message.fromProfileId },
      dismissedMessageId: hasDmSession ? message.id : ''
    })
  })

  actions.ignoreMessageRequest({
    message: { fromProfileId: 'friend', id: 'request-1' }
  })

  assert.deepEqual(calls, [
    ['saveContactBook', { ownerProfileId: 'local', ignored: 'friend' }],
    ['dm.dismissMessage', { id: 'request-1' }],
    ['notice', 'Friend request ignored.'],
    ['render']
  ])
})

test('desktop message request actions gate unavailable accept and empty ignore', async () => {
  const { actions, calls } = createHarness({
    getDmSession: () => null,
    getHomeRuntime: () => ({ isJoined: () => false }),
    ignoreMessageRequest: () => null
  })

  await actions.acceptMessageRequest({ fromProfileId: 'friend' })
  actions.ignoreMessageRequest({})

  assert.deepEqual(calls, [])
})
