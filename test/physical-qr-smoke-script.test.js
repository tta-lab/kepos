import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('package scripts expose manual physical QR smoke helpers', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(
    packageJson.scripts['smoke:physical-qr'],
    'npm run desktop:bundle && node scripts/smoke-physical-qr.mjs'
  )
  assert.equal(
    packageJson.scripts['smoke:physical-qr:pear'],
    'npm run desktop:bundle && node scripts/smoke-physical-qr.mjs --pear'
  )
})

test('physical QR smoke stages desktop QR dialogs and Android scanners', async () => {
  const source = await readFile(
    new URL('../scripts/smoke-physical-qr.mjs', import.meta.url),
    'utf8'
  )

  for (const token of [
    '#showLargeProfileQrButton',
    '#showLargeHomeQrButton',
    'quick-scan-profile-qr-button',
    'quick-scan-home-qr-button',
    'qr-scanner-camera',
    'Trusted friend added.',
    'Connected.',
    'page.bringToFront()',
    'Desktop screenshot:',
    'KEPOS_SMOKE_DESKTOP: usePearRuntime ? undefined'
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('V1 smoke docs keep physical QR helper out of automatic gates', async () => {
  const guide = await readFile(new URL('../docs/v1.20-smoke-guide.md', import.meta.url), 'utf8')
  const recipe = await readFile(
    new URL('../docs/v1.21-cross-device-smoke.md', import.meta.url),
    'utf8'
  )

  assert.match(guide, /npm run smoke:physical-qr/)
  assert.match(guide, /npm run smoke:physical-qr:pear/)
  assert.match(guide, /not part of `npm run v1:gate`/)
  assert.match(recipe, /npm run smoke:physical-qr/)
  assert.match(recipe, /needs a human to aim the phone/)
})
