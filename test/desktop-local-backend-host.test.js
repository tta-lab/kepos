import assert from 'node:assert/strict'
import test from 'node:test'
import { DESKTOP_COMMANDS } from '../src/desktop-command-vocabulary.ts'
import { createDesktopLocalBackendHost } from '../src/desktop-local-backend-host.ts'

function createActions(calls) {
  return Object.fromEntries(
    DESKTOP_COMMANDS.map((command) => [
      command,
      (payload) => {
        calls.push([command, payload])
        return `${command}:ok`
      }
    ])
  )
}

test('desktop local backend host wires commands through the backend bridge', async () => {
  const calls = []
  const host = createDesktopLocalBackendHost({
    actions: createActions(calls),
    runtimeOptions: {
      createDmRuntime: createFakeRuntime('dm'),
      createHomeRuntime: createFakeRuntime('home'),
      createTreeholeRuntime: createFakeRuntime('treehole')
    }
  })

  assert.equal(
    await host.bridge.dispatch('sendHomeMessage', { text: 'hello' }),
    'sendHomeMessage:ok'
  )
  assert.deepEqual(calls, [['sendHomeMessage', { text: 'hello' }]])
})

test('desktop local backend host forwards runtime events through the backend bridge', () => {
  const events = []
  const host = createDesktopLocalBackendHost({
    actions: createActions([]),
    runtimeOptions: {
      createDmRuntime: createFakeRuntime('dm'),
      createHomeRuntime: createFakeRuntime('home'),
      createTreeholeRuntime: createFakeRuntime('treehole')
    }
  })

  host.bridge.subscribe('peerCountChanged', (payload) => events.push(['peerCountChanged', payload]))
  host.runtime.home.options.onPeerCount(3)

  assert.deepEqual(events, [['peerCountChanged', { peers: 3 }]])
  assert.equal(host.dmRuntime.name, 'dm')
  assert.equal(host.homeRuntime.name, 'home')
  assert.equal(host.treeholeRuntime.name, 'treehole')
})

function createFakeRuntime(name) {
  return function (options = {}) {
    return {
      name,
      options,
      closeAll: () => undefined,
      close: () => undefined,
      configure: () => undefined,
      leave: () => undefined
    }
  }
}
