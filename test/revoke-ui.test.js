import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop exposes contact revoke controls that update trust and DM threads', async () => {
  const app = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(app, /id='contactList'/)
  assert.match(controller, /applyLocalContactRevoke/)
  assert.match(controller, /async function revokeLocalContact/)
  assert.match(controller, /dmRuntime\?\.closeThread/)
})

test('android exposes contact revoke controls and notifies Bare backend', async () => {
  const app = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const backend = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const rpc = await readFile(new URL('../rpc-commands.mjs', import.meta.url), 'utf8')

  assert.match(rpc, /RPC_DM_REVOKE/)
  assert.match(app, /revokeTrustedContact/)
  assert.match(app, /RPC_DM_REVOKE/)
  assert.match(app, /UserMinus/)
  assert.match(backend, /revokeDmByProfile/)
  assert.match(backend, /dmRuntime\?\.closeThread/)
})
