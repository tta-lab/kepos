import assert from 'node:assert/strict'
import test from 'node:test'
import { DESKTOP_COMMANDS } from '../src/desktop-command-vocabulary.ts'
import { createDesktopBackendActions } from '../src/desktop-backend-actions.ts'

function createActionGroup(name, actionNames, calls) {
  return Object.fromEntries(
    actionNames.map((actionName) => [
      actionName,
      (payload) => {
        calls.push([name, actionName, payload])
        return `${name}:${actionName}`
      }
    ])
  )
}

test('desktop backend actions compose the complete V1 command action map', () => {
  const calls = []
  const messageActions = createActionGroup(
    'message',
    [
      'commentTreehole',
      'likeTreehole',
      'markDmThreadRead',
      'postTreehole',
      'sendDmMessage',
      'sendHomeMessage'
    ],
    calls
  )
  const messageRequestActions = createActionGroup(
    'request',
    ['acceptMessageRequest', 'ignoreMessageRequest'],
    calls
  )
  const displayNameActions = createActionGroup(
    'display',
    ['updateAvatarMedia', 'updateAvatarUri', 'updateDisplayName'],
    calls
  )
  const roomActions = createActionGroup(
    'room',
    ['enterContactHome', 'joinHome', 'joinHomeUri', 'leaveHome'],
    calls
  )
  const trustActions = createActionGroup(
    'trust',
    ['allowContactRequests', 'revokeContact', 'prepareProfileRequestTarget'],
    calls
  )

  const actions = createDesktopBackendActions({
    displayNameActions,
    messageActions,
    messageRequestActions,
    roomActions,
    trustActions
  })

  assert.deepEqual(Object.keys(actions).sort(), [...DESKTOP_COMMANDS].sort())
  assert.equal(actions.sendHomeMessage({ text: 'hello' }), 'message:sendHomeMessage')
  assert.equal(actions.acceptMessageRequest({ id: 'request-1' }), 'request:acceptMessageRequest')
  assert.equal(actions.joinHome({ mode: 'host' }), 'room:joinHome')
  assert.equal(actions.enterContactHome({ profileId: 'profile-a' }), 'room:enterContactHome')
  assert.equal(
    actions.prepareProfileRequestTarget({ uri: 'kepos://profile' }),
    'trust:prepareProfileRequestTarget'
  )
  assert.equal(actions.allowContactRequests('profile-b'), 'trust:allowContactRequests')
  assert.equal(actions.sendMessageRequest({ text: 'dm' }), 'message:sendDmMessage')
  assert.equal(actions.markDmThreadRead({ profileId: 'friend' }), 'message:markDmThreadRead')
  assert.equal(
    actions.updateAvatarUri({ avatarUri: 'file:///avatar/me.png' }),
    'display:updateAvatarUri'
  )
  assert.equal(
    actions.updateAvatarMedia({ bytesBase64: 'aGVsbG8=', mimeType: 'image/png' }),
    'display:updateAvatarMedia'
  )
  assert.equal(actions.updateDisplayName({ displayName: 'Ada' }), 'display:updateDisplayName')
  assert.deepEqual(calls, [
    ['message', 'sendHomeMessage', { text: 'hello' }],
    ['request', 'acceptMessageRequest', { id: 'request-1' }],
    ['room', 'joinHome', { mode: 'host' }],
    ['room', 'enterContactHome', { profileId: 'profile-a' }],
    ['trust', 'prepareProfileRequestTarget', { uri: 'kepos://profile' }],
    ['trust', 'allowContactRequests', 'profile-b'],
    ['message', 'sendDmMessage', { text: 'dm' }],
    ['message', 'markDmThreadRead', { profileId: 'friend' }],
    ['display', 'updateAvatarUri', { avatarUri: 'file:///avatar/me.png' }],
    ['display', 'updateAvatarMedia', { bytesBase64: 'aGVsbG8=', mimeType: 'image/png' }],
    ['display', 'updateDisplayName', { displayName: 'Ada' }]
  ])
})

test('desktop backend actions fail closed when a command action is missing', () => {
  assert.throws(
    () =>
      createDesktopBackendActions({
        displayNameActions: {},
        messageActions: {},
        messageRequestActions: {},
        roomActions: {},
        trustActions: {}
      }),
    /Missing desktop backend action/
  )
})
