import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { markSmokeStorage } from './smoke-storage.mjs'

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desktopDir = path.join(repoDir, 'desktop')
const electronExecutable = path.join(
  desktopDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)

const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'kepos-desktop-smoke-'))
await markSmokeStorage(userDataDir)
const usePearRuntime = process.argv.includes('--pear')
const homeMessageText = 'smoke home message'
const treeholePostText = 'smoke treehole post'
let app = null

try {
  const page = await launchDesktopApp()
  await page.waitForSelector('#profileQrOutput', { state: 'attached' })
  await waitForInputPrefix(page, '#profileQrOutput', 'kepos://profile')
  await waitForInputPrefix(page, '#homeQrOutput', 'kepos://home')
  const profileUri = await page.locator('#profileQrOutput').inputValue()
  const homeUri = await page.locator('#homeQrOutput').inputValue()

  await page.click('#createButton')
  await waitForText(page, '#noticeLabel', 'Home joined.')
  await page.locator('#leaveButton').waitFor({ state: 'visible' })

  await page.fill('#chatInput', homeMessageText)
  await page.click('#chatSendButton')
  await waitForTextIncludes(page, '#messageList', homeMessageText)

  await page.click('#treeholeTab')
  await page.fill('#treeholeInput', treeholePostText)
  await page.click('#treeholeSendButton')
  await waitForTextIncludes(page, '#treeholeList', treeholePostText)

  const restartedPage = await restartDesktopApp()
  await waitForInputValue(restartedPage, '#profileQrOutput', profileUri)
  await waitForInputValue(restartedPage, '#homeQrOutput', homeUri)
  await restartedPage.click('#createButton')
  await waitForText(restartedPage, '#noticeLabel', 'Home joined.')
  await restartedPage.click('#treeholeTab')
  await waitForTextIncludes(restartedPage, '#treeholeList', treeholePostText)

  const result = {
    homeMessage: homeMessageText,
    homeUri,
    notice: await restartedPage.locator('#noticeLabel').textContent(),
    peerCount: await restartedPage.locator('#peerLabel').textContent(),
    profileUri,
    roomLabel: await restartedPage.locator('#roomKeyLabel').textContent(),
    treeholePost: treeholePostText,
    treeholeStatus: await restartedPage.locator('#treeholeStatusLabel').textContent(),
    verified: [
      'profile QR remains stable after desktop restart',
      'home QR remains stable after desktop restart',
      'treehole post remains after desktop restart'
    ]
  }

  console.log(JSON.stringify(result, null, 2))
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
      KEPOS_SMOKE_DESKTOP: usePearRuntime ? undefined : '1'
    },
    executablePath: electronExecutable,
    timeout: 60000
  })

  const page = await app.firstWindow({ timeout: 60000 })
  await page.waitForLoadState('domcontentloaded')
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[desktop] ${message.text()}`)
  })
  const pageRequireType = await page.evaluate(() => typeof globalThis.require)
  if (pageRequireType !== 'undefined') {
    throw new Error(
      `Expected Electron renderer nodeIntegration to be disabled, got ${pageRequireType}`
    )
  }
  const controllerApiType = await page.evaluate(() => typeof globalThis.keposDesktopController)
  if (controllerApiType !== 'undefined') {
    throw new Error(`Expected browser controller script startup, got ${controllerApiType}`)
  }
  const bridgeShape = await page.evaluate(() => ({
    backendDispatch: typeof globalThis.keposBackend?.dispatch,
    backendSubscribe: typeof globalThis.keposBackend?.subscribe,
    storageBasePath: typeof globalThis.keposDesktopConfig?.storageBasePath
  }))
  if (
    bridgeShape.backendDispatch !== 'function' ||
    bridgeShape.backendSubscribe !== 'function' ||
    bridgeShape.storageBasePath !== 'string'
  ) {
    throw new Error(`Expected isolated preload bridge APIs, got ${JSON.stringify(bridgeShape)}`)
  }

  return page
}

async function restartDesktopApp() {
  await app?.close()
  app = null

  return launchDesktopApp()
}

async function waitForInputPrefix(page, selector, prefix) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'attached' })
  await waitFor(async () => (await locator.inputValue()).startsWith(prefix), `${selector} prefix`)
}

async function waitForInputValue(page, selector, expected) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'attached' })
  await waitFor(async () => (await locator.inputValue()) === expected, `${selector} value`)
}

async function waitForText(page, selector, expected) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible' })
  await waitFor(async () => (await locator.textContent()) === expected, `${selector} text`)
}

async function waitForTextIncludes(page, selector, expected) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible' })
  await waitFor(
    async () => (await locator.textContent())?.includes(expected),
    `${selector} text includes ${expected}`
  )
}

async function waitFor(predicate, label) {
  const deadline = Date.now() + 30000

  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for ${label}`)
}
