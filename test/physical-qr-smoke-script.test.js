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
    'people-tab',
    'scan-profile-qr-button',
    'scan-home-qr-button',
    'qr-scanner-camera',
    'Write a friend request to introduce yourself.',
    'Connected.',
    'page.bringToFront()',
    'markSmokeStorage(userDataDir)',
    'Desktop screenshot:',
    'Android screenshot:',
    "exec-out', 'screencap', '-p",
    "KEPOS_DESKTOP_PEAR: usePearRuntime ? '1' : undefined",
    "KEPOS_SMOKE_DESKTOP: '1'"
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
  assert.doesNotMatch(`${guide}\n${recipe}`, /physical QR release proof (passed|remains)/i)
})

test('cross-device recipe defines the final V1 normal product proof packet', async () => {
  const guide = await readFile(new URL('../docs/v1.20-smoke-guide.md', import.meta.url), 'utf8')
  const recipe = await readFile(
    new URL('../docs/v1.21-cross-device-smoke.md', import.meta.url),
    'utf8'
  )

  assert.match(recipe, /## Final V1 Release Proof Packet/)
  assert.match(recipe, /commit SHA and branch/)
  assert.match(recipe, /desktop mode: normal Electron; optionally record Pear\/Bare worker/)
  assert.match(recipe, /Android device model and `ANDROID_SERIAL`/)
  assert.match(recipe, /whether physical Profile QR scan passed/)
  assert.match(recipe, /Advanced Debug Home QR scan passed as a transport-descriptor check/)
  assert.doesNotMatch(recipe, /Profile QR and Home QR scan both passed/)
  assert.match(recipe, /Android scans the desktop Profile QR through the camera/)
  assert.match(recipe, /Android sends a friend request/)
  assert.match(recipe, /Android still shows the outgoing request as Request pending after restart/)
  assert.match(recipe, /Desktop ignores the friend request/)
  assert.match(recipe, /chooses Allow requests/)
  assert.match(recipe, /Desktop accepts the second friend request/)
  assert.match(recipe, /Both sides still show the trusted contact and the prior Chat thread/)
  assert.match(recipe, /explicitly chooses Enter Home/)
  assert.match(recipe, /Recent posts/)
  assert.match(recipe, /Desktop revokes Android from Contacts/)
  assert.match(recipe, /debug and physical QR helpers are sub-proofs/)
  assert.match(guide, /Final V1 release proof should use the one-run packet/)
  assert.match(guide, /Android Chat persistence across restart/)
  assert.match(guide, /post-restart\s+Chat delivery/)
  assert.match(guide, /accepted Chat receive path/)
  assert.match(guide, /The debug and physical QR helpers are\s+sub-proofs/)
  assert.doesNotMatch(guide, /Android DM persistence across restart/)
  assert.doesNotMatch(guide, /post-restart DM delivery/)
  assert.doesNotMatch(guide, /accepted DM receive path/)
})
