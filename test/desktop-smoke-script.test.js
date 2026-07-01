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
  assert.match(source, /markSmokeStorage\(userDataDir\)/)
  assert.match(source, /KEPOS_SMOKE_DESKTOP/)
  assert.match(source, /smoke home message/)
  assert.match(source, /smoke treehole post/)
  assert.match(source, /restartDesktopApp/)
  assert.match(source, /waitForInputValue\(restartedPage, '#profileQrOutput', profileUri\)/)
  assert.match(source, /waitForInputValue\(restartedPage, '#homeQrOutput', homeUri\)/)
  assert.match(source, /treehole post remains after desktop restart/)
  assert.match(source, /waitForTextIncludes\(page, '#messageList'/)
  assert.match(source, /waitForTextIncludes\(restartedPage, '#treeholeList'/)
})

test('desktop pear smoke runs the Electron app through pear-runtime', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(
    packageJson.scripts['smoke:desktop:pear'],
    'npm run desktop:bundle && node scripts/smoke-desktop.mjs --pear'
  )

  const source = await readFile(new URL('../scripts/smoke-desktop.mjs', import.meta.url), 'utf8')

  assert.match(source, /process\.argv\.includes\('--pear'\)/)
  assert.match(source, /KEPOS_SMOKE_DESKTOP:\s*usePearRuntime \? undefined : '1'/)
})

test('desktop contact persistence smoke restarts with the same user data', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(
    packageJson.scripts['smoke:desktop:contacts'],
    'npm run desktop:bundle && node scripts/smoke-desktop-contacts.mjs'
  )
  assert.equal(
    packageJson.scripts['smoke:desktop:contacts:pear'],
    'npm run desktop:bundle && node scripts/smoke-desktop-contacts.mjs --pear'
  )

  const source = await readFile(
    new URL('../scripts/smoke-desktop-contacts.mjs', import.meta.url),
    'utf8'
  )

  for (const marker of [
    'restartDesktopApp',
    'createSignedTrustInvitePayload',
    'Trust Contact',
    'Persistent smoke',
    'contact persists after desktop restart',
    'direct request persists after desktop restart',
    'contact stays revoked after desktop restart',
    'smoke direct request',
    'directRestartedPage',
    'revokeTrustedContact',
    'waitForContactMissing',
    'Friend removed.',
    'createButton',
    'peopleTab',
    'dmContactList',
    'dmList',
    'peopleActions',
    '--user-data-dir=',
    'markSmokeStorage\\(userDataDir\\)',
    "usePearRuntime = process.argv.includes\\('--pear'\\)",
    "KEPOS_SMOKE_DESKTOP: usePearRuntime \\? undefined : '1'"
  ]) {
    assert.match(source, new RegExp(marker), `${marker} is missing`)
  }
})
