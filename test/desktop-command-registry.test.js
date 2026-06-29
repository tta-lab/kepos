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

test('desktop controller routes UI actions through the command host', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(
    new URL('../src/desktop-local-backend-host.ts', import.meta.url),
    'utf8'
  )
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const localBackend = await readFile(
    new URL('../desktop/local-backend.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /loadLocalBackendSessionFactory/)
  assert.match(localBackend, /createDesktopBackendSession/)
  assert.match(session, /createDesktopLocalBackendHost/)
  assert.match(host, /createDesktopCommandHost/)
  assert.doesNotMatch(source, /createDesktopCommandRegistry/)
  assert.match(source, /createDesktopUiActionBindings/)
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
    assert.match(bindings, new RegExp(`dispatchCommand\\('${command}'`), `${command} is not routed`)
  }
})

test('desktop home message command carries composer text as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.js', import.meta.url),
    'utf8'
  )

  assert.match(
    bindings,
    /sendHomeMessage: \(\{ text \}\) => dispatchCommand\('sendHomeMessage', \{ text \}\)/
  )
  assert.match(bindings, /ui\?\.setHomeComposerActions\(\{/)
  assert.match(
    host,
    /sendHomeMessage: \(payload\) => actions\.sendHomeMessage\(readCommandPayload\(payload\)\)/
  )
  assert.match(session, /createDesktopBackendActions/)
  assert.match(backendActions, /sendHomeMessage: messageActions\?\.sendHomeMessage/)
  assert.match(actions, /sendHomeMessage\(\{ text \} = \{\}\)/)
  assert.doesNotMatch(
    source,
    /function sendChat\(\) \{\s*const text = els\.chatInput\.value\.trim\(\)/
  )
})

test('desktop direct message command carries composer fields as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.js', import.meta.url),
    'utf8'
  )

  assert.match(
    bindings,
    /sendDirectMessage: \(\{ text, toProfileId \}\) =>\s*dispatchCommand\('sendDmMessage', \{ text, toProfileId \}\)/
  )
  assert.match(bindings, /ui\?\.setDirectComposerActions\(\{/)
  assert.match(source, /globalThis\.keposDesktopDispatchCommand = dispatchCommand/)
  assert.match(
    host,
    /sendDmMessage: \(payload\) => actions\.sendDmMessage\(readCommandPayload\(payload\)\)/
  )
  assert.match(backendActions, /sendDmMessage: messageActions\?\.sendDmMessage/)
  assert.match(actions, /sendDmMessage\(\{ text, toProfileId \} = \{\}\)/)
  assert.doesNotMatch(source, /dmForm: document\.querySelector/)
  assert.doesNotMatch(source, /dmInput: document\.querySelector/)
  assert.doesNotMatch(source, /dmRecipientInput: document\.querySelector/)
  assert.doesNotMatch(
    source,
    /function sendMessageRequest\(\) \{\s*const toProfileId = els\.dmRecipientInput\.value\.trim\(\)\s*const text = els\.dmInput\.value\.trim\(\)/
  )
})

test('desktop treehole post command carries composer text as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.js', import.meta.url),
    'utf8'
  )

  assert.match(
    bindings,
    /postTreehole: \(\{ text \}\) => dispatchCommand\('postTreehole', \{ text \}\)/
  )
  assert.match(bindings, /ui\?\.setTreeholeComposerActions\(\{/)
  assert.match(
    host,
    /postTreehole: \(payload\) => actions\.postTreehole\(readCommandPayload\(payload\)\)/
  )
  assert.match(backendActions, /postTreehole: messageActions\?\.postTreehole/)
  assert.match(actions, /async postTreehole\(\{ text \} = \{\}\)/)
  assert.doesNotMatch(
    source,
    /async function postTreehole\(\) \{\s*const text = els\.treeholeInput\.value\.trim\(\)/
  )
})

test('desktop Home QR join command carries QR text and display name as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(new URL('../src/desktop-room-actions.js', import.meta.url), 'utf8')

  assert.match(
    bindings,
    /joinHomeQr: \(\{ displayName, uri \}\) =>\s*dispatchCommand\('joinHomeUri', \{ displayName, uri \}\)/
  )
  assert.match(bindings, /ui\?\.setContextFormActions\(\{/)
  assert.match(
    host,
    /joinHomeUri: \(payload\) => actions\.joinHomeUri\(readCommandPayload\(payload\)\)/
  )
  assert.match(backendActions, /joinHomeUri: roomActions\?\.joinHomeUri/)
  assert.match(actions, /async function joinHomeUri\(\{ displayName = 'Desktop', uri \} = \{\}\)/)
  assert.doesNotMatch(source, /homeQrForm: document\.querySelector/)
  assert.doesNotMatch(source, /homeQrInput: document\.querySelector/)
  assert.doesNotMatch(source, /nickInput: document\.querySelector/)
  assert.doesNotMatch(
    source,
    /async function joinHomeQr\(\) \{\s*const uri = els\.homeQrInput\.value\.trim\(\)/
  )
  assert.doesNotMatch(source, /async function joinHomeQr/)
})

test('desktop Profile QR trust command carries QR text alias and display name as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-trust-actions.js', import.meta.url),
    'utf8'
  )

  assert.match(
    bindings,
    /trustProfileQr: \(\{ alias, displayName, uri \}\) =>\s*dispatchCommand\('trustProfileUri', \{ alias, displayName, uri \}\)/
  )
  assert.match(bindings, /ui\?\.setContextFormActions\(\{/)
  assert.match(
    host,
    /trustProfileUri: \(payload\) => actions\.trustProfileUri\(readCommandPayload\(payload\)\)/
  )
  assert.match(backendActions, /trustProfileUri: trustActions\?\.trustProfileUri/)
  assert.match(
    actions,
    /function trustProfileUri\(\{ alias = '', displayName = 'Desktop', uri \} = \{\}\)/
  )
  assert.doesNotMatch(source, /trustForm: document\.querySelector/)
  assert.doesNotMatch(source, /trustQrInput: document\.querySelector/)
  assert.doesNotMatch(source, /trustAliasInput: document\.querySelector/)
  assert.doesNotMatch(
    source,
    /function trustProfileQr\(\) \{\s*const uri = els\.trustQrInput\.value\.trim\(\)/
  )
  assert.doesNotMatch(source, /function trustProfileQr/)
})

test('desktop display name updates are mirrored to the backend command bridge', async () => {
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const session = await readFile(
    new URL('../src/desktop-backend-session.js', import.meta.url),
    'utf8'
  )

  assert.match(bindings, /updateDisplayName\(displayName\)/)
  assert.match(bindings, /dispatchCommand\('updateDisplayName', \{ displayName \}\)/)
  assert.match(
    host,
    /updateDisplayName: \(payload\) => actions\.updateDisplayName\(readCommandPayload\(payload\)\)/
  )
  assert.match(backendActions, /updateDisplayName: displayNameActions\?\.updateDisplayName/)
  assert.match(session, /updateDisplayName\(\{ displayName \} = \{\}\)/)
  assert.match(session, /controllerState\.setCurrentDisplayName\(displayName\)/)
})
