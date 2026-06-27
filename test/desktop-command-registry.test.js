import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { DESKTOP_COMMANDS } from '../src/desktop-command-vocabulary.ts'
import { createDesktopCommandRegistry } from '../src/desktop-command-registry.ts'

test('desktop command registry requires every V1 command handler', () => {
  assert.throws(
    () =>
      createDesktopCommandRegistry({
        handlers: Object.fromEntries(
          DESKTOP_COMMANDS.slice(1).map((command) => [command, () => {}])
        )
      }),
    /Missing desktop command handler: acceptMessageRequest/
  )
})

test('desktop command registry dispatches known commands and rejects unknown commands', async () => {
  const calls = []
  const registry = createDesktopCommandRegistry({
    handlers: Object.fromEntries(
      DESKTOP_COMMANDS.map((command) => [
        command,
        (payload) => {
          calls.push([command, payload])
          return `${command}:ok`
        }
      ])
    )
  })

  assert.deepEqual(registry.commands, DESKTOP_COMMANDS)
  assert.equal(await registry.dispatch('joinHome', { mode: 'host' }), 'joinHome:ok')
  assert.deepEqual(calls, [['joinHome', { mode: 'host' }]])
  await assert.rejects(() => registry.dispatch('shareScreen', {}), /Unknown desktop command/)
})

test('desktop controller routes UI actions through the command registry', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopCommandRegistry/)
  assert.match(source, /function dispatchCommand/)

  for (const command of [
    'joinHome',
    'ignoreMessageRequest',
    'leaveHome',
    'sendHomeMessage',
    'sendDmMessage',
    'postTreehole',
    'trustProfileUri',
    'joinHomeUri',
    'revokeContact',
    'acceptMessageRequest',
    'likeTreehole',
    'commentTreehole'
  ]) {
    assert.match(source, new RegExp(`dispatchCommand\\('${command}'`), `${command} is not routed`)
  }
})
