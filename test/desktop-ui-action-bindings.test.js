import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopUiActionBindings } from '../src/desktop-ui-action-bindings.ts'

function createUiRecorder() {
  const actions = {}
  const ui = {
    setContextFormActions: (nextActions) => {
      actions.context = nextActions
    },
    setDirectComposerActions: (nextActions) => {
      actions.directComposer = nextActions
    },
    setDirectContactPickerActions: (nextActions) => {
      actions.directContactPicker = nextActions
    },
    setDirectMessageActions: (nextActions) => {
      actions.directMessages = nextActions
    },
    setHomeComposerActions: (nextActions) => {
      actions.homeComposer = nextActions
    },
    setPeopleActions: (nextActions) => {
      actions.people = nextActions
    },
    setShellActions: (nextActions) => {
      actions.shell = nextActions
    },
    setTreeholeActions: (nextActions) => {
      actions.treehole = nextActions
    },
    setTreeholeComposerActions: (nextActions) => {
      actions.treeholeComposer = nextActions
    }
  }

  return { actions, ui }
}

test('desktop UI action bindings route renderer actions to command payloads', async () => {
  const { actions, ui } = createUiRecorder()
  const calls = []
  const qrActions = {
    copyQrValue: (payload) => {
      calls.push(['copyQrValue', payload])
      return Promise.resolve()
    },
    getShareQrOutputs: () => ({
      homeUri: 'kepos://home',
      profileUri: 'kepos://profile'
    }),
    hideLargeQr: () => calls.push(['hideLargeQr']),
    showLargeQr: (payload) => {
      calls.push(['showLargeQr', payload])
      return Promise.resolve()
    }
  }

  createDesktopUiActionBindings({
    dispatchCommand: (command, payload) => calls.push(['dispatch', command, payload]),
    onError: (error) => calls.push(['error', error.message]),
    qrActions,
    selectDirectContact: (profileId) => calls.push(['selectDirectContact', profileId]),
    setTab: (tab) => calls.push(['setTab', tab]),
    ui,
    updateDirectComposerRecipient: (profileId) =>
      calls.push(['updateDirectComposerRecipient', profileId]),
    updateDisplayName: (displayName) => calls.push(['updateDisplayName', displayName])
  })

  actions.context.createHome({ displayName: 'Me' })
  actions.context.joinManualHome({ displayName: 'Me', roomKey: 'room' })
  actions.context.joinHomeQr({ displayName: 'Ada', uri: 'kepos://join' })
  actions.context.trustProfileQr({ alias: 'Ada', displayName: 'Me', uri: 'kepos://profile' })
  await actions.context.copyHomeQr()
  await actions.context.copyProfileQr()
  await actions.context.showLargeHomeQr({ returnFocus: 'home-button' })
  await actions.context.showLargeProfileQr({ returnFocus: 'profile-button' })
  actions.context.updateDisplayName({ displayName: 'Me' })
  actions.directContactPicker.openPeople()
  actions.directContactPicker.selectContact('profile-a')
  actions.directComposer.sendDirectMessage({ text: 'hello', toProfileId: 'profile-a' })
  actions.directComposer.updateRecipient({ toProfileId: 'profile-b' })
  actions.directMessages.acceptMessage({ id: 'request-1' })
  actions.directMessages.ignoreMessage({ id: 'request-2' })
  actions.homeComposer.sendHomeMessage({ text: 'hi' })
  actions.people.acceptMessageRequest({ id: 'request-3' })
  actions.people.ignoreMessageRequest('profile-c')
  actions.people.revokeContact('profile-d')
  actions.shell.hideLargeQr()
  actions.shell.leaveHome()
  actions.shell.setTab('treehole')
  actions.treehole.commentPost({ postId: 'post-1', text: 'nice' })
  actions.treehole.likePost('post-2')
  actions.treeholeComposer.postTreehole({ text: 'main post' })

  assert.deepEqual(calls, [
    ['dispatch', 'joinHome', { createTreehole: true, displayName: 'Me', mode: 'host' }],
    [
      'dispatch',
      'joinHome',
      { createTreehole: false, displayName: 'Me', mode: 'peer', roomKey: 'room' }
    ],
    ['dispatch', 'joinHomeUri', { displayName: 'Ada', uri: 'kepos://join' }],
    ['dispatch', 'trustProfileUri', { alias: 'Ada', displayName: 'Me', uri: 'kepos://profile' }],
    ['copyQrValue', { notice: 'Invite copied.', value: 'kepos://home' }],
    ['copyQrValue', { notice: 'Profile QR copied.', value: 'kepos://profile' }],
    ['showLargeQr', { returnFocus: 'home-button', title: 'Home invite', uri: 'kepos://home' }],
    ['showLargeQr', { returnFocus: 'profile-button', title: 'Profile QR', uri: 'kepos://profile' }],
    ['updateDisplayName', 'Me'],
    ['dispatch', 'updateDisplayName', { displayName: 'Me' }],
    ['setTab', 'people'],
    ['selectDirectContact', 'profile-a'],
    ['dispatch', 'sendDmMessage', { text: 'hello', toProfileId: 'profile-a' }],
    ['updateDirectComposerRecipient', 'profile-b'],
    ['dispatch', 'acceptMessageRequest', { message: { id: 'request-1' } }],
    ['dispatch', 'ignoreMessageRequest', { message: { id: 'request-2' } }],
    ['dispatch', 'sendHomeMessage', { text: 'hi' }],
    ['dispatch', 'acceptMessageRequest', { message: { id: 'request-3' } }],
    ['dispatch', 'ignoreMessageRequest', { profileId: 'profile-c' }],
    ['dispatch', 'revokeContact', { profileId: 'profile-d' }],
    ['hideLargeQr'],
    ['dispatch', 'leaveHome', undefined],
    ['setTab', 'treehole'],
    ['dispatch', 'commentTreehole', { postId: 'post-1', text: 'nice' }],
    ['dispatch', 'likeTreehole', { postId: 'post-2' }],
    ['dispatch', 'postTreehole', { text: 'main post' }]
  ])
})

test('desktop UI action bindings forward async QR failures to the controller error handler', async () => {
  const { actions, ui } = createUiRecorder()
  const errors = []

  createDesktopUiActionBindings({
    dispatchCommand: () => undefined,
    onError: (error) => errors.push(error),
    qrActions: {
      copyQrValue: () => Promise.reject(new Error('copy failed')),
      getShareQrOutputs: () => ({ homeUri: 'kepos://home', profileUri: 'kepos://profile' }),
      hideLargeQr: () => undefined,
      showLargeQr: () => Promise.reject(new Error('show failed'))
    },
    selectDirectContact: () => undefined,
    setTab: () => undefined,
    ui,
    updateDirectComposerRecipient: () => undefined,
    updateDisplayName: () => undefined
  })

  await actions.context.copyHomeQr()
  await actions.context.showLargeHomeQr({})

  assert.deepEqual(
    errors.map((error) => error.message),
    ['copy failed', 'show failed']
  )
})
