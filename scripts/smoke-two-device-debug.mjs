import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'

const serial = process.env.ANDROID_SERIAL || '32131JEHN00865'
const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desktopDir = path.join(repoDir, 'desktop')
const electronExecutable = path.join(
  desktopDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)
const maestro = resolveMaestroCommand()
const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'kepos-two-device-desktop-'))
const workDir = await mkdtemp(path.join(os.tmpdir(), 'kepos-two-device-'))
const usePearRuntime = process.argv.includes('--pear')
const androidDevClientUrl = 'kepos://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
const androidChatText = 'Android hello'
const androidDmAfterRestartText = 'Android DM after restart'
const androidDmAfterRevokeText = 'Android DM after revoke'
const androidDmBodyText = 'Android signed DM body'
const androidMessageRequestText = 'Android DM request'
const desktopChatText = 'desktop hello'
const desktopDmBodyText = 'desktop signed DM body'
const desktopTreeholeText = 'desktop treehole smoke'
const directAdvertisedHost =
  process.env.KEPOS_DIRECT_ADVERTISED_HOST || resolveDirectAdvertisedHost()
const smokeInputMethod = 'org.futo.inputmethod.latin/.LatinIME'
let app = null
let page = null
let restoreAndroidInputMethod = () => {}

try {
  prepareAndroidDevice()
  configureAndroidSmokeInputMethod()
  grantAndroidCameraPermission()
  ensureAdbReverse()
  await ensureMetroServer()

  page = await launchDesktopApp()

  await waitForInputPrefix(page, '#profileQrOutput', 'kepos://profile')
  await waitForInputPrefix(page, '#homeQrOutput', 'kepos://home')

  const desktopProfileUri = await page.locator('#profileQrOutput').inputValue()
  const desktopHomeUri = await page.locator('#homeQrOutput').inputValue()
  const desktopProfile = decodeKeposUri(desktopProfileUri)
  const desktopHome = decodeKeposUri(desktopHomeUri)

  const androidProfileUri = await readAndroidProfileUri()
  const androidProfile = decodeKeposUri(androidProfileUri)
  resetAndroidSmokeData()

  await openDesktopPeopleActions(page)
  await page.fill('#trustQrInput', androidProfileUri)
  await page.fill('#trustAliasInput', 'Android smoke')
  await page.click('#trustButton')
  await waitFor(async () => {
    const contacts = await page.locator('#contactList').textContent()
    return contacts?.includes(shorten(androidProfile.profileId))
  }, 'desktop trusted Android contact')

  await page.click('#createButton')
  await waitForText(page, '#noticeLabel', 'Home joined.')
  const desktopDirectEndpoint = await waitForDesktopDirectEndpoint(page)

  await writeAndroidContactBook({
    alias: 'Desktop smoke',
    ownerProfileId: androidProfile.profileId,
    trustedProfileId: desktopProfile.profileId
  })

  await runAndroidJoinFlow(desktopHome.roomKey, desktopDirectEndpoint)
  await waitForDesktopPeer(page, 'desktop and Android connect as peers')

  await page.fill('#chatInput', desktopChatText)
  await page.keyboard.press('Enter')
  await waitForAndroidText(desktopChatText)

  await sendAndroidChat()
  await waitForDesktopChatText(page, androidChatText)

  await page.click('#treeholeTab')
  await page.fill('#treeholeInput', desktopTreeholeText)
  await page.click('#treeholeForm button[type="submit"]')
  await waitForDesktopTreeholeText(page, desktopTreeholeText)
  await tapAndroidByTestId('treehole-tab')
  await waitForAndroidTextWithSnapshot(page, desktopTreeholeText)

  await sendAndroidMessageRequest()
  await acceptDesktopMessageRequest(page)
  await waitForAndroidDmThread(desktopProfile.profileId)

  await sendAndroidDmBody(androidDmBodyText)
  await waitFor(async () => {
    const text = await page.locator('#dmList').textContent()
    return textIncludes(text, androidDmBodyText)
  }, 'desktop receives Android signed DM body')

  await sendDesktopDmBody(page, androidProfile.profileId, desktopDmBodyText)
  await tapAndroidByTestId('dm-tab')
  await waitForAndroidText(desktopDmBodyText)

  page = await restartBothAppsAndRejoin({
    androidRemoteProfileId: desktopProfile.profileId,
    roomKey: desktopHome.roomKey
  })
  await verifyDmPersistsAfterRestart(desktopDmBodyText)

  await sendAndroidDmBody(androidDmAfterRestartText)
  await waitFor(async () => {
    const text = await page.locator('#dmList').textContent()
    return textIncludes(text, androidDmAfterRestartText)
  }, 'desktop receives Android signed DM body after restart')

  await revokeDesktopContact(page, androidProfile.profileId)
  await sendAndroidDmBody(androidDmAfterRevokeText)
  await verifyDesktopDmClosedAfterRevoke(page, androidDmAfterRevokeText)

  console.log(
    JSON.stringify(
      {
        androidProfileId: androidProfile.profileId,
        desktopProfileId: desktopProfile.profileId,
        peerCount: await page.locator('#peerLabel').textContent(),
        roomKey: desktopHome.roomKey.slice(0, 8) + '...' + desktopHome.roomKey.slice(-8),
        verified: [
          'desktop trusts Android profile URI',
          'Android ContactBook trusts desktop profile',
          'Android joins desktop home over debug manual key',
          'desktop and Android connect as peers',
          'desktop chat reaches Android',
          'Android chat reaches desktop',
          'desktop treehole post reaches Android',
          'Android message request reaches desktop',
          'desktop accepts request and opens signed DM thread',
          'Android signed DM body reaches desktop',
          'desktop signed DM body reaches Android',
          'signed DM body persists across Android restart',
          'signed DM channel works after restart',
          'desktop revoke removes trusted Android contact',
          'desktop revoke closes the accepted DM receive path'
        ]
      },
      null,
      2
    )
  )
} finally {
  try {
    restoreAndroidInputMethod()
  } catch (error) {
    console.error(`Unable to restore Android input method: ${error.message}`)
  }
  await app?.close().catch(() => {})
  await rm(userDataDir, { force: true, recursive: true }).catch(() => {})
  await rm(workDir, { force: true, recursive: true }).catch(() => {})
}

