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
const androidChatText = 'Android hello'
const androidDmAfterRestartText = 'Android DM after restart'
const androidDmAfterRevokeText = 'Android DM after revoke'
const androidDmBodyText = 'Android signed DM body'
const androidMessageRequestText = 'Android DM request'
const desktopChatText = 'desktop hello'
const desktopDmBodyText = 'desktop signed DM body'
const desktopTreeholeText = 'desktop treehole smoke'
let app = null
let page = null

try {
  page = await launchDesktopApp()

  await waitForInputPrefix(page, '#profileQrOutput', 'kepos://profile')
  await waitForInputPrefix(page, '#homeQrOutput', 'kepos://home')

  const desktopProfileUri = await page.locator('#profileQrOutput').inputValue()
  const desktopHomeUri = await page.locator('#homeQrOutput').inputValue()
  const desktopProfile = decodeKeposUri(desktopProfileUri)
  const desktopHome = decodeKeposUri(desktopHomeUri)

  const androidProfileUri = await readAndroidProfileUri()
  const androidProfile = decodeKeposUri(androidProfileUri)

  await page.fill('#trustQrInput', androidProfileUri)
  await page.fill('#trustAliasInput', 'Android smoke')
  await page.click('#trustButton')
  await waitFor(async () => {
    const contacts = await page.locator('#contactList').textContent()
    return contacts?.includes(shorten(androidProfile.profileId))
  }, 'desktop trusted Android contact')

  await page.click('#createButton')
  await waitForText(page, '#noticeLabel', 'Home joined.')

  await writeAndroidContactBook({
    alias: 'Desktop smoke',
    ownerProfileId: androidProfile.profileId,
    trustedProfileId: desktopProfile.profileId
  })

  await runAndroidJoinFlow(desktopHome.roomKey)
  await waitForTextNot(page, '#peerLabel', '0')

  await page.fill('#chatInput', desktopChatText)
  await page.keyboard.press('Enter')
  await waitForAndroidText(desktopChatText)

  await sendAndroidChat()
  await waitFor(async () => {
    const text = await page.locator('#messageList').textContent()
    return textIncludes(text, androidChatText)
  }, 'desktop receives Android chat')

  await page.click('#treeholeTab')
  await page.fill('#treeholeInput', desktopTreeholeText)
  await page.click('#treeholeForm button[type="submit"]')
  await waitFor(async () => {
    const text = await page.locator('#treeholeList').textContent()
    return textIncludes(text, desktopTreeholeText)
  }, 'desktop shows its treehole post')
  await tapAndroidByTestId('treehole-tab')
  await waitForAndroidText(desktopTreeholeText)

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
      KEPOS_SMOKE_DESKTOP: '1'
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

async function readAndroidProfileUri() {
  runAdb(['shell', 'am', 'force-stop', 'io.guion.kepos'])
  runAdb(['shell', 'monkey', '-p', 'io.guion.kepos', '-c', 'android.intent.category.LAUNCHER', '1'])
  await delay(8000)

  for (let attempt = 0; attempt < 5; attempt++) {
    const xml = await dumpAndroidUi()
    const uri = textByResourceId(xml, 'home-profile-uri')
    if (uri?.startsWith('kepos://profile')) return uri
    runAdb(['shell', 'input', 'swipe', '540', '2050', '540', '550', '900'])
    await delay(1000)
  }

  throw new Error('Unable to read Android profile URI from UI')
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

async function runAndroidJoinFlow(roomKey) {
  runAdb(['shell', 'am', 'force-stop', 'io.guion.kepos'])
  runAdb(['shell', 'monkey', '-p', 'io.guion.kepos', '-c', 'android.intent.category.LAUNCHER', '1'])
  await delay(8000)
  runAdb(['shell', 'input', 'tap', '1000', '2210'])
  await delay(500)
  const flow = path.join(workDir, 'android-debug-join.yaml')
  await writeFile(
    flow,
    `appId: io.guion.kepos
---
- scrollUntilVisible:
    element:
      id: 'advanced-join-toggle'
    direction: DOWN
- tapOn:
    id: 'advanced-join-toggle'
- scrollUntilVisible:
    element:
      id: 'manual-home-key-input'
    direction: DOWN
- tapOn:
    id: 'manual-home-key-input'
- inputText: '${roomKey}'
- hideKeyboard
- scrollUntilVisible:
    element:
      id: 'manual-home-join-button'
    direction: DOWN
- tapOn:
    id: 'manual-home-join-button'
- extendedWaitUntil:
    visible:
      id: 'room-home-address'
    timeout: 30000
- assertVisible:
    id: 'chat-tab'
`
  )
  runMaestro(['test', flow])
}

async function sendAndroidChat() {
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
  runMaestro(['test', flow])
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
    return textIncludes(text, 'Accepted message request')
  }, 'desktop accepted Android message request')
}

