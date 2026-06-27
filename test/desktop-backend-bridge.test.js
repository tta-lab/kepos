import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createDesktopBackendBridge } from '../src/desktop-backend-bridge.ts'
import { DESKTOP_COMMANDS, DESKTOP_EVENTS } from '../src/desktop-command-vocabulary.ts'

test('desktop backend bridge mirrors the V1 command and event vocabulary', () => {
  const bridge = createDesktopBackendBridge({
    dispatch: () => undefined
  })

  assert.deepEqual(bridge.commands, DESKTOP_COMMANDS)
  assert.deepEqual(bridge.events, DESKTOP_EVENTS)
})

test('desktop backend bridge dispatches known commands and rejects unknown commands', async () => {
  const calls = []
  const bridge = createDesktopBackendBridge({
    dispatch: (command, payload) => {
      calls.push([command, payload])
      return `${command}:ok`
    }
  })

  assert.equal(await bridge.dispatch('joinHome', { mode: 'host' }), 'joinHome:ok')
  assert.deepEqual(calls, [['joinHome', { mode: 'host' }]])
  await assert.rejects(() => bridge.dispatch('shareScreen', {}), /Unknown desktop command/)
})

test('desktop backend bridge validates event subscriptions and supports unsubscribe', () => {
  const bridge = createDesktopBackendBridge({
    dispatch: () => undefined
  })
  const events = []
  const unsubscribe = bridge.subscribe('statusChanged', (payload) => {
    events.push(payload)
  })

  bridge.emit('statusChanged', { status: 'joined' })
  unsubscribe()
  bridge.emit('statusChanged', { status: 'ignored' })

  assert.deepEqual(events, [{ status: 'joined' }])
  assert.throws(() => bridge.subscribe('screenShared', () => {}), /Unknown desktop event/)
  assert.throws(() => bridge.emit('screenShared', {}), /Unknown desktop event/)
})

test('desktop controller routes commands through the backend bridge', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopBackendBridge/)
  assert.match(source, /createDesktopRendererBackendClient/)
  assert.match(source, /const backendBridge = createDesktopBackendBridge/)
  assert.match(source, /const backendClient = createDesktopRendererBackendClient/)
  assert.match(source, /await backendClient\.dispatch\(command, payload\)/)
})

test('desktop controller routes treehole runtime updates through backend bridge events', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopBackendRuntime/)
  assert.match(source, /const treeholeRuntime = backendRuntime\.treehole/)
  assert.match(source, /backendClient\.subscribe\('treeholeStateChanged'/)
  assert.match(source, /setDesktopTreehole\(state, snapshot\)/)
  assert.match(source, /backendClient\.subscribe\('errorReceived', showError\)/)
  assert.doesNotMatch(source, /import Hyperswarm/)
  assert.doesNotMatch(source, /createTreeholeBase/)
  assert.doesNotMatch(source, /createTreeholeStatePublisher/)
})

test('desktop controller delegates home transport to a runtime boundary', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopBackendRuntime/)
  assert.match(source, /const homeRuntime = backendRuntime\.home/)
  assert.match(source, /onHomeControl: \(message, peer\) => handleControl/)
  assert.match(source, /homeRuntime\.join/)
  assert.match(source, /homeRuntime\.sendMessage/)
  assert.doesNotMatch(source, /from '..\/src\/p2p-room\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/chat-session\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/home-presence\.ts'/)
})

test('desktop controller delegates direct message runtime and storage to a boundary', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopBackendRuntime/)
  assert.match(source, /const backendRuntime = createDesktopBackendRuntime/)
  assert.match(source, /const dmRuntime = backendRuntime\.dm/)
  assert.match(source, /dmRuntime\.sendMessageOrRequest/)
  assert.doesNotMatch(source, /from '..\/src\/dm-thread-runtime\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/dm-message-storage\.ts'/)
  assert.doesNotMatch(source, /from '..\/src\/dm-thread-storage\.js'/)
})

test('desktop controller uses one backend runtime facade for long lived runtimes', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopBackendRuntime/)
  assert.doesNotMatch(source, /from '..\/src\/desktop-dm-runtime\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/desktop-home-runtime\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/desktop-treehole-runtime\.js'/)
})