async function launchDesktopApp() {
  app = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDir}`],
    cwd: desktopDir,
    env: {
      ...process.env,
      KEPOS_DIRECT_ADVERTISED_HOST: directAdvertisedHost,
      KEPOS_DIRECT_LISTEN_HOST: '0.0.0.0',
      KEPOS_SMOKE_DESKTOP: usePearRuntime ? undefined : '1'
    },
    executablePath: electronExecutable,
    timeout: 60000
  })

  const nextPage = await app.firstWindow({ timeout: 60000 })
  await nextPage.waitForLoadState('domcontentloaded')
  nextPage.on('console', (message) => {
    if (message.type() === 'error') console.error(`[desktop] ${message.text()}`)
  })

  return nextPage
}

async function openDesktopPeopleActions(page) {
  await page.locator('.peopleActions').evaluate((node) => {
    node.open = true
  })
  await page.locator('#trustQrInput').scrollIntoViewIfNeeded()
}

async function readAndroidProfileUri() {
  launchAndroidDevClient()
  await waitForAndroidAppSurface()
  await revealAndroidAdvancedShare()

  for (let attempt = 0; attempt < 5; attempt++) {
    const xml = await dumpAndroidUi()
    const uri = textByResourceId(xml, 'home-profile-uri')
    if (uri?.startsWith('kepos://profile')) return uri
    runAdb(['shell', 'input', 'swipe', '540', '2050', '540', '550', '900'])
    await delay(1000)
  }

  throw new Error(
    `Unable to read Android profile URI from UI\n${await createAndroidDiagnostics('profile-uri')}`
  )
}

async function revealAndroidAdvancedShare() {
  bringAndroidDevClientToForeground()
  await waitForAndroidAppSurface()
  const flow = path.join(workDir, 'android-reveal-advanced-share.yaml')
  await writeFile(
    flow,
    `appId: io.guion.kepos
---
- runFlow:
    when:
      visible:
        id: 'people-tab'
    commands:
      - tapOn:
          id: 'people-tab'
