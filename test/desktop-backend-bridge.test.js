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
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(
    new URL('../src/desktop-local-backend-host.js', import.meta.url),
    'utf8'
  )
  const dispatcher = await readFile(
    new URL('../src/desktop-command-dispatcher.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /createDesktopBackendSession/)
  assert.match(session, /createDesktopLocalBackendHost/)
  assert.match(host, /createDesktopBackendBridge/)
  assert.match(host, /createDesktopCommandHost/)
  assert.match(source, /createDesktopRendererBackendClient/)
  assert.match(host, /const bridge = createBackendBridge/)
  assert.match(source, /const backendClient = createDesktopRendererBackendClient/)
  assert.match(source, /localBackend: backendSession\.backendHost\.bridge/)
  assert.match(source, /createDesktopCommandDispatcher\(\{\s*backendClient,/)
  assert.match(source, /await commandDispatcher\.dispatch\(command, payload\)/)
  assert.match(dispatcher, /await backendClient\.dispatch\(command, payload\)/)
})

test('desktop controller routes treehole runtime updates through backend bridge events', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(
    new URL('../src/desktop-local-backend-host.js', import.meta.url),
    'utf8'
  )
  const subscriptions = await readFile(
    new URL('../src/desktop-backend-subscriptions.js', import.meta.url),
    'utf8'
  )

  assert.match(host, /createDesktopBackendRuntime/)
  assert.match(host, /emit: \(event, payload\) => bridge\.emit\(event, payload\)/)
  assert.match(session, /treeholeRuntime = backendHost\.treeholeRuntime/)
  assert.match(source, /createDesktopBackendSubscriptions/)
  assert.match(subscriptions, /backendClient\.subscribe\('treeholeStateChanged'/)
  assert.match(subscriptions, /setDesktopTreehole\(getState\(\), snapshot\)/)
  assert.match(subscriptions, /backendClient\.subscribe\('errorReceived', onError\)/)
  assert.doesNotMatch(source, /import Hyperswarm/)
  assert.doesNotMatch(source, /createTreeholeBase/)
  assert.doesNotMatch(source, /createTreeholeStatePublisher/)
})

test('desktop controller routes Home and Direct sessions through backend bridge events', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const runtime = await readFile(
    new URL('../src/desktop-backend-runtime.js', import.meta.url),
    'utf8'
  )
  const subscriptions = await readFile(
    new URL('../src/desktop-backend-subscriptions.js', import.meta.url),
    'utf8'
  )

  assert.match(runtime, /emit\('homeMessageReceived', session\)/)
  assert.match(runtime, /emit\('dmMessageReceived', session\)/)
  assert.match(source, /createDesktopBackendSubscriptions/)
  assert.match(subscriptions, /backendClient\.subscribe\('homeMessageReceived'/)
  assert.match(subscriptions, /backendClient\.subscribe\('dmMessageReceived'/)
  assert.doesNotMatch(source, /onHomeSessionChanged:/)
  assert.doesNotMatch(source, /onDmSessionChanged:/)
})

test('desktop controller renders backend contact book snapshots from the bridge', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const subscriptions = await readFile(
    new URL('../src/desktop-backend-subscriptions.js', import.meta.url),
    'utf8'
  )

  assert.match(subscriptions, /backendClient\.subscribe\('contactBookChanged'/)
  assert.match(source, /let backendContactBook = null/)
  assert.match(source, /setContactBook: \(nextContactBook\) =>/)
  assert.match(source, /contactBook: backendContactBook \|\| contactBook/)
})

test('desktop controller delegates home transport to a runtime boundary', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.js', import.meta.url),
    'utf8'
  )
  const roomActions = await readFile(
    new URL('../src/desktop-room-actions.js', import.meta.url),
    'utf8'
  )
  const controlActions = await readFile(
    new URL('../src/desktop-control-actions.js', import.meta.url),
    'utf8'
  )
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(
    new URL('../src/desktop-local-backend-host.js', import.meta.url),
    'utf8'
  )

  assert.match(host, /createDesktopBackendRuntime/)
  assert.match(session, /homeRuntime = backendHost\.homeRuntime/)
  assert.match(session, /onHomeControl: \(message, peer\) => controlActions\.handleControl/)
  assert.match(controlActions, /async function handleControl\(message, peer\)/)
  assert.match(session, /createDesktopBackendActions/)
  assert.match(backendActions, /joinHome: roomActions\?\.joinHome/)
  assert.match(roomActions, /getHomeRuntime\(\)\.join/)
  assert.match(actions, /homeRuntime\.sendMessage/)
  assert.doesNotMatch(source, /from '..\/src\/p2p-room\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/chat-session\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/home-presence\.ts'/)
})

test('desktop controller delegates direct message runtime and storage to a boundary', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(
    new URL('../src/desktop-local-backend-host.js', import.meta.url),
    'utf8'
  )

  assert.match(host, /createDesktopBackendRuntime/)
  assert.match(session, /backendRuntime = backendHost\.runtime/)
  assert.match(session, /dmRuntime = backendHost\.dmRuntime/)
  assert.match(actions, /dmRuntime\?\.sendMessageOrRequest/)
  assert.doesNotMatch(source, /from '..\/src\/dm-thread-runtime\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/dm-message-storage\.ts'/)
  assert.doesNotMatch(source, /from '..\/src\/dm-thread-storage\.js'/)
})

test('desktop controller uses one backend runtime facade for long lived runtimes', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(
    new URL('../src/desktop-local-backend-host.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /createDesktopBackendSession/)
  assert.match(session, /createDesktopLocalBackendHost/)
  assert.match(host, /createDesktopBackendRuntime/)
  assert.doesNotMatch(source, /from '..\/src\/desktop-dm-runtime\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/desktop-home-runtime\.js'/)
  assert.doesNotMatch(source, /from '..\/src\/desktop-treehole-runtime\.js'/)
})
