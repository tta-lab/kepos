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
const desktopChatText = 'desktop hello'
const desktopTreeholeText = 'desktop treehole smoke'
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
          'desktop treehole post reaches Android'
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
    `run-as io.guion.kepos sh -c 'mkdir -p files/kepos/kepos && cp ${devicePath} files/kepos/kepos/contact-book.json'`
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
  await locator.waitFor({ state: 'visible' })
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
  const result = spawnSync(maestro, args, {
    encoding: 'utf8',
    stdio: 'inherit'
  })

  if (result.status !== 0) {
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