- runFlow:
    when:
      visible:
        id: 'lobby-scroll'
    commands:
      - scrollUntilVisible:
          element:
            id: 'people-setup-toggle'
          direction: DOWN
      - tapOn:
          id: 'people-setup-toggle'
- scrollUntilVisible:
    element:
      id: 'advanced-share-toggle'
    direction: DOWN
- tapOn:
    id: 'advanced-share-toggle'
`
  )
  await runMaestroWithAndroidDiagnostics(['test', flow], 'advanced-share')
}

async function writeAndroidContactBook({ alias, ownerProfileId, trustedProfileId }) {
  const contactBook = {
    version: 1,
    ownerProfileId,
    contacts: [
      {
        aliases: [alias],
        alias,
        displayNameSnapshot: alias,
        profileId: trustedProfileId,
        source: 'two_device_debug_smoke',
        trustedAt: Date.now(),
        trustScope: 'home'
      }
    ],
    pendingRequests: []
  }
  const stored = JSON.stringify(contactBook)
  const localPath = path.join(workDir, 'contact-book.json')
  const devicePath = '/data/local/tmp/kepos-contact-book.json'

  await writeFile(localPath, stored)
  runAdb(['push', localPath, devicePath])
  runAdb([
    'shell',
    `run-as io.guion.kepos sh -c 'mkdir -p files/kepos files/kepos/kepos && cp ${devicePath} files/kepos/contact-book.json && cp ${devicePath} files/kepos/kepos/contact-book.json'`
  ])
  runAdb(['shell', 'rm', '-f', devicePath])
}

async function runAndroidJoinFlow(roomKey, directEndpoint) {
  launchAndroidDevClient()
  await waitForAndroidAppSurface()
  runAdb(['shell', 'input', 'tap', '1000', '2210'])
  await delay(500)
  const openFlow = path.join(workDir, 'android-debug-join-open.yaml')
  await writeFile(
    openFlow,
    `appId: io.guion.kepos
---
- scrollUntilVisible:
    element:
      id: 'advanced-join-toggle'
    direction: DOWN
    centerElement: true
    visibilityPercentage: 50
- tapOn:
    id: 'advanced-join-toggle'
- scrollUntilVisible:
    element:
      id: 'manual-home-key-input'
    direction: DOWN
- tapOn:
    id: 'manual-home-key-input'
`
  )
  await runMaestroWithAndroidDiagnostics(['test', openFlow], 'debug-join-open')
  runAdb(['shell', 'input', 'text', roomKey])
  if (directEndpoint) {
    runAdb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
    tapAndroidResourceId('manual-home-endpoint-input')
    runAdb(['shell', 'input', 'text', escapeAndroidInputText(directEndpoint)])
  }

  const submitFlow = path.join(workDir, 'android-debug-join-submit.yaml')
  await writeFile(
    submitFlow,
    `appId: io.guion.kepos
---
- hideKeyboard
- scrollUntilVisible:
    element:
      id: 'manual-home-join-button'
    direction: DOWN
- tapOn:
    id: 'manual-home-join-button'
- extendedWaitUntil:
    visible:
      text: 'Connected.'
    timeout: 30000
- assertVisible:
    id: 'chat-tab'
