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
    new URL('../src/desktop-backend-session.ts', import.meta.url),
    'utf8'
  )
  const host = await readFile(
    new URL('../src/desktop-local-backend-host.ts', import.meta.url),
    'utf8'
  )
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const localBackend = await readFile(
    new URL('../desktop/local-backend.ts', import.meta.url),
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
    'allowContactRequests',
    'ignoreMessageRequest',
    'leaveHome',
    'sendHomeMessage',
    'sendDmMessage',
    'postTreehole',
    'retryOutgoingFriendRequest',
    'prepareProfileRequestTarget',
    'joinHomeUri',
    'revokeContact',
    'markDmThreadRead',
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
    new URL('../src/desktop-backend-session.ts', import.meta.url),
    'utf8'
  )
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.ts', import.meta.url),
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
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.ts', import.meta.url),
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
  assert.match(actions, /retryOutgoingFriendRequest\(\{ profileId \} = \{\}\)/)
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
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-actions.ts', import.meta.url),
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
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(new URL('../src/desktop-room-actions.ts', import.meta.url), 'utf8')

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
  assert.match(
    actions,
    /async function joinHomeUri\(\{[\s\S]*displayName = 'Desktop',[\s\S]*uri[\s\S]*\}: RoomActionPayload = \{\}\)/
  )
  assert.doesNotMatch(source, /homeQrForm: document\.querySelector/)
  assert.doesNotMatch(source, /homeQrInput: document\.querySelector/)
  assert.doesNotMatch(source, /nickInput: document\.querySelector/)
  assert.doesNotMatch(
    source,
    /async function joinHomeQr\(\) \{\s*const uri = els\.homeQrInput\.value\.trim\(\)/
  )
  assert.doesNotMatch(source, /async function joinHomeQr/)
})

test('desktop Profile QR request target command carries QR text alias and display name as payload', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-trust-actions.ts', import.meta.url),
    'utf8'
  )

  assert.match(
    bindings,
    /prepareProfileRequestTarget: \(\{ alias, displayName, uri \}\) => \{[\s\S]*const result = dispatchCommand\('prepareProfileRequestTarget', \{ alias, displayName, uri \}\)[\s\S]*setTab\('dm'\)[\s\S]*return result/
  )
  assert.match(bindings, /ui\?\.setContextFormActions\(\{/)
  assert.match(
    host,
    /prepareProfileRequestTarget: \(payload\) =>\s*actions\.prepareProfileRequestTarget\(readCommandPayload\(payload\)\)/
  )
  assert.match(
    backendActions,
    /prepareProfileRequestTarget: trustActions\?\.prepareProfileRequestTarget/
  )
  assert.match(
    actions,
    /function prepareProfileRequestTarget\(\{[\s\S]*displayName = 'Desktop',[\s\S]*uri[\s\S]*\}: ProfileRequestTargetPayload = \{\}\)/
  )
  assert.match(actions, /readProfileTrustQr\(\{[\s\S]*uri[\s\S]*\}\)/)
  assert.match(actions, /createProfileRequestTargetSelection\(\{[\s\S]*displayNameOverride: alias/)
  assert.match(actions, /setDirectComposerRecipient\(selection\.profileId\)/)
  assert.match(actions, /setProfileRequestTarget\(selection\.targetView\)/)
  assert.match(actions, /setNotice\(selection\.notice\)/)
  assert.doesNotMatch(bindings, /trustProfileQr|trustProfileUri/)
  assert.doesNotMatch(host, /trustProfileUri/)
  assert.doesNotMatch(backendActions, /trustProfileUri/)
  assert.doesNotMatch(actions, /trustProfileUri|TrustProfileUriPayload/)
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
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const host = await readFile(new URL('../src/desktop-command-host.ts', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const session = await readFile(
    new URL('../src/desktop-backend-session.ts', import.meta.url),
    'utf8'
  )

  assert.match(bindings, /updateDisplayName\(displayName\)/)
  assert.match(bindings, /dispatchCommand\('updateDisplayName', \{ displayName \}\)/)
  assert.match(bindings, /updateAvatarUri\(avatarUri\)/)
  assert.match(bindings, /dispatchCommand\('updateAvatarUri', \{ avatarUri \}\)/)
  assert.match(
    host,
    /updateDisplayName: \(payload\) => actions\.updateDisplayName\(readCommandPayload\(payload\)\)/
  )
  assert.match(
    host,
    /updateAvatarUri: \(payload\) => actions\.updateAvatarUri\(readCommandPayload\(payload\)\)/
  )
  assert.match(backendActions, /updateDisplayName: displayNameActions\?\.updateDisplayName/)
  assert.match(backendActions, /updateAvatarUri: displayNameActions\?\.updateAvatarUri/)
  assert.match(
    session,
    /updateDisplayName\(\{ displayName \}: \{ displayName\?: string \} = \{\}\)/
  )
  assert.match(session, /controllerState\.setCurrentDisplayName\(displayName\)/)
  assert.match(session, /updateAvatarUri\(\{ avatarUri \}: \{ avatarUri\?: string \} = \{\}\)/)
  assert.match(session, /controllerState\.setCurrentAvatarUri\(avatarUri\)/)
})
