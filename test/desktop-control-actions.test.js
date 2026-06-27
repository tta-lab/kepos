import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopControlActions } from '../src/desktop-control-actions.js'

function createHarness(overrides = {}) {
  const calls = []
  let homeJoinDetails = { ownerProfileId: '', profileId: 'local' }
  const context = {
    contactBook: { ownerProfileId: 'local' },
    profile: {
      dmEncryptionKeyPair: { publicKey: 'dm-public' }
    },
    saveContactBook(book) {
      calls.push(['saveContactBook', book])
    }
  }
  const dmRuntime = {
    acceptInviteAsRecipient(payload) {
      calls.push(['dm.acceptInviteAsRecipient', payload])
    },
    appendIncomingRequest(request) {
      calls.push(['dm.appendIncomingRequest', request])
    },
    getSession() {
      return { localProfileId: 'local' }
    }
  }
  const homeRuntime = {
    isJoined: () => true,
    sendControl(peer, payload) {
      calls.push(['home.sendControl', peer, payload])
    }
  }
  const treeholeRuntime = {
    addWriter(writer) {
      calls.push(['treehole.addWriter', writer])
    },
    createBootstrapControl(profileId) {
      return { profileId, type: 'treehole.bootstrap' }
    },
    createWriterControl() {
      return { type: 'treehole.writer' }
    }
  }
  const actions = createDesktopControlActions({
    configureTreeholeRuntime: () => calls.push(['treehole.configure']),
    createControlMessageResult: ({ message, peer }) => {
      if (message.type === 'kepos.message.request.v1') {
        return {
          appendIncomingRequest: message,
          book: { pending: message.fromProfileId },
          kind: 'message_request'
        }
      }
      if (message.type === 'kepos.dm.invite.v1') {
        return { kind: 'dm_invite' }
      }
      if (message.type === 'treehole.bootstrap') {
        return {
          bootstrapKey: message.key,
          kind: 'treehole_bootstrap',
          ownerProfileId: message.ownerProfileId,
          sendWriterPeer: peer
        }
      }
      if (message.type === 'treehole.writer') {
        return { kind: 'treehole_writer', writer: message }
      }
      return null
    },
    createTreeholeControlSendResult: ({
      createBootstrapControl,
      createWriterControl,
      peer,
      remoteProfileId,
      type
    }) => ({
      payload:
        type === 'bootstrap' ? createBootstrapControl(remoteProfileId) : createWriterControl(),
      peer
    }),
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => homeJoinDetails,
    getHomeRuntime: () => homeRuntime,
    getProfileContext: () => context,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged: () => calls.push(['render']),
    openTreehole: (bootstrapKey) => calls.push(['treehole.open', bootstrapKey]),
    setHomeJoinDetails: (nextDetails) => {
      homeJoinDetails = nextDetails
    },
    setNotice: (notice) => calls.push(['notice', notice]),
    shortenProfileId: (profileId) => `short:${profileId}`,
    ...overrides
  })

  return {
    actions,
    calls,
    get homeJoinDetails() {
      return homeJoinDetails
    }
  }
}

test('desktop control actions append incoming message requests', async () => {
  const { actions, calls } = createHarness()
  const message = {
    fromProfileId: 'friend',
    id: 'request-1',
    type: 'kepos.message.request.v1'
  }

  await actions.handleControl(message, 'peer-1')

  assert.deepEqual(calls, [
    ['saveContactBook', { pending: 'friend' }],
    ['dm.appendIncomingRequest', message],
    ['notice', 'Message request received.'],
    ['render']
  ])
})

test('desktop control actions accept incoming DM invites', async () => {
  const { actions, calls } = createHarness()

  await actions.handleControl({ type: 'kepos.dm.invite.v1' }, 'peer-1')

  assert.deepEqual(calls, [['notice', 'Direct message ready.'], ['render']])
})

test('desktop control actions open treehole bootstrap and send writer control', async () => {
  const harness = createHarness()

  await harness.actions.handleControl(
    {
      key: 'bootstrap-key',
      ownerProfileId: 'owner',
      type: 'treehole.bootstrap'
    },
    'peer-1'
  )

  assert.deepEqual(harness.homeJoinDetails, { ownerProfileId: 'owner', profileId: 'local' })
  assert.deepEqual(harness.calls, [
    ['treehole.configure'],
    ['treehole.open', 'bootstrap-key'],
    ['home.sendControl', 'peer-1', { type: 'treehole.writer' }]
  ])
})

test('desktop control actions add treehole writers and send bootstrap controls', async () => {
  const { actions, calls } = createHarness()

  await actions.handleControl({ key: 'writer-key', type: 'treehole.writer' }, 'peer-1')
  actions.sendTreeholeBootstrap('peer-2', 'friend')

  assert.deepEqual(calls, [
    ['treehole.addWriter', { key: 'writer-key', type: 'treehole.writer' }],
    ['home.sendControl', 'peer-2', { profileId: 'friend', type: 'treehole.bootstrap' }]
  ])
})