`
  )
  await runMaestroWithAndroidDiagnostics(['test', submitFlow], 'debug-join-submit')
}

function launchAndroidDevClient() {
  runAdb(['reverse', 'tcp:8081', 'tcp:8081'])
  runAdb(['shell', 'am', 'force-stop', 'io.guion.kepos'])
  bringAndroidDevClientToForeground()
}

function bringAndroidDevClientToForeground() {
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

function prepareAndroidDevice() {
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'])
  runAdb(['shell', 'wm', 'dismiss-keyguard'])
  runAdb(['shell', 'cmd', 'statusbar', 'collapse'])
}

function configureAndroidSmokeInputMethod() {
  const previousInputMethod = runAdb(['shell', 'settings', 'get', 'secure', 'default_input_method'])
    .trim()
    .replace(/\r$/, '')
  const enabledInputMethods = runAdb(['shell', 'ime', 'list', '-s'])
  const wasSmokeInputMethodEnabled = enabledInputMethods.split(/\r?\n/).includes(smokeInputMethod)

  if (!wasSmokeInputMethodEnabled) {
    runAdb(['shell', 'ime', 'enable', smokeInputMethod])
  }

  runAdb(['shell', 'ime', 'set', smokeInputMethod])

  restoreAndroidInputMethod = () => {
    if (previousInputMethod && previousInputMethod !== 'null') {
      runAdb(['shell', 'ime', 'set', previousInputMethod])
    }

    if (!wasSmokeInputMethodEnabled) {
      runAdb(['shell', 'ime', 'disable', smokeInputMethod])
    }
  }
}

function grantAndroidCameraPermission() {
  runAdb(['shell', 'pm', 'grant', 'io.guion.kepos', 'android.permission.CAMERA'])
}

function resetAndroidSmokeData() {
  runAdb([
    'shell',
    "run-as io.guion.kepos sh -c 'rm -rf files/kepos/dm files/kepos/kepos/dm files/kepos/kepos-treehole-* && mkdir -p files/kepos/dm files/kepos/kepos/dm'"
  ])
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
    'Two-device smoke requires Metro on http://127.0.0.1:8081. Start it with npm run mobile:start.'
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

async function sendAndroidChat() {
  bringAndroidDevClientToForeground()
  await waitForAndroidAppSurface()
  const flow = path.join(workDir, 'android-debug-chat.yaml')
  await writeFile(
    flow,
    `appId: io.guion.kepos
---
- assertVisible:
    id: 'chat-tab'
- tapOn:
    id: 'chat-message-input'
- inputText: '${androidChatText}'
- hideKeyboard
- tapOn:
    id: 'chat-send-button'
`
  )
  await runMaestroWithAndroidDiagnostics(['test', flow], 'debug-chat')
}

async function sendAndroidMessageRequest() {
  await sendAndroidDirectMessage({
    fileName: 'android-message-request.yaml',
    text: androidMessageRequestText
  })
}

async function acceptDesktopMessageRequest(page) {
  await page.click('#dmTab')
  await waitFor(async () => {
    const text = await page.locator('#dmList').textContent()
    return textIncludes(text, androidMessageRequestText)
  }, 'desktop receives Android message request')
  await page.locator('#dmList button', { hasText: 'Accept' }).click()
  await waitFor(async () => {
    const text = await page.locator('#noticeLabel').textContent()
    return textIncludes(text, 'Message request accepted.')
  }, 'desktop accepted Android message request')
}

async function sendAndroidDmBody(text) {
  await sendAndroidDirectMessage({
    fileName: `android-dm-${text.replaceAll(' ', '-').toLowerCase()}.yaml`,
    text
  })
}

async function sendAndroidDirectMessage({ fileName, text }) {
  bringAndroidDevClientToForeground()
  await waitForAndroidAppSurface()
  const flow = path.join(workDir, fileName)
  await writeFile(
    flow,
    `appId: io.guion.kepos
---
- tapOn:
    id: 'dm-tab'
- tapOn:
    text: 'Desktop smoke'
- tapOn:
    id: 'dm-message-input'
- inputText: '${text}'
- hideKeyboard
- tapOn:
    id: 'dm-send-button'
