import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { createIdentityKeyPairFromSeed } from '../src/identity.js'
import { createSignedTrustInvitePayload, encodeQrUri } from '../src/signed-qr-payload.ts'

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desktopDir = path.join(repoDir, 'desktop')
const electronExecutable = path.join(
  desktopDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)
const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'kepos-desktop-contacts-'))
const contactAlias = 'Persistent smoke'
const contactIdentity = createIdentityKeyPairFromSeed(Buffer.alloc(32, 7))
const contactProfileUri = encodeQrUri(
  createSignedTrustInvitePayload({
    createdAt: 1_700_000_000_000,
    displayName: 'Trust Contact',
    identity: contactIdentity
  })
)
let app = null

try {
  const page = await launchDesktopApp()
  await trustContact(page)
  await waitForContact(page, contactAlias)

  const restartedPage = await restartDesktopApp()
  await waitForContact(restartedPage, contactAlias)

  console.log(
    JSON.stringify(
      {
        contactAlias,
        contactProfileId: contactIdentity.publicKey,
        userDataDir,
        verified: ['contact persists after desktop restart']
      },
      null,
      2
    )
  )
} finally {
  await app?.close().catch(() => {})
  await rm(userDataDir, { force: true, recursive: true }).catch(() => {})
}

async function launchDesktopApp() {
  app = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDir}`],
    cwd: desktopDir,
    env: {
      ...process.env,
      KEPOS_SMOKE_DESKTOP: '1'
    },
    executablePath: electronExecutable,
    timeout: 60000
  })

  const page = await app.firstWindow({ timeout: 60000 })
  await page.waitForLoadState('domcontentloaded')
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[desktop] ${message.text()}`)
  })
  await waitForInputPrefix(page, '#profileQrOutput', 'kepos://profile')

  return page
}

async function restartDesktopApp() {
  await app?.close()
  app = null

  return launchDesktopApp()
}

async function trustContact(page) {
  await page.fill('#trustQrInput', contactProfileUri)
  await page.fill('#trustAliasInput', contactAlias)
  await page.click('#trustButton')
}

async function waitForContact(page, alias) {
  await waitFor(async () => {
    const text = await page.locator('#contactList').textContent()
    return text?.includes(alias)
  }, `${alias} contact`)
}

async function waitForInputPrefix(page, selector, prefix) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible' })
  await waitFor(async () => (await locator.inputValue()).startsWith(prefix), `${selector} prefix`)
}

async function waitFor(predicate, label) {
  const deadline = Date.now() + 30000

  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for ${label}`)
}
