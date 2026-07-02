import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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

test('desktop UI action bindings keep typed action payload boundaries', async () => {
  const source = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /type ActionHandler<TPayload = unknown>/)
  assert.match(source, /type ContextFormActions = \{/)
  assert.match(source, /setContextFormActions\(actions: ContextFormActions\): void/)
  assert.match(source, /setPeopleActions\(actions: PeopleActions\): void/)
  assert.doesNotMatch(source, /\bany\b/)
})

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
    createReadAt: () => 1234,
    dispatchCommand: (command, payload) => calls.push(['dispatch', command, payload]),
    onError: (error) => calls.push(['error', error.message]),
    qrActions,
    selectDirectContact: (profileId) => calls.push(['selectDirectContact', profileId]),
    setTab: (tab) => calls.push(['setTab', tab]),
    ui,
    updateDirectComposerRecipient: (profileId) =>
      calls.push(['updateDirectComposerRecipient', profileId]),
    updateAvatarMedia: (avatar) => calls.push(['updateAvatarMedia', avatar]),
    updateAvatarUri: (avatarUri) => calls.push(['updateAvatarUri', avatarUri]),
    updateDisplayName: (displayName) => calls.push(['updateDisplayName', displayName])
  })

  actions.context.createHome({ displayName: 'Me' })
  actions.context.joinManualHome({ displayName: 'Me', roomKey: 'room' })
  actions.context.joinHomeQr({ displayName: 'Ada', uri: 'kepos://join' })
  actions.context.prepareProfileRequestTarget({
    alias: 'Ada',
    displayName: 'Me',
    uri: 'kepos://profile'
  })
  await actions.context.copyHomeQr()
  await actions.context.copyProfileQr()
  await actions.context.showLargeHomeQr({ returnFocus: 'home-button' })
  await actions.context.showLargeProfileQr({ returnFocus: 'profile-button' })
  actions.context.updateAvatarMedia({ bytesBase64: 'aGVsbG8=', mimeType: 'image/png' })
  actions.context.updateAvatarUri({ avatarUri: 'file:///avatar/me.png' })
  actions.context.updateDisplayName({ displayName: 'Me' })
  actions.directContactPicker.openPeople()
  actions.directContactPicker.selectContact('profile-a')
  actions.directComposer.sendDirectMessage({ text: 'hello', toProfileId: 'profile-a' })
  actions.directComposer.updateRecipient({ toProfileId: 'profile-b' })
  actions.directMessages.acceptMessage({ id: 'request-1' })
  actions.directMessages.ignoreMessage({ id: 'request-2' })
  actions.homeComposer.sendHomeMessage({ text: 'hi' })
  actions.people.acceptMessageRequest({ id: 'request-3' })
  actions.people.allowContactRequests('profile-b')
  actions.people.ignoreMessageRequest('profile-c')
  actions.people.enterContactHome('profile-home')
  actions.people.retryOutgoingFriendRequest('profile-retry')
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
    [
      'dispatch',
      'prepareProfileRequestTarget',
      { alias: 'Ada', displayName: 'Me', uri: 'kepos://profile' }
    ],
    ['setTab', 'dm'],
    ['copyQrValue', { notice: 'Home QR copied.', value: 'kepos://home' }],
    ['copyQrValue', { notice: 'Profile QR copied.', value: 'kepos://profile' }],
    ['showLargeQr', { returnFocus: 'home-button', title: 'Debug Home QR', uri: 'kepos://home' }],
    ['showLargeQr', { returnFocus: 'profile-button', title: 'Profile QR', uri: 'kepos://profile' }],
    ['updateAvatarMedia', { bytesBase64: 'aGVsbG8=', mimeType: 'image/png' }],
    ['dispatch', 'updateAvatarMedia', { bytesBase64: 'aGVsbG8=', mimeType: 'image/png' }],
    ['updateAvatarUri', 'file:///avatar/me.png'],
    ['dispatch', 'updateAvatarUri', { avatarUri: 'file:///avatar/me.png' }],
    ['updateDisplayName', 'Me'],
    ['dispatch', 'updateDisplayName', { displayName: 'Me' }],
    ['setTab', 'people'],
    ['selectDirectContact', 'profile-a'],
    ['dispatch', 'sendDmMessage', { text: 'hello', toProfileId: 'profile-a' }],
    ['updateDirectComposerRecipient', 'profile-b'],
    ['dispatch', 'markDmThreadRead', { profileId: 'profile-b', readAt: 1234 }],
    ['dispatch', 'acceptMessageRequest', { message: { id: 'request-1' } }],
    ['dispatch', 'ignoreMessageRequest', { message: { id: 'request-2' } }],
    ['dispatch', 'sendHomeMessage', { text: 'hi' }],
    ['dispatch', 'acceptMessageRequest', { message: { id: 'request-3' } }],
    ['dispatch', 'allowContactRequests', { profileId: 'profile-b' }],
    ['dispatch', 'ignoreMessageRequest', { profileId: 'profile-c' }],
    ['dispatch', 'enterContactHome', { profileId: 'profile-home' }],
    ['dispatch', 'retryOutgoingFriendRequest', { profileId: 'profile-retry' }],
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
    createReadAt: () => 1234,
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
    updateAvatarMedia: () => undefined,
    updateAvatarUri: () => undefined,
    updateDisplayName: () => undefined
  })

  await actions.context.copyHomeQr()
  await actions.context.showLargeHomeQr({})

  assert.deepEqual(
    errors.map((error) => error.message),
    ['copy failed', 'show failed']
  )
})