`
  )
  await runMaestroWithAndroidDiagnostics(['test', flow], fileName.replace(/\.yaml$/, ''))
}

async function sendDesktopDmBody(page, toProfileId, text) {
  await page.click('#dmTab')
  await page.evaluate(
    ({ text, toProfileId }) =>
      globalThis.keposDesktopDispatchCommand('sendDmMessage', { text, toProfileId }),
    { text, toProfileId }
  )
  await waitFor(async () => {
    const dmText = await page.locator('#dmList').textContent()
    return textIncludes(dmText, text)
  }, 'desktop shows outgoing signed DM body')
}

async function restartBothAppsAndRejoin({ androidRemoteProfileId, roomKey }) {
  await app?.close()
  app = null

  const nextPage = await launchDesktopApp()
  await waitForInputPrefix(nextPage, '#profileQrOutput', 'kepos://profile')
  await waitForInputPrefix(nextPage, '#homeQrOutput', 'kepos://home')
  await nextPage.click('#createButton')
  await waitForText(nextPage, '#noticeLabel', 'Home joined.')
  const desktopDirectEndpoint = await waitForDesktopDirectEndpoint(nextPage)

  await runAndroidJoinFlow(roomKey, desktopDirectEndpoint)
  await waitForDesktopPeer(nextPage, 'desktop and Android reconnect as peers')
  await waitForAndroidDmThread(androidRemoteProfileId)
  await tapAndroidByTestId('dm-tab')

  return nextPage
}

async function verifyDmPersistsAfterRestart(text) {
  await waitForAndroidText(text)
}

async function revokeDesktopContact(page, profileId) {
  await page.evaluate(
    (profileId) => globalThis.keposDesktopDispatchCommand('revokeContact', { profileId }),
    profileId
  )
  await waitFor(async () => {
    const text = await page.locator('#noticeLabel').textContent()
    return textIncludes(text, 'Trust revoked.')
  }, 'desktop revoked Android contact')
  await waitFor(async () => {
    const text = await page.locator('#contactList').textContent()
    return !textIncludes(text, shorten(profileId))
  }, 'desktop contact list removes revoked Android profile')
  await waitFor(async () => {
    const text = await page.locator('#dmContactList').textContent()
    return !textIncludes(text, 'Android smoke')
  }, 'desktop DM contact list removes revoked Android profile')
}

async function verifyDesktopDmClosedAfterRevoke(page, text) {
  const deadline = Date.now() + 5000

  while (Date.now() < deadline) {
    const dmText = await page.locator('#dmList').textContent()
    if (textIncludes(dmText, text)) {
      throw new Error('Desktop received a signed DM body after revoking the sender')
    }
    await delay(250)
  }
}

async function waitForAndroidDmThread(remoteProfileId) {
  await waitFor(
    () => {
      const threads = readAndroidDmThreads()
      return threads.some(
        (thread) =>
          thread.remoteProfileId === remoteProfileId &&
          thread.state === 'accepted' &&
          thread.revokedAt === undefined
      )
    },
    `Android accepted DM thread for ${shorten(remoteProfileId)}`
  )
}

function readAndroidDmThreads() {
  const output = runAdb([
    'shell',
    "run-as io.guion.kepos sh -c 'cat files/kepos/kepos/dm/threads.json 2>/dev/null || cat files/kepos/dm/threads.json 2>/dev/null || true'"
  ]).trim()

  if (!output) {
    return []
  }

  return (JSON.parse(output).threads || []).map((entry) => entry.thread || entry)
}

async function tapAndroidByTestId(testId) {
  bringAndroidDevClientToForeground()
  await waitForAndroidAppSurface()
  const flow = path.join(workDir, `${testId}.yaml`)
  await writeFile(
    flow,
    `appId: io.guion.kepos
---
- tapOn:
    id: '${testId}'
