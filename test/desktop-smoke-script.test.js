import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop smoke is wired to Playwright Electron with isolated state', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(
    packageJson.scripts['smoke:desktop'],
    'npm run desktop:bundle && node scripts/smoke-desktop.mjs'
  )

  const source = await readFile(new URL('../scripts/smoke-desktop.mjs', import.meta.url), 'utf8')

  assert.match(source, /from 'playwright'/)
  assert.match(source, /_electron/)
  assert.match(source, /--user-data-dir=/)
  assert.match(source, /KEPOS_SMOKE_DESKTOP/)
})
