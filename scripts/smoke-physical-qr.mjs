import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { markSmokeStorage } from './smoke-storage.mjs'

const serial = process.env.ANDROID_SERIAL || '32131JEHN00865'
const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desktopDir = path.join(repoDir, 'desktop')
const electronExecutable = path.join(
  desktopDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)
const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'kepos-physical-qr-desktop-'))
await markSmokeStorage(userDataDir)
const usePearRuntime = process.argv.includes('--pear')
const androidDevClientUrl = 'kepos://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
let app = null

try {
  prepareAndroidDevice()
  grantAndroidCameraPermission()
  ensureAdbReverse()
  await ensureMetroServer()

  app = await launchDesktopApp()
  const page = await app.firstWindow({ timeout: 60000 })
  await page.waitForLoadState('domcontentloaded')
  await page.setViewportSize({ height: 900, width: 1280 })
  await page.bringToFront()
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[desktop] ${message.text()}`)
  })

  await waitForInputPrefix(page, '#profileQrOutput', 'kepos://profile')
  await waitForInputPrefix(page, '#homeQrOutput', 'kepos://home')
  await page.click('#createButton')
  await waitForText(page, '#noticeLabel', 'Home joined.')

  launchAndroidDevClient()
  await waitForAndroidAppSurface()
  await leaveAndroidHomeIfNeeded()

  await clickDesktopContextButton(page, '#showLargeProfileQrButton')
  await page.locator('#largeQrDialog:not(.hidden)').waitFor({ state: 'visible' })
  await page.bringToFront()
  await openAndroidPeopleSetup()
  await openAndroidScanner('scan-profile-qr-button')
  console.log('Point the Android camera at the desktop Profile QR.')
  await waitForAndroidTextWithDiagnostics(
    page,
    'Write a friend request to introduce yourself.',
    'profile',
    {
      timeoutMs: 180000
    }
  )
  await page.click('#largeQrCloseButton')

  await clickDesktopContextButton(page, '#showLargeHomeQrButton')
  await page.locator('#largeQrDialog:not(.hidden)').waitFor({ state: 'visible' })
  await page.bringToFront()
  await openAndroidPeopleSetup()
  await openAndroidScanner('scan-home-qr-button')
  console.log('Point the Android camera at the desktop Debug Home QR.')
  await waitForAndroidTextWithDiagnostics(page, 'Connected.', 'home', { timeoutMs: 180000 })
  await page.click('#largeQrCloseButton')

  await waitForAndroidResourceId('home-title')

  console.log(
    JSON.stringify(
      {
        android: {
          notice: textByResourceId(dumpAndroidUi(), 'app-notice'),
          screen: 'home'
        },
        desktop: {
          homeUri: await page.locator('#homeQrOutput').inputValue(),
          notice: await page.locator('#noticeLabel').textContent(),
          profileUri: await page.locator('#profileQrOutput').inputValue()
        },
        verified: [
          'desktop Large Profile QR scans through the Android camera',
          'Profile QR creates Android trust through the normal scanner path',
          'desktop Large Debug Home QR scans through the Android camera',
          'Debug Home QR joins the trusted-only home after local trust exists'
        ]
      },
      null,
      2
    )
  )
} finally {
  await app?.close().catch(() => {})
  await rm(userDataDir, { force: true, recursive: true }).catch(() => {})
}

function launchDesktopApp() {
  return electron.launch({
    args: ['.', `--user-data-dir=${userDataDir}`],
    cwd: desktopDir,
    env: {
      ...process.env,
      KEPOS_DESKTOP_PEAR: usePearRuntime ? '1' : undefined,
      KEPOS_SMOKE_DESKTOP: '1'
    },
    executablePath: electronExecutable,
    timeout: 60000
  })
}

function launchAndroidDevClient() {
  runAdb(['reverse', 'tcp:8081', 'tcp:8081'])
  runAdb(['shell', 'am', 'force-stop', 'io.guion.kepos'])
  runAdb([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    androidDevClientUrl,
    'io.guion.kepos'
  ])
}

async function openAndroidScanner(testId) {
  await waitForAndroidResourceId(testId)
  tapAndroidResourceId(testId)
  await waitForAndroidResourceId('qr-scanner-camera')
}

async function openAndroidPeopleSetup() {
  if (boundsByResourceId(dumpAndroidUi(), 'scan-profile-qr-button')) return

  await waitForAndroidResourceId('people-tab')
  tapAndroidResourceId('people-tab')
  await waitForAndroidResourceId('scan-profile-qr-button')
}

async function clickDesktopContextButton(page, selector) {
  const button = page.locator(selector)
  await button.evaluate((node) => {
    const group = node.closest('details')
    if (group) group.open = true
    node.scrollIntoView({ block: 'center', inline: 'center' })
  })
  await button.click()
}

async function leaveAndroidHomeIfNeeded() {
  const xml = dumpAndroidUi()
  if (!boundsByResourceId(xml, 'leave-home-button')) return

  tapAndroidResourceId('leave-home-button')
  await waitForAndroidResourceId('create-home-button')
}

function prepareAndroidDevice() {
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'])
  runAdb(['shell', 'wm', 'dismiss-keyguard'])
  runAdb(['shell', 'cmd', 'statusbar', 'collapse'])
}

function grantAndroidCameraPermission() {
  runAdb(['shell', 'pm', 'grant', 'io.guion.kepos', 'android.permission.CAMERA'])
}

function ensureAdbReverse() {
  runAdb(['reverse', 'tcp:8081', 'tcp:8081'])
}

async function ensureMetroServer() {
  try {
    const response = await fetch('http://127.0.0.1:8081/status', {
      signal: AbortSignal.timeout(2500)
    })
    const body = await response.text()

    if (response.ok && body.includes('packager-status:running')) return
  } catch {
    // Fall through to the actionable error below.
  }

  throw new Error(
    'Physical QR smoke requires Metro on http://127.0.0.1:8081. Start it with npm run mobile:start.'
  )
}

async function waitForAndroidAppSurface() {
  await waitFor(async () => {
    const xml = await dumpAndroidUi()
    return (
      xml.includes('resource-id="lobby-scroll"') ||
      xml.includes('resource-id="home-title"') ||
      xml.includes('resource-id="people-tab"')
    )
  }, 'Android app surface')
}

function waitForAndroidResourceId(resourceId) {
  return waitFor(
    () => Boolean(boundsByResourceId(dumpAndroidUi(), resourceId)),
    `Android resource ${resourceId}`
  )
}

async function waitForAndroidText(text, { timeoutMs = 60000 } = {}) {
  await waitFor(
    async () => textIncludes(decodeXml(await dumpAndroidUi()), text),
    `Android text ${text}`,
    { timeoutMs }
  )
}

async function waitForAndroidTextWithDiagnostics(page, text, label, { timeoutMs }) {
  try {
    await waitForAndroidText(text, { timeoutMs })
  } catch (error) {
    const desktopScreenshotPath = path.join(os.tmpdir(), `kepos-physical-qr-${label}-desktop.png`)
    const androidScreenshotPath = path.join(os.tmpdir(), `kepos-physical-qr-${label}-android.png`)
    await page.screenshot({ fullPage: true, path: desktopScreenshotPath }).catch(() => {})
    await captureAndroidScreenshot(androidScreenshotPath).catch(() => {})
    const focus = runAdbAllowFailure(['shell', 'dumpsys', 'window'])
      .split('\n')
      .filter((line) => line.includes('mCurrentFocus') || line.includes('mFocusedApp'))
      .join('\n')
    throw new Error(
      `${error.message}\nDesktop screenshot: ${desktopScreenshotPath}\nAndroid screenshot: ${androidScreenshotPath}\nAndroid focus:\n${focus}`
    )
  }
}

async function captureAndroidScreenshot(filePath) {
  const result = spawnSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], {
    encoding: 'buffer',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  if (result.status !== 0) {
    throw new Error(`adb screencap failed: ${result.stderr?.toString() || result.stdout}`)
  }

  await writeFile(filePath, result.stdout)
}

function tapAndroidResourceId(resourceId) {
  const xml = dumpAndroidUi()
  const bounds = boundsByResourceId(xml, resourceId)
  if (!bounds) throw new Error(`Android resource ${resourceId} is missing`)

  runAdb(['shell', 'input', 'tap', String(bounds.x), String(bounds.y)])
}

function dumpAndroidUi() {
  return runAdb(['exec-out', 'uiautomator', 'dump', '/dev/tty'])
}

function textByResourceId(xml, resourceId) {
  const escaped = resourceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const node = xml.match(new RegExp(`<node[^>]*resource-id="${escaped}"[^>]*/?>`))?.[0]
  const match = node?.match(/text="([^"]*)"/)
  return match ? decodeXml(match[1]) : null
}

function boundsByResourceId(xml, resourceId) {
  const escaped = resourceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const node = xml.match(new RegExp(`<node[^>]*resource-id="${escaped}"[^>]*/?>`))?.[0]
  const match = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
  if (!match) return null

  const [, left, top, right, bottom] = match.map(Number)
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2)
  }
}

async function waitForInputPrefix(page, selector, prefix) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'attached' })
  await waitFor(async () => (await locator.inputValue()).startsWith(prefix), `${selector} prefix`)
}

async function waitForText(page, selector, expected) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible' })
  await waitFor(async () => (await locator.textContent()) === expected, `${selector} text`)
}

async function waitFor(predicate, label, { timeoutMs = 60000 } = {}) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await predicate()) return
    await delay(250)
  }

  throw new Error(`Timed out waiting for ${label}`)
}

function runAdb(args) {
  const result = spawnSync('adb', ['-s', serial, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

  if (result.status !== 0) {
    throw new Error(`adb ${args.join(' ')} failed: ${result.stderr || result.stdout}`)
  }

  return result.stdout
}

function runAdbAllowFailure(args) {
  const result = spawnSync('adb', ['-s', serial, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

  return result.stdout || result.stderr || ''
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function textIncludes(text, expected) {
  return String(text || '').includes(expected)
}

function decodeXml(value = '') {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}
