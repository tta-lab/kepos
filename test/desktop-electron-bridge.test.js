import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { DESKTOP_COMMANDS, DESKTOP_EVENTS } from '../src/desktop-command-vocabulary.ts'

const require = createRequire(import.meta.url)

test('desktop main loads a preload script for the backend bridge', async () => {
  const source = await readFile(new URL('../desktop/electron/main.cjs', import.meta.url), 'utf8')

  assert.match(source, /preload:\s*path\.join\(__dirname,\s*'preload\.cjs'\)/)
  assert.match(source, /registerDesktopBackendIpc/)
})

test('desktop preload exposes a narrow backend bridge api', async () => {
  const source = await readFile(new URL('../desktop/electron/preload.cjs', import.meta.url), 'utf8')

  assert.match(source, /contextBridge\.exposeInMainWorld\('keposBackend'/)
  assert.match(source, /ipcRenderer\.invoke\('kepos:backend:dispatch'/)
  assert.match(source, /ipcRenderer\.send\('kepos:backend:unsubscribe'/)
  assert.doesNotMatch(source, /require\('\.\.\/src\//)
  assert.doesNotMatch(source, /Hyperswarm/)
})

test('desktop electron backend ipc validates commands and forwards events', () => {
  const { createDesktopElectronBackendBridge } = require('../desktop/electron/backend-ipc.cjs')
  const handled = new Map()
  const sent = []
  const webContents = { send: (channel, payload) => sent.push([channel, payload]) }
  const ipcMain = {
    handle(channel, handler) {
      handled.set(channel, handler)
    },
    on(channel, handler) {
      handled.set(channel, handler)
    }
  }
  const bridge = createDesktopElectronBackendBridge({
    dispatch: (command, payload) => `${command}:${payload.value}`,
    ipcMain,
    webContents
  })

  const dispatch = handled.get('kepos:backend:dispatch')
  const subscribe = handled.get('kepos:backend:subscribe')
  const unsubscribe = handled.get('kepos:backend:unsubscribe')

  assert.ok(dispatch)
  assert.ok(subscribe)
  assert.ok(unsubscribe)
  assert.deepEqual(bridge.commands, DESKTOP_COMMANDS)
  assert.deepEqual(bridge.events, DESKTOP_EVENTS)
  assert.equal(dispatch({}, 'joinHome', { value: 'ok' }), 'joinHome:ok')
  assert.throws(() => dispatch({}, 'unknownCommand', {}), /Unknown desktop command/)

  subscribe({}, 'listener-1', 'treeholeStateChanged')
  bridge.emit('treeholeStateChanged', { status: 'ready' })
  unsubscribe({}, 'listener-1')
  bridge.emit('treeholeStateChanged', { status: 'ignored' })

  assert.deepEqual(sent, [
    [
      'kepos:backend:event',
      {
        event: 'treeholeStateChanged',
        listenerId: 'listener-1',
        payload: { status: 'ready' }
      }
    ]
  ])
})

test('desktop electron backend ipc can retarget events to a recreated window', () => {
  const { createDesktopElectronBackendBridge } = require('../desktop/electron/backend-ipc.cjs')
  const handled = new Map()
  const firstSent = []
  const secondSent = []
  const ipcMain = {
    handle(channel, handler) {
      handled.set(channel, handler)
    },
    on(channel, handler) {
      handled.set(channel, handler)
    }
  }
  const bridge = createDesktopElectronBackendBridge({
    dispatch: () => undefined,
    ipcMain,
    webContents: { send: (channel, payload) => firstSent.push([channel, payload]) }
  })
  const subscribe = handled.get('kepos:backend:subscribe')

  subscribe({}, 'listener-1', 'statusChanged')
  bridge.emit('statusChanged', { status: 'first' })
  bridge.setWebContents({ send: (channel, payload) => secondSent.push([channel, payload]) })
  bridge.emit('statusChanged', { status: 'second' })

  assert.deepEqual(firstSent, [
    [
      'kepos:backend:event',
      {
        event: 'statusChanged',
        listenerId: 'listener-1',
        payload: { status: 'first' }
      }
    ]
  ])
  assert.deepEqual(secondSent, [
    [
      'kepos:backend:event',
      {
        event: 'statusChanged',
        listenerId: 'listener-1',
        payload: { status: 'second' }
      }
    ]
  ])
})
