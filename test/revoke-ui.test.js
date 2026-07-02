import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop exposes contact revoke controls that update trust and DM threads', async () => {
  const app = await readFile(new URL('../desktop/app.tsx', import.meta.url), 'utf8')
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const session = await readFile(
    new URL('../src/desktop-backend-session.ts', import.meta.url),
    'utf8'
  )
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-trust-actions.ts', import.meta.url),
    'utf8'
  )

  assert.match(`${app}\n${people}`, /id='contactList'/)
  assert.match(session, /createDesktopBackendActions/)
  assert.match(backendActions, /revokeContact: trustActions\?\.revokeContact/)
  assert.match(actions, /createDesktopContactRevoke/)
  assert.match(actions, /async function revokeContact/)
  assert.match(actions, /dmRuntime\.closeThreads/)
  assert.doesNotMatch(controller, /from '..\/src\/revoke-state\.js'/)
  assert.doesNotMatch(controller, /from '..\/src\/dm-thread-storage\.js'/)
})

test('android exposes contact revoke controls and notifies Bare backend', async () => {
  const app = await readFile(new URL('../mobile/App.tsx', import.meta.url), 'utf8')
  const profile = await readFile(
    new URL('../mobile/profile-components.tsx', import.meta.url),
    'utf8'
  )
  const backend = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const rpc = await readFile(new URL('../rpc-commands.mjs', import.meta.url), 'utf8')

  assert.match(rpc, /RPC_DM_REVOKE/)
  assert.match(rpc, /RPC_TREEHOLE_POLICY/)
  assert.match(app, /revokeTrustedContact/)
  assert.match(app, /RPC_DM_REVOKE/)
  assert.match(app, /syncTreeholePolicy\(result\.treeholePolicy\)/)
  assert.match(profile, /UserMinus/)
  assert.match(backend, /revokeDmByProfile/)
  assert.match(backend, /RPC_TREEHOLE_POLICY/)
  assert.match(backend, /updateTreeholePolicy\(payload\)/)
  assert.match(backend, /dmRuntime\?\.closeThread/)
})