`
  )
  await runMaestroWithAndroidDiagnostics(['test', flow], testId)
}

async function waitForAndroidText(text) {
  await waitFor(async () => {
    assertKeposAndroidForeground(`Android text ${text}`)
    return textIncludes(decodeXml(await dumpAndroidUi()), text)
  }, `Android text ${text}`)
}

async function waitForAndroidTextWithSnapshot(page, text) {
  try {
    await waitForAndroidText(text)
  } catch (error) {
    throw new Error(`${error.message}\n${await createTwoDeviceDebugSnapshot(page)}`)
  }
}

function dumpAndroidUi() {
  return runAdb(['exec-out', 'uiautomator', 'dump', '/dev/tty'])
}

async function runMaestroWithAndroidDiagnostics(args, label) {
  try {
    runMaestro(args)
  } catch (error) {
    throw new Error(`${error.message}\n${await createAndroidDiagnostics(label)}`)
  }
}

async function createAndroidDiagnostics(label) {
  const prefix = path.join(os.tmpdir(), `kepos-two-device-${label}`)
  const screenshotPath = `${prefix}-android.png`
  const xmlPath = `${prefix}-android.xml`
  const foreground = readAndroidForeground()

  await captureAndroidScreenshot(screenshotPath).catch(() => {})
  await writeFile(xmlPath, dumpAndroidUi()).catch(() => {})

  return `Android foreground: ${foreground}\nAndroid screenshot: ${screenshotPath}\nAndroid UI XML: ${xmlPath}`
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

function decodeKeposUri(uri) {
  const url = new URL(uri)
  const payload = url.searchParams.get('payload')
  if (!payload) throw new Error('Kepos URI payload is missing')
  return JSON.parse(payload)
}

async function waitForDesktopDirectEndpoint(page) {
  let endpoint = null
  await waitFor(async () => {
    const text = await page.locator('#transportDebugLabel').textContent()
    endpoint = parseDirectEndpointFromDebug(text)
    return Boolean(endpoint)
  }, 'desktop direct endpoint')
  return endpoint
}

function parseDirectEndpointFromDebug(text = '') {
  return text.match(/\bdirect=([^\s]+)/)?.[1] || null
}

function resolveDirectAdvertisedHost() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address
    }
  }

  return '127.0.0.1'
}

function escapeAndroidInputText(text) {
  return text.replace(/\s/g, '%s')
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

async function waitForDesktopPeer(page, label) {
  try {
    await waitFor(
      async () => {
        const peerLabel = await page.locator('#peerLabel').textContent()
        return peerLabel !== '0'
      },
      label,
      { timeoutMs: 120000 }
    )
  } catch (error) {
    const desktopSnapshot = {
      errorDetail: await page
        .locator('#errorDetailLabel')
        .textContent()
        .catch(() => null),
      homeStatus: await page
        .locator('#homeStatusLabel')
        .textContent()
        .catch(() => null),
      notice: await page
        .locator('#noticeLabel')
        .textContent()
        .catch(() => null),
      peerLabel: await page
        .locator('#peerLabel')
        .textContent()
        .catch(() => null),
      transportDebug: await page
        .locator('#transportDebugLabel')
        .textContent()
        .catch(() => null)
    }
    let androidXml = ''
    try {
      androidXml = dumpAndroidUi()
    } catch {
      androidXml = ''
    }
    try {
      await revealAndroidRoomAdvanced()
      androidXml = dumpAndroidUi()
    } catch {
      // Keep the base dump if the optional advanced reveal fails.
    }
    const androidSnapshot = {
      errorDetail: androidXml ? textByResourceId(androidXml, 'room-error-detail') : null,
      notice: androidXml ? textByResourceId(androidXml, 'app-notice') : null,
      transportDebug: androidXml ? textByResourceId(androidXml, 'room-transport-debug') : null
    }
    throw new Error(
      `${error.message}\nDesktop: ${JSON.stringify(desktopSnapshot)}\nAndroid: ${JSON.stringify(androidSnapshot)}`
    )
  }
}

async function waitForDesktopChatText(page, expectedText) {
  try {
    await waitFor(async () => {
      const text = await page.locator('#messageList').textContent()
      return textIncludes(text, expectedText)
    }, 'desktop receives Android chat')
  } catch (error) {
    throw new Error(`${error.message}\n${await createTwoDeviceDebugSnapshot(page)}`)
  }
}

async function waitForDesktopTreeholeText(page, expectedText) {
  try {
    await waitFor(async () => {
      const text = await page.locator('#treeholeList').textContent()
      return textIncludes(text, expectedText)
    }, 'desktop shows its treehole post')
  } catch (error) {
    const desktopSnapshot = {
      errorDetail: await page
        .locator('#errorDetailLabel')
        .textContent()
        .catch(() => null),
      notice: await page
        .locator('#noticeLabel')
        .textContent()
        .catch(() => null),
      transportDebug: await page
        .locator('#transportDebugLabel')
        .textContent()
        .catch(() => null),
      treeholeList: await page
        .locator('#treeholeList')
        .textContent()
        .catch(() => null),
      treeholeStatus: await page
        .locator('#treeholeStatusLabel')
        .textContent()
        .catch(() => null)
    }
    throw new Error(`${error.message}\nDesktop: ${JSON.stringify(desktopSnapshot)}`)
  }
}

async function createTwoDeviceDebugSnapshot(page) {
  const desktopSnapshot = {
    errorDetail: await page
      .locator('#errorDetailLabel')
      .textContent()
      .catch(() => null),
    homeMessages: await page
      .locator('#messageList')
      .textContent()
      .catch(() => null),
    homeStatus: await page
      .locator('#homeStatusLabel')
      .textContent()
      .catch(() => null),
    notice: await page
      .locator('#noticeLabel')
      .textContent()
      .catch(() => null),
    peerLabel: await page
      .locator('#peerLabel')
      .textContent()
      .catch(() => null),
    transportDebug: await page
      .locator('#transportDebugLabel')
      .textContent()
      .catch(() => null)
  }
  let androidXml = ''
  try {
    androidXml = dumpAndroidUi()
  } catch {
    androidXml = ''
  }
  try {
    await revealAndroidRoomAdvanced()
    androidXml = dumpAndroidUi()
  } catch {
    // Keep the base dump if the optional advanced reveal fails.
  }
  const androidSnapshot = {
    errorDetail: androidXml ? textByResourceId(androidXml, 'room-error-detail') : null,
    foreground: readAndroidForeground(),
    notice: androidXml ? textByResourceId(androidXml, 'app-notice') : null,
    transportDebug: androidXml ? textByResourceId(androidXml, 'room-transport-debug') : null
  }

  return `Desktop: ${JSON.stringify(desktopSnapshot)}\nAndroid: ${JSON.stringify(androidSnapshot)}`
}

async function revealAndroidRoomAdvanced() {
  tapAndroidResourceId('room-advanced-toggle')
  await waitForAndroidResourceId('room-transport-debug')
}

function tapAndroidResourceId(resourceId) {
  const xml = dumpAndroidUi()
  const bounds = boundsByResourceId(xml, resourceId)
  if (!bounds) throw new Error(`Android resource ${resourceId} is missing`)

  runAdb(['shell', 'input', 'tap', String(bounds.x), String(bounds.y)])
}

function assertKeposAndroidForeground(label) {
  const foreground = readAndroidForeground()
  if (!foreground.includes('io.guion.kepos')) {
    throw new Error(`${label} requires Kepos in foreground: ${foreground}`)
  }
}

function readAndroidForeground() {
  return runAdb(['shell', 'dumpsys', 'window'])
    .split(/\r?\n/)
    .filter((line) => line.includes('mCurrentFocus') || line.includes('mFocusedApp'))
    .map((line) => line.trim())
    .join(' | ')
}

function waitForAndroidResourceId(resourceId) {
  return waitFor(
    () => Boolean(boundsByResourceId(dumpAndroidUi(), resourceId)),
    `Android resource ${resourceId}`,
    { timeoutMs: 5000 }
  )
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

function runMaestro(args) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = spawnSync(maestro, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    if (result.status === 0) {
      process.stdout.write(result.stdout)
      process.stderr.write(result.stderr)
      return
    }

    const output = `${result.stdout}${result.stderr}`
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)

    if (attempt < 3 && isRetriableMaestroEnvironmentError(output)) {
      spawnSync('sleep', ['2'])
      continue
    }

    throw new Error(`maestro ${args.join(' ')} failed`)
  }
}

function isRetriableMaestroEnvironmentError(output) {
  return (
    output.includes('MaestroDriverStartupException') ||
    output.includes('INSTALL_FAILED_VERIFICATION_FAILURE') ||
    output.includes('StatusRuntimeException: UNAVAILABLE')
  )
}

function resolveMaestroCommand() {
  for (const candidate of [
    'maestro',
    '/opt/homebrew/Cellar/maestro/2.6.1/libexec/bin/maestro',
    '/opt/homebrew/bin/maestro',
    '/usr/local/bin/maestro'
  ]) {
    const result = spawnSync(candidate, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    if (result.status === 0) return candidate
  }

  return 'maestro'
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function textIncludes(text, expected) {
  return text?.toLocaleLowerCase('en-US').includes(expected.toLocaleLowerCase('en-US')) ?? false
}

function shorten(value) {
  return value.slice(0, 8)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
