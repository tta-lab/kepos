import assert from 'node:assert/strict'
import test from 'node:test'
import { DESKTOP_COMMANDS } from '../src/desktop-command-vocabulary.ts'
import { createDesktopBackendActions } from '../src/desktop-backend-actions.js'

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
    ['commentTreehole', 'likeTreehole', 'postTreehole', 'sendDmMessage', 'sendHomeMessage'],
    calls
  )
  const messageRequestActions = createActionGroup(
    'request',
    ['acceptMessageRequest', 'ignoreMessageRequest'],
    calls
  )
  const roomActions = createActionGroup('room', ['joinHome', 'joinHomeUri', 'leaveHome'], calls)
  const trustActions = createActionGroup('trust', ['revokeContact', 'trustProfileUri'], calls)

  const actions = createDesktopBackendActions({
    messageActions,
    messageRequestActions,
    roomActions,
    trustActions
  })

  assert.deepEqual(Object.keys(actions).sort(), [...DESKTOP_COMMANDS].sort())
  assert.equal(actions.sendHomeMessage({ text: 'hello' }), 'message:sendHomeMessage')
  assert.equal(actions.acceptMessageRequest({ id: 'request-1' }), 'request:acceptMessageRequest')
  assert.equal(actions.joinHome({ mode: 'host' }), 'room:joinHome')
  assert.equal(actions.trustProfileUri({ uri: 'kepos://profile' }), 'trust:trustProfileUri')
  assert.equal(actions.sendMessageRequest({ text: 'dm' }), 'message:sendDmMessage')
  assert.deepEqual(calls, [
    ['message', 'sendHomeMessage', { text: 'hello' }],
    ['request', 'acceptMessageRequest', { id: 'request-1' }],
    ['room', 'joinHome', { mode: 'host' }],
    ['trust', 'trustProfileUri', { uri: 'kepos://profile' }],
    ['message', 'sendDmMessage', { text: 'dm' }]
  ])
})

test('desktop backend actions fail closed when a command action is missing', () => {
  assert.throws(
    () =>
      createDesktopBackendActions({
        messageActions: {},
        messageRequestActions: {},
        roomActions: {},
        trustActions: {}
      }),
    /Missing desktop backend action/
  )
})
