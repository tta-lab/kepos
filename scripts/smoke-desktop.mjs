import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desktopDir = path.join(repoDir, 'desktop')
const electronExecutable = path.join(
  desktopDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)

const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'kepos-desktop-smoke-'))
let app = null

try {
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

  await page.waitForSelector('#profileQrOutput')
  await waitForInputPrefix(page, '#profileQrOutput', 'kepos://profile')
  await waitForInputPrefix(page, '#homeQrOutput', 'kepos://home')

  await page.click('#createButton')
  await waitForText(page, '#noticeLabel', 'Home joined.')
  await page.locator('#leaveButton').waitFor({ state: 'visible' })

  const result = {
    homeUri: await page.locator('#homeQrOutput').inputValue(),
    notice: await page.locator('#noticeLabel').textContent(),
    peerCount: await page.locator('#peerLabel').textContent(),
    profileUri: await page.locator('#profileQrOutput').inputValue(),
    roomLabel: await page.locator('#roomKeyLabel').textContent(),
    treeholeStatus: await page.locator('#treeholeStatusLabel').textContent()
  }

  console.log(JSON.stringify(result, null, 2))
} finally {
  await app?.close().catch(() => {})
  await rm(userDataDir, { force: true, recursive: true }).catch(() => {})
}

async function waitForInputPrefix(page, selector, prefix) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible' })
  await waitFor(async () => (await locator.inputValue()).startsWith(prefix), `${selector} prefix`)
}

async function waitForText(page, selector, expected) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible' })
  await waitFor(async () => (await locator.textContent()) === expected, `${selector} text`)
}

async function waitFor(predicate, label) {
  const deadline = Date.now() + 30000

  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for ${label}`)
}
