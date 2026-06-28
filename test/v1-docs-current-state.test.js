import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

function readText(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('V1 architecture docs describe the Pear Bare bridge as app-smoke proven', async () => {
  const architecture = await readText('../docs/v1.11-mlp-desktop-react-architecture.md')
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')

  assert.doesNotMatch(architecture, /Current status: pending\./)
  assert.doesNotMatch(architecture, /pending Bare bridge/)
  assert.doesNotMatch(audit, /next implementation phase should be the desktop backend bridge/i)
  assert.match(architecture, /smoke:desktop:pear/)
  assert.match(audit, /smoke:desktop:pear/)
})

test('V1 smoke docs include the desktop Pear Bare smoke path', async () => {
  const guide = await readText('../docs/v1.20-smoke-guide.md')
  const recipe = await readText('../docs/v1.21-cross-device-smoke.md')

  assert.match(guide, /npm run smoke:desktop:pear/)
  assert.match(guide, /npm run smoke:desktop:contacts:pear/)
  assert.match(guide, /Pear\/Bare/)
  assert.match(guide, /revoked trusted contact stays hidden after restart/)
  assert.match(recipe, /npm run smoke:desktop:pear/)
  assert.match(recipe, /npm run smoke:desktop:contacts:pear/)
  assert.match(recipe, /revoked trusted contact stays hidden after restart/)
})
