import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopTrustActions } from '../src/desktop-trust-actions.js'

function createHarness(overrides = {}) {
  const calls = []
  let homeJoinDetails = { profileId: 'local', treeholePolicy: { trusted: [] } }
  let selectedRecipientProfileId = 'friend'
  const context = {
    contactBook: { ownerProfileId: 'local' },
    profile: {
      id: 'local',
      identity: { publicKey: 'local-public' }
    },
    saveContactBook(book) {
      calls.push(['saveContactBook', book])
    }
  }
  const dmRuntime = {
    closeThreads(threadIds) {
      calls.push(['dm.closeThreads', threadIds])
    },
    loadThreads() {
      calls.push(['dm.loadThreads'])
      return [{ threadId: 'thread-1' }]
    },
    replaceThreads(threads) {
      calls.push(['dm.replaceThreads', threads])
    }
  }
  const actions = createDesktopTrustActions({
    applyProfileTrustQr: ({ alias, uri }) => ({
      book: { trustedAlias: alias, trustedUri: uri },
      profileId: 'friend',
      treeholePolicy: { trusted: ['friend'] }
    }),
    configureTreeholeRuntime: () => calls.push(['treehole.configure']),
    createContactRevoke: ({ profileId, selectedRecipientProfileId, threads }) => ({
      book: { revoked: profileId },
      nextThreads: threads.map((thread) => ({ ...thread, state: 'revoked' })),
      revokedThreadIds: ['thread-1'],
      shouldClearRecipient: selectedRecipientProfileId === profileId,
      treeholePolicy: { trusted: [] }
    }),
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => homeJoinDetails,
    getProfileContext: () => context,
    getSelectedRecipientProfileId: () => selectedRecipientProfileId,
    onChanged: () => calls.push(['render']),
    setContextFormDraft: (draft) => calls.push(['form.draft', draft]),
    setDirectComposerRecipient: (profileId) => {
      selectedRecipientProfileId = profileId
      calls.push(['composer.recipient', profileId])
    },
    setHomeJoinDetails: (nextDetails) => {
      homeJoinDetails = nextDetails
    },
    setNotice: (notice) => calls.push(['notice', notice]),
    ...overrides
  })

  return {
    actions,
    calls,
    get homeJoinDetails() {
      return homeJoinDetails
    },
    get selectedRecipientProfileId() {
      return selectedRecipientProfileId
    }
  }
}

test('desktop trust actions apply profile QR trust and refresh active treehole policy', () => {
  const harness = createHarness()

  harness.actions.trustProfileUri({
    alias: 'Ada',
    displayName: 'Neil',
    uri: 'kepos://profile'
  })

  assert.deepEqual(harness.homeJoinDetails, {
    profileId: 'local',
    treeholePolicy: { trusted: ['friend'] }
  })
  assert.deepEqual(harness.calls, [
    ['saveContactBook', { trustedAlias: 'Ada', trustedUri: 'kepos://profile' }],
    ['treehole.configure'],
    ['form.draft', { trustAlias: '', trustQrUri: '' }],
    ['notice', 'Trusted friend added.'],
    ['render']
  ])
})

test('desktop trust actions revoke contact threads and clear selected direct recipient', async () => {
  const harness = createHarness()

  await harness.actions.revokeContact('friend')

  assert.equal(harness.selectedRecipientProfileId, '')
  assert.deepEqual(harness.homeJoinDetails, {
    profileId: 'local',
    treeholePolicy: { trusted: [] }
  })
  assert.deepEqual(harness.calls, [
    ['dm.loadThreads'],
    ['saveContactBook', { revoked: 'friend' }],
    ['dm.replaceThreads', [{ threadId: 'thread-1', state: 'revoked' }]],
    ['dm.closeThreads', ['thread-1']],
    ['treehole.configure'],
    ['composer.recipient', ''],
    ['notice', 'Trust revoked.'],
    ['render']
  ])
})

test('desktop trust actions ignore empty profile QR trust input', () => {
  const harness = createHarness()

  harness.actions.trustProfileUri({ uri: '' })

  assert.deepEqual(harness.calls, [])
})
