import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopCommandDispatcher } from '../src/desktop-command-dispatcher.ts'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, reject, resolve }
}

test('desktop command dispatcher tracks blocking command pending state', async () => {
  const pending = []
  const calls = []
  const join = deferred()
  const dispatcher = createDesktopCommandDispatcher({
    backendClient: {
      dispatch(command, payload) {
        calls.push([command, payload])
        return join.promise
      }
    },
    blockingCommands: ['joinHome'],
    onError: () => undefined,
    onPendingChanged: (command) => pending.push(command)
  })

  const running = dispatcher.dispatch('joinHome', { mode: 'host' })

  assert.equal(dispatcher.getPendingCommand(), 'joinHome')
  assert.deepEqual(pending, ['joinHome'])

  join.resolve('ok')
  await running

  assert.equal(dispatcher.getPendingCommand(), null)
  assert.deepEqual(pending, ['joinHome', null])
  assert.deepEqual(calls, [['joinHome', { mode: 'host' }]])
})

test('desktop command dispatcher skips a second blocking command while one is pending', async () => {
  const first = deferred()
  const calls = []
  const dispatcher = createDesktopCommandDispatcher({
    backendClient: {
      dispatch(command, payload) {
        calls.push([command, payload])
        return first.promise
      }
    },
    blockingCommands: ['joinHome', 'leaveHome'],
    onError: () => undefined,
    onPendingChanged: () => undefined
  })

  const running = dispatcher.dispatch('joinHome', { mode: 'host' })
  await dispatcher.dispatch('leaveHome')
  first.resolve('ok')
  await running

  assert.deepEqual(calls, [['joinHome', { mode: 'host' }]])
})

test('desktop command dispatcher reports dispatch errors and clears pending state', async () => {
  const errors = []
  const pending = []
  const dispatcher = createDesktopCommandDispatcher({
    backendClient: {
      dispatch() {
        throw new Error('failed')
      }
    },
    blockingCommands: ['joinHome'],
    onError: (error) => errors.push(error),
    onPendingChanged: (command) => pending.push(command)
  })

  await dispatcher.dispatch('joinHome', { mode: 'host' })

  assert.equal(errors[0].message, 'failed')
  assert.equal(dispatcher.getPendingCommand(), null)
  assert.deepEqual(pending, ['joinHome', null])
})

test('desktop command dispatcher dispatches non-blocking commands without pending state', async () => {
  const calls = []
  const pending = []
  const dispatcher = createDesktopCommandDispatcher({
    backendClient: {
      dispatch(command, payload) {
        calls.push([command, payload])
      }
    },
    blockingCommands: ['joinHome'],
    onError: () => undefined,
    onPendingChanged: (command) => pending.push(command)
  })

  await dispatcher.dispatch('sendHomeMessage', { text: 'hello' })

  assert.equal(dispatcher.getPendingCommand(), null)
  assert.deepEqual(pending, [])
  assert.deepEqual(calls, [['sendHomeMessage', { text: 'hello' }]])
})