async function sendAndroidDmBody(text) {
  await sendAndroidDirectMessage({
    fileName: `android-dm-${text.replaceAll(' ', '-').toLowerCase()}.yaml`,
    text
  })
}

async function sendAndroidDirectMessage({ fileName, text }) {
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
  runMaestro(['test', flow])
}

async function sendDesktopDmBody(page, toProfileId, text) {
  await page.click('#dmTab')
  await page.fill('#dmRecipientInput', toProfileId)
  await page.fill('#dmInput', text)
  await page.click('#dmForm button[type="submit"]')
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

  await runAndroidJoinFlow(roomKey)
  await waitForTextNot(nextPage, '#peerLabel', '0')
  await waitForAndroidDmThread(androidRemoteProfileId)
  await tapAndroidByTestId('dm-tab')

  return nextPage
}

async function verifyDmPersistsAfterRestart(text) {
  await waitForAndroidText(text)
}

async function revokeDesktopContact(page, profileId) {
  await page.locator('#contactList button', { hasText: 'Revoke' }).click()
  await waitFor(async () => {
    const text = await page.locator('#noticeLabel').textContent()
    return textIncludes(text, `Revoked ${shorten(profileId)}`)
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
  const flow = path.join(workDir, `${testId}.yaml`)
  await writeFile(
    flow,
    `appId: io.guion.kepos
---
- tapOn:
    id: '${testId}'
`
  )
  runMaestro(['test', flow])
}

async function waitForAndroidText(text) {
  await waitFor(
    async () => textIncludes(decodeXml(await dumpAndroidUi()), text),
    `Android text ${text}`
  )
}

function dumpAndroidUi() {
  const devicePath = '/sdcard/kepos-two-device-window.xml'
  const localPath = path.join(workDir, 'window.xml')
  runAdb(['shell', 'uiautomator', 'dump', devicePath])
  runAdb(['pull', devicePath, localPath])
  return readFile(localPath, 'utf8')
}

function textByResourceId(xml, resourceId) {
  const escaped = resourceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const node = xml.match(new RegExp(`<node[^>]*resource-id="${escaped}"[^>]*/?>`))?.[0]
  const match = node?.match(/text="([^"]*)"/)
  return match ? decodeXml(match[1]) : null
}

function decodeKeposUri(uri) {
  const url = new URL(uri)
  const payload = url.searchParams.get('payload')
  if (!payload) throw new Error('Kepos URI payload is missing')
  return JSON.parse(payload)
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

async function waitForTextNot(page, selector, unexpected) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible' })
  await waitFor(
    async () => (await locator.textContent()) !== unexpected,
    `${selector} not ${unexpected}`
  )
}

async function waitFor(predicate, label) {
  const deadline = Date.now() + 60000

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
  for (let attempt = 1; attempt <= 2; attempt += 1) {
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

    if (attempt === 1 && output.includes('MaestroDriverStartupException')) {
      spawnSync('sleep', ['2'])
      continue
    }

    throw new Error(`maestro ${args.join(' ')} failed`)
  }
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
