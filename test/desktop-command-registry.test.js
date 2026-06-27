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

test('desktop home message command carries composer text as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(
    source,
    /sendHomeMessage: \(\{ text \}\) => dispatchCommand\('sendHomeMessage', \{ text \}\)/
  )
  assert.match(source, /globalThis\.keposDesktopUi\?\.setHomeComposerActions\(\{/)
  assert.match(source, /sendHomeMessage: \(payload\) => sendChat\(readCommandPayload\(payload\)\)/)
  assert.match(source, /function sendChat\(\{ text \} = \{\}\)/)
  assert.doesNotMatch(
    source,
    /function sendChat\(\) \{\s*const text = els\.chatInput\.value\.trim\(\)/
  )
})

test('desktop direct message command carries composer fields as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(
    source,
    /dispatchCommand\('sendDmMessage', \{\s*text: els\.dmInput\.value\.trim\(\),\s*toProfileId: els\.dmRecipientInput\.value\.trim\(\)\s*\}\)/
  )
  assert.match(
    source,
    /sendDmMessage: \(payload\) => sendMessageRequest\(readCommandPayload\(payload\)\)/
  )
  assert.match(source, /function sendMessageRequest\(\{ text, toProfileId \} = \{\}\)/)
  assert.doesNotMatch(
    source,
    /function sendMessageRequest\(\) \{\s*const toProfileId = els\.dmRecipientInput\.value\.trim\(\)\s*const text = els\.dmInput\.value\.trim\(\)/
  )
})

test('desktop treehole post command carries composer text as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(
    source,
    /dispatchCommand\('postTreehole', \{\s*text: els\.treeholeInput\.value\.trim\(\)\s*\}\)/
  )
  assert.match(source, /postTreehole: \(payload\) => postTreehole\(readCommandPayload\(payload\)\)/)
  assert.match(source, /async function postTreehole\(\{ text \} = \{\}\)/)
  assert.doesNotMatch(
    source,
    /async function postTreehole\(\) \{\s*const text = els\.treeholeInput\.value\.trim\(\)/
  )
})

test('desktop Home QR join command carries QR text and display name as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(
    source,
    /dispatchCommand\('joinHomeUri', \{\s*displayName: els\.nickInput\.value\.trim\(\) \|\| 'Desktop',\s*uri: els\.homeQrInput\.value\.trim\(\)\s*\}\)/
  )
  assert.match(source, /joinHomeUri: \(payload\) => joinHomeQr\(readCommandPayload\(payload\)\)/)
  assert.match(source, /async function joinHomeQr\(\{ displayName = 'Desktop', uri \} = \{\}\)/)
  assert.doesNotMatch(
    source,
    /async function joinHomeQr\(\) \{\s*const uri = els\.homeQrInput\.value\.trim\(\)/
  )
})

test('desktop Profile QR trust command carries QR text alias and display name as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(
    source,
    /dispatchCommand\('trustProfileUri', \{\s*alias: els\.trustAliasInput\.value,\s*displayName: els\.nickInput\.value\.trim\(\) \|\| 'Desktop',\s*uri: els\.trustQrInput\.value\.trim\(\)\s*\}\)/
  )
  assert.match(
    source,
    /trustProfileUri: \(payload\) => trustProfileQr\(readCommandPayload\(payload\)\)/
  )
  assert.match(
    source,
    /function trustProfileQr\(\{ alias = '', displayName = 'Desktop', uri \} = \{\}\)/
  )
  assert.doesNotMatch(
    source,
    /function trustProfileQr\(\) \{\s*const uri = els\.trustQrInput\.value\.trim\(\)/
  )
})
