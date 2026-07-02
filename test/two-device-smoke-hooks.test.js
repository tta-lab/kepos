import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readDesktopUiSource() {
  const app = await readFile(new URL('../desktop/app.tsx', import.meta.url), 'utf8')
  const appState = await readFile(new URL('../desktop/app-state.ts', import.meta.url), 'utf8')
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const shell = await readFile(new URL('../desktop/shell-components.tsx', import.meta.url), 'utf8')
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )
  return `${app}\n${appState}\n${panes}\n${shell}\n${context}\n${people}`
}

async function readMobileUiSource() {
  const files = await Promise.all(
    [
      '../mobile/App.tsx',
      '../mobile/action-components.tsx',
      '../mobile/panel-components.tsx',
      '../mobile/setup-components.tsx',
      '../mobile/lobby-components.tsx',
      '../mobile/people-components.tsx',
      '../mobile/direct-components.tsx',
      '../mobile/people-components.tsx',
      '../mobile/room-components.tsx',
      '../mobile/message-components.tsx',
      '../mobile/treehole-components.tsx',
      '../mobile/thread-components.tsx',
      '../mobile/request-components.tsx',
      '../mobile/empty-components.tsx',
      '../mobile/tab-components.tsx',
      '../mobile/chrome-components.tsx',
      '../mobile/form-components.tsx',
      '../mobile/profile-components.tsx',
      '../mobile/styles.ts'
    ].map((path) => readFile(new URL(path, import.meta.url), 'utf8'))
  )

  return files.join('\n')
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  if (start === -1) return ''

  const end = source.indexOf(endMarker, start + startMarker.length)
  return source.slice(start, end === -1 ? undefined : end)
}

test('Android UI exposes stable hooks for two-device smoke', async () => {
  const source = await readMobileUiSource()

  for (const testID of [
    'join-home-uri-input',
    'join-home-uri-button',
    'advanced-join-toggle',
    'manual-home-key-input',
    'manual-home-join-button',
    'trust-profile-uri-input',
    'trust-profile-alias-input',
    'trust-profile-button',
    'chat-message-input',
    'chat-send-button',
    'dm-recipient-input',
    'dm-message-input',
    'dm-send-button',
    'treehole-post-input',
    'treehole-post-button',
    'message-request-accept-button'
  ]) {
    assert.match(source, new RegExp(`testID=['"]${testID}['"]`), `${testID} is missing`)
  }
})

test('Android lucide icons used in TSX are imported', async () => {
  const source = await readMobileUiSource()
  const lucideImports = [...source.matchAll(/import\s+\{([^}]+)\}\s+from 'lucide-react-native'/g)]

  assert.ok(lucideImports.length > 0, 'lucide-react-native import is missing')

  const importedIcons = new Set(
    lucideImports
      .flatMap((match) => match[1].split(','))
      .map((name) => name.trim())
      .filter(Boolean)
  )

  for (const icon of [
    'ArrowRight',
    'Heart',
    'House',
    'LogOut',
    'MessageCircle',
    'Plus',
    'QrCode',
    'Send',
    'Settings',
    'Sprout',
    'UserMinus',
    'Users'
  ]) {
    assert.equal(importedIcons.has(icon), true, `${icon} is not imported`)
    assert.match(source, new RegExp(`(<${icon}\\b|icon=\\{${icon}\\})`), `${icon} is not rendered`)
  }

  assert.equal(importedIcons.has('DoorOpen'), false, 'DoorOpen should not be used for Home tabs')
})

test('Android lobby is scrollable so QR and trust controls are reachable', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /<ScrollView[^>]+testID='lobby-scroll'/)
  assert.match(source, /contentContainerStyle={styles\.lobby}/)
  assert.match(source, /<\/ScrollView>/)
})

test('Android lobby uses product action words for QR and trust flows', async () => {
  const source = await readMobileUiSource()

  for (const text of [
    'Home QR',
    'Enter Home',
    'Profile QR',
    'Friend name',
    'Paste Home QR',
    'Paste Profile QR',
    'Start request'
  ]) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.equal(source.includes('Home URI'), false)
  assert.equal(source.includes('Join Home URI'), false)
  assert.equal(source.includes('Trust Profile'), false)
  assert.equal(source.includes('Friend profile'), false)
  assert.equal(source.includes("label='Alias'"), false)
  assert.equal(source.includes('Paste Home QR text'), false)
  assert.equal(source.includes('Paste Profile QR text'), false)
})

test('Android lobby starts with compact product choices', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /function QuickStartPanel\(/)
  assert.match(source, /Start here/)
  assert.match(
    source,
    /<Field[\s\S]*label='Name'[\s\S]*onChangeText=\{onNickChange\}[\s\S]*value=\{nick\}/
  )
  assert.match(source, /Open my home/)
  assert.match(source, /label='Show My QR'[\s\S]*testID='quick-show-my-qr-button'/)
  assert.match(source, /showQuickProfileQr \? \([\s\S]*<QrCard[\s\S]*value=\{profileQrUri\}/)
  assert.doesNotMatch(source, /testID='quick-open-contacts-button'/)
  assert.doesNotMatch(source, /testID='quick-show-home-qr-button'/)
  assert.doesNotMatch(source, /testID='quick-scan-home-qr-button'/)
  assert.doesNotMatch(source, /testID='quick-scan-profile-qr-button'/)
  assert.equal(source.indexOf('Scan Home QR') > source.indexOf('function PeopleActions'), true)
  assert.equal(source.indexOf("label='Scan QR'") > source.indexOf('function PeopleActions'), true)
  assert.doesNotMatch(source, /showPeopleSetup/)
  assert.doesNotMatch(source, /testID='people-setup-toggle'/)
  assert.match(source, /testID='people-tab'/)
  assert.equal(source.includes('Contacts setup'), false)
  assert.equal(source.includes('People setup'), false)
  assert.equal(source.indexOf('<QuickStartPanel') < source.indexOf("testID='people-tab'"), true)
  assert.equal(source.indexOf('<PeopleActions') > source.indexOf('function PeoplePane('), true)
  assert.equal(source.includes("label='Nick'"), false)
})

test('Android Home startup keeps manual join advanced reachable before Contacts tab', async () => {
  const source = await readMobileUiSource()
  const startupPane = sliceBetween(source, 'function HomeStartupPane(', 'function QuickStartPanel(')

  assert.match(startupPane, /testID='advanced-join-toggle'/)
  assert.doesNotMatch(startupPane, /people-setup-toggle/)
  assert.match(startupPane, /testID='manual-home-key-input'/)
  assert.match(startupPane, /testID='manual-home-endpoint-input'/)
  assert.equal(
    startupPane.indexOf("testID='manual-home-endpoint-input'") <
      startupPane.indexOf("testID='manual-home-join-button'"),
    true
  )
})

test('Android manual home join can pass direct guest endpoint to backend', async () => {
  const source = await readMobileUiSource()

  assert.match(
    source,
    /import \{ parseDirectRoomEndpoint \} from '\.\.\/src\/direct-room-endpoint\.ts'/
  )
  assert.match(source, /const \[directRoomEndpoint, setDirectRoomEndpoint\] = useState\(''\)/)
  assert.match(source, /const directEndpoint = parseDirectRoomEndpoint\(directRoomEndpoint\)/)
  assert.match(
    source,
    /directEndpoint\s+\?\s+\{\s*directTransport:\s+\{\s*endpoint:\s+directEndpoint,\s*mode:\s+'guest'\s*\}\s*\}\s+:\s+\{\}/
  )
})

test('Android setup action buttons use icons consistently', async () => {
  const source = await readMobileUiSource()
  const startupPane = sliceBetween(source, 'function HomeStartupPane(', 'function QuickStartPanel(')
  const peopleActions = sliceBetween(source, 'function PeopleActions(', 'function DirectPane(')
  const directPane = sliceBetween(source, 'function DirectPane(', 'function ContactManager(')

  assert.match(peopleActions, /icon=\{ArrowRight\}[\s\S]*testID='scan-home-qr-button'/)
  assert.match(peopleActions, /icon=\{Plus\}[\s\S]*testID='scan-profile-qr-button'/)
  assert.match(startupPane, /icon=\{Settings\}[\s\S]*testID='advanced-join-toggle'/)
  assert.match(peopleActions, /icon=\{Settings\}[\s\S]*testID='advanced-share-toggle'/)
  assert.match(directPane, /testID='advanced-dm-recipient-toggle'[\s\S]*variant='compact'/)
})

test('Android lobby uses shared task headers for setup panels', async () => {
  const source = await readMobileUiSource()
  const panelComponents = await readFile(
    new URL('../mobile/panel-components.tsx', import.meta.url),
    'utf8'
  )
  const quickStart = sliceBetween(source, 'function QuickStartPanel(', 'function PeoplePane(')
  const peopleActions = sliceBetween(source, 'function PeopleActions(', 'function DirectPane(')

  assert.match(
    panelComponents,
    /function TaskHeader\(\{[\s\S]*description,[\s\S]*eyebrow,[\s\S]*styles,[\s\S]*title[\s\S]*\}/
  )
  assert.match(quickStart, /<TaskHeader[\s\S]*eyebrow='Start'[\s\S]*title='Start here'/)
  assert.match(
    quickStart,
    /description=\{[\s\S]*profileReady[\s\S]*\? 'Show My QR or add a friend\.'[\s\S]*: 'Setting up your profile\.\.\.'[\s\S]*\}/
  )
  assert.match(peopleActions, /<TaskHeader[\s\S]*eyebrow='Advanced'[\s\S]*title='Debug Home QR'/)
  assert.match(
    peopleActions,
    /<TaskHeader[\s\S]*description='Scan a Profile QR, then write a request in Chat\.'[\s\S]*eyebrow='Contacts'[\s\S]*title='Add friend'/
  )
  assert.equal(peopleActions.includes('trust-only setup'), false)
  assert.match(source, /taskHeader: \{/)
  assert.match(source, /taskEyebrow: \{/)
  assert.match(source, /taskTitle: \{/)
  assert.match(source, /taskDescription: \{/)
})

test('Android lobby disables profile-dependent actions while profile loads', async () => {
  const source = await readMobileUiSource()

  assert.match(
    source,
    /const profileReady = Boolean\(identity && profileId && homeRoomKey && contactBook\)/
  )
  assert.match(source, /profileReady={profileReady}/)
  assert.match(source, /function QuickStartPanel\([\s\S]*profileReady[\s\S]*\) \{/)
  assert.match(source, /Setting up your profile\.\.\./)
  assert.match(source, /disabled={!profileReady}/)
  assert.match(source, /disabled && styles\.disabledButton/)
  assert.match(source, /canJoin={profileReady && canJoin}/)
  assert.match(source, /function PeopleActions\([\s\S]*profileReady[\s\S]*\) \{/)
  assert.match(source, /const canUseHomeJoin = profileReady && canJoinHome/)
  assert.match(source, /disabled=\{!canUseHomeJoin \|\| !homeQrUri\.trim\(\)\}/)
  assert.match(source, /disabled={!profileReady \|\| !trustQrUri\.trim\(\)}/)
})

test('Android normal UI copy avoids backend and address language', async () => {
  const source = await readMobileUiSource()

  for (const text of [
    'Show My QR or scan a profile.',
    'Show My QR or add a friend.',
    'Open my home',
    'Starting home...',
    'Home connection error.'
  ]) {
    assert.equal(source.includes(text), true, `${text} is missing`)
  }

  for (const text of [
    'Start or join a home to bring up the P2P backend.',
    'Create a home address',
    'P2P backend unavailable',
    'P2P backend error',
    'Starting P2P backend',
    '>home address<'
  ]) {
    assert.equal(source.includes(text), false, `${text} should not be visible UI copy`)
  }
})

test('Android raw own QR text stays behind advanced people controls', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /const \[showAdvancedShare, setShowAdvancedShare\] = useState\(false\)/)
  assert.match(source, /testID='advanced-share-toggle'/)
  assert.match(source, /showAdvancedShare \? \(/)
  assert.match(source, /<TaskHeader[\s\S]*eyebrow='Advanced'[\s\S]*title='QR details'/)
  assert.match(source, /placeholder='Home QR details'/)
  assert.match(source, /placeholder='Profile QR details'/)
  assert.equal(
    source.indexOf("testID='home-address-uri'") > source.indexOf('showAdvancedShare ? ('),
    true
  )
  assert.equal(
    source.indexOf("testID='home-profile-uri'") > source.indexOf('showAdvancedShare ? ('),
    true
  )
  assert.equal(source.includes('<Text style={styles.panelTitle}>QR text</Text>'), false)
  assert.equal(source.includes("placeholder='My home QR text'"), false)
  assert.equal(source.includes("placeholder='My profile QR text'"), false)
})

test('Android own QR cards are reveal actions, not default dashboard blocks', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /const \[showHomeQr, setShowHomeQr\] = useState\(false\)/)
  assert.match(source, /const \[showQuickProfileQr, setShowQuickProfileQr\] = useState\(false\)/)
  assert.match(source, /Show Home QR/)
  assert.match(source, /label='Show My QR'[\s\S]*testID='quick-show-my-qr-button'/)
  assert.equal(source.includes('Show My Profile QR'), false)
  assert.match(source, /showHomeQr \? \([\s\S]*<QrCard[\s\S]*value=\{myHomeQrUri\}/)
  assert.match(source, /showQuickProfileQr \? \([\s\S]*<QrCard[\s\S]*value=\{profileQrUri\}/)
  assert.equal(
    source.includes('<Text style={styles.panelTitle}>Home QR</Text>\\n        <QrCard'),
    false
  )
  assert.equal(
    source.includes('<Text style={styles.panelTitle}>My Profile QR</Text>\\n        <QrCard'),
    false
  )
})

test('Android paste QR fallback stays behind advanced people controls', async () => {
  const source = await readMobileUiSource()

  assert.equal(
    source.indexOf("testID='join-home-uri-input'") > source.indexOf('showAdvancedShare ? ('),
    true
  )
  assert.equal(
    source.indexOf("testID='join-home-uri-button'") > source.indexOf('showAdvancedShare ? ('),
    true
  )
  assert.equal(
    source.indexOf("testID='trust-profile-uri-input'") > source.indexOf('showAdvancedShare ? ('),
    true
  )
  assert.equal(
    source.indexOf("testID='trust-profile-button'") > source.indexOf('showAdvancedShare ? ('),
    true
  )
})

test('DM request copy reads as a social action', async () => {
  const mobile = await readMobileUiSource()
  const mobileCopy = await readFile(
    new URL('../src/mobile-product-copy.ts', import.meta.url),
    'utf8'
  )
  const desktopApp = await readDesktopUiSource()
  const desktop = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const desktopBindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const desktopPeopleViewModel = await readFile(
    new URL('../src/desktop-people-view-model.ts', import.meta.url),
    'utf8'
  )
  const desktopDirectViewModel = await readFile(
    new URL('../src/desktop-direct-view-model.ts', import.meta.url),
    'utf8'
  )

  assert.match(mobile, /formatMobileDirectMessageMeta\(message, contacts\)/)
  assert.match(
    mobileCopy,
    /formatMessageRequestTitle\(\{[\s\S]*message,[\s\S]*alias: findMobileContactName/
  )
  assert.match(desktopDirectViewModel, /formatDesktopMessageRequestTitle/)
  assert.match(mobileCopy, /sent a friend request/)
  assert.match(mobileCopy, /You sent a friend request/)
  assert.match(desktopDirectViewModel, /You sent a friend request/)
  assert.match(desktopPeopleViewModel, /sent a friend request/)
  assert.match(mobile, /testID='message-request-ignore-button'/)
  assert.match(mobile, /onIgnoreRequest\(message\)/)
  assert.match(desktopApp, /onClick=\{\(\) => onIgnore\(actions\.ignoreMessage\)\}/)
  assert.match(
    desktopBindings,
    /ignoreMessage: \(message\) => dispatchCommand\('ignoreMessageRequest'/
  )
  assert.match(mobileCopy, /sent a friend request/)
  assert.match(desktopPeopleViewModel, /sent a friend request/)
  assert.equal(mobile.includes('asked Profile'), false)
  assert.equal(desktop.includes('asked Profile'), false)
  assert.equal(mobile.includes('Profile ${shortenProfileId(peer)} sent a friend request'), false)
  assert.equal(desktop.includes('Profile ${shorten(peer)} sent a friend request'), false)
  assert.equal(mobile.includes('request ${outgoing ?'), false)
  assert.equal(desktop.includes('message request ${message.direction'), false)
})

test('direct message meta avoids DM fallback and raw recipient framing', async () => {
  const mobile = await readMobileUiSource()
  const mobileCopy = await readFile(
    new URL('../src/mobile-product-copy.ts', import.meta.url),
    'utf8'
  )
  const desktop = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const desktopDirectViewModel = await readFile(
    new URL('../src/desktop-direct-view-model.ts', import.meta.url),
    'utf8'
  )

  assert.match(mobile, /formatMobileDirectMessageMeta\(message, contacts\)/)
  assert.match(
    mobileCopy,
    /You to \${displayDirectPeer\([\s\S]*message\?\.toProfileId,[\s\S]*findMobileContactName/
  )
  assert.match(desktopDirectViewModel, /You to \$\{displayDirectPeer\(message\.toProfileId/)
  assert.match(
    mobileCopy,
    /findMobileContactName\(contacts, message\?\.fromProfileId\) \|\| message\?\.nick/
  )
  assert.match(desktopDirectViewModel, /displayDirectPeer\(message\.fromProfileId/)
  assert.equal(mobile.includes("message.nick || 'DM'"), false)
  assert.equal(desktop.includes("message.nick || 'DM'"), false)
})

test('Android message bubbles separate metadata from readable bodies', async () => {
  const source = await readMobileUiSource()
  const copy = await readFile(new URL('../src/mobile-product-copy.ts', import.meta.url), 'utf8')

  assert.match(source, /style=\{styles\.bubbleMetaRow\}/)
  assert.match(source, /formatMobileHomeMessageMeta\(message\)/)
  assert.match(copy, /function formatMobileHomeMessageMeta\(message\?: MobileHomeMessageLike/)
  assert.equal(source.includes('{message.nick}</Text>'), false)
  assert.match(source, /style=\{\[\s*styles\.bubbleTextBlock/)
  assert.match(source, /bubbleMetaRow: \{/)
  assert.match(source, /bubbleTextBlock: \{/)
  assert.match(source, /inBubbleTextBlock: \{/)
  assert.match(source, /outBubbleTextBlock: \{/)
})

test('normal error notices avoid raw exception text', async () => {
  const mobile = await readMobileUiSource()
  const desktop = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.equal(/setNotice\(`[^`]*\$\{error\.message\}/.test(mobile), false)
  assert.equal(/setNotice\(payload\.message/.test(mobile), false)
  assert.equal(/notice: error\.message/.test(desktop), false)
  assert.match(mobile, /Could not join this home\./)
  assert.match(mobile, /Could not read this Home QR\./)
  assert.match(desktop, /Could not join this home\. Trust this friend on this device first\./)
  assert.match(desktop, /Could not read this Home QR\./)
  assert.match(desktop, /Could not read this Profile QR\./)
  assert.match(desktop, /Something went wrong\./)
})

test('Android keeps raw error detail in room advanced status', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /const \[lastError, setLastError\] = useState\(''\)/)
  assert.match(source, /lastError={lastError}/)
  assert.match(source, /setLastError\(errorMessage\(error\)\)/)
  assert.match(
    source,
    /setLastError\(asString\(payloadRecord\.message\) \|\| 'Home connection error'\)/
  )
  assert.equal(source.includes("console.error('Home connection error'"), false)
  assert.match(source, /<Text style={styles\.roomLabel}>Error detail<\/Text>/)
  assert.match(source, /testID='room-error-detail'/)
  assert.match(source, /\{lastError \|\| 'none'\}/)
  assert.equal(source.includes('setNotice(error.message)'), false)
  assert.equal(source.includes('setNotice(payload.message)'), false)
})

test('mobile success notices avoid profile id snippets', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /chooseProfileRequestTarget\(uri, trustAlias\)/)
  assert.match(source, /setNotice\('Friend removed\.'\)/)
  assert.match(source, /setNotice\('Friend request accepted\.'\)/)
  assert.match(source, /setNotice\('Could not save this message\.'\)/)
  assert.equal(source.includes('Could not save this direct message.'), false)
  assert.equal(source.includes('Could not save this DM thread.'), false)
  assert.equal(
    source.includes('setNotice(`Trusted ${shortenProfileId(result.profileId)}.`)'),
    false
  )
  assert.equal(
    source.includes('setNotice(`Revoked ${shortenProfileId(contactProfileId)}.`)'),
    false
  )
  assert.equal(
    source.includes(
      'setNotice(`Accepted message request from ${shortenProfileId(request.fromProfileId)}.`)'
    ),
    false
  )
})

test('desktop success notices avoid profile id snippets', async () => {
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const messageRequestActions = await readFile(
    new URL('../src/desktop-message-request-actions.ts', import.meta.url),
    'utf8'
  )
  const controlActions = await readFile(
    new URL('../src/desktop-control-actions.ts', import.meta.url),
    'utf8'
  )
  const trustActions = await readFile(
    new URL('../src/desktop-trust-actions.ts', import.meta.url),
    'utf8'
  )
  const source = `${controller}\n${messageRequestActions}\n${controlActions}\n${trustActions}`

  assert.match(source, /setNotice\('Friend request target ready\.'\)/)
  assert.match(source, /setNotice\('Friend request accepted\.'\)/)
  assert.match(source, /setNotice\('Message thread ready\.'\)/)
  assert.match(source, /setNotice\('Friend removed\.'\)/)
  assert.equal(source.includes("notice: 'DM invite accepted.'"), false)
  assert.equal(source.includes('notice: `Trusted ${shorten(result.profileId)}.`'), false)
  assert.equal(
    source.includes('notice: `Accepted message request from ${shorten(message.fromProfileId)}.`'),
    false
  )
})

test('Android header shows product home status instead of raw peer count', async () => {
  const source = await readMobileUiSource()
  const copy = await readFile(new URL('../src/mobile-product-copy.ts', import.meta.url), 'utf8')

  assert.match(source, /from '\.\.\/src\/mobile-product-copy\.ts'/)
  assert.match(copy, /function getMobileHomeStatus\(\{ online, session \}: MobileHomeStatusInput\)/)
  assert.match(copy, /function getMobileTreeholeStatus\(status\?: string\)/)
  assert.match(source, /getMobileHomeStatus\(\{ online: peerCount, session \}\)/)
  assert.match(source, /getMobileTreeholeStatus\(treeholeStatus\)/)
  assert.match(source, /treeholeStatusLabel=\{treeholeStatusLabel\}/)
  assert.match(source, /style=\{styles\.mobileStatusStrip\}/)
  assert.match(source, /style=\{styles\.homeStatusPill\}/)
  assert.match(source, /style=\{styles\.treeholeStatusPill\}/)
  assert.match(copy, /Connected/)
  assert.match(copy, /Waiting for friends/)
  assert.match(copy, /Offline/)
  assert.match(copy, /Treehole ready/)
  assert.match(copy, /Treehole offline/)
  assert.equal(source.includes('Looking for peers'), false)
  assert.equal(source.includes('{online} peer'), false)
})

test('Android backend status notices avoid raw worker status codes', async () => {
  const source = await readMobileUiSource()
  const copy = await readFile(new URL('../src/mobile-product-copy.ts', import.meta.url), 'utf8')

  assert.match(copy, /function getMobileBackendNotice\(status\?: string\)/)
  assert.match(source, /const status = asString\(payloadRecord\.status\)/)
  assert.match(source, /setNotice\(getMobileBackendNotice\(status\)\)/)
  assert.match(copy, /return 'Starting home\.\.\.'/)
  assert.match(copy, /return 'Syncing posts\.\.\.'/)
  assert.match(copy, /return 'Connected\.'/)
  assert.equal(source.includes('setNotice(`Home ${payload.status}.`)'), false)
  assert.equal(source.includes('Home joining-swarm.'), false)
  assert.equal(source.includes('Home opening-treehole-store.'), false)
})

test('Android room bar keeps raw home key behind advanced details', async () => {
  const source = await readMobileUiSource()
  const copy = await readFile(new URL('../src/mobile-product-copy.ts', import.meta.url), 'utf8')

  assert.match(source, /const \[showRoomAdvanced, setShowRoomAdvanced\] = useState\(false\)/)
  assert.match(copy, /function getMobileRoomSurface\(activeTab\?: string\)/)
  assert.match(source, /const roomSurface = getMobileRoomSurface\(activeTab\)/)
  assert.match(source, /Current space/)
  assert.match(source, /\{roomSurface\}/)
  assert.equal(source.includes('Live session'), false)
  assert.match(source, /showRoomAdvanced \? \(/)
  assert.match(source, /testID='room-transport-debug'/)
  assert.match(
    source,
    /formatTransportDebugLabel,[\s\S]*from '\.\.\/src\/transport-debug-label\.ts'/
  )
  assert.match(
    source,
    /formatTransportDebugLabel\(transportDebug, \{ includeDirectReady: true \}\)/
  )
  assert.equal(
    source.indexOf("testID='room-home-address'") > source.indexOf('showRoomAdvanced ? ('),
    true
  )
})

test('Android room advanced action uses an icon like other advanced controls', async () => {
  const source = await readMobileUiSource()
  const chatRoom = sliceBetween(source, 'function ChatRoom(', 'function MobileActionButton(')
  const advancedToggle = sliceBetween(
    source,
    'function MobileAdvancedToggle(',
    'function QuickStartPanel('
  )

  assert.match(chatRoom, /<MobileAdvancedToggle[\s\S]*testID='room-advanced-toggle'/)
  assert.match(
    advancedToggle,
    /style=\{isCompact \? styles\.directAdvancedToggle : styles\.roomAdvancedButton\}/
  )
  assert.match(advancedToggle, /<Settings color=\{iconColor\} size=\{15\} \/>/)
  assert.match(advancedToggle, /<Text style=\{styles\.advancedSummary\}>Advanced<\/Text>/)
})

test('Android room panes label live and durable surfaces', async () => {
  const source = await readMobileUiSource()

  for (const text of ['Live home chat', 'Chat', 'Treehole']) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.match(source, /paneEyebrow:/)
  assert.match(source, /paneTitle:/)
})

test('Android home chat disables empty sends like other composers', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /testID='chat-send-button'/)
  assert.match(source, /disabled=\{!draft\.trim\(\)\}/)
  assert.match(source, /function MobileSendButton\(/)
  assert.match(source, /disabled && styles\.disabledSendButton/)
})

test('Android icon-only buttons expose accessible labels', async () => {
  const source = await readMobileUiSource()

  for (const label of [
    'Leave home',
    'Send home message',
    'Send message',
    'Post to Treehole',
    'Send comment'
  ]) {
    assert.match(source, new RegExp(`accessibilityLabel=['"]${label}['"]`), `${label} is missing`)
  }
})

test('Android room tabs use product labels', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /label=\{getProductSurfaceLabel\('dm'\)\}[\s\S]*testID='dm-tab'/)
  assert.equal(source.includes("label='DM'"), false)
})

test('Android room tabs use icons for main navigation', async () => {
  const source = await readMobileUiSource()
  const tabs = sliceBetween(source, '<View style={styles.tabs}>', 'function MobileActionButton(')
  const tabButton = sliceBetween(source, 'function TabButton(', 'function ChatPane(')

  assert.match(
    tabs,
    /icon={House}[\s\S]*label=\{getProductSurfaceLabel\('chat'\)\}[\s\S]*testID='chat-tab'/
  )
  assert.doesNotMatch(tabs, /icon={DoorOpen}[\s\S]*testID='chat-tab'/)
  assert.match(
    tabs,
    /icon={Send}[\s\S]*label=\{getProductSurfaceLabel\('dm'\)\}[\s\S]*testID='dm-tab'/
  )
  assert.match(
    tabs,
    /icon={Users}[\s\S]*label=\{getProductSurfaceLabel\('people'\)\}[\s\S]*testID='people-tab'/
  )
  assert.match(
    tabs,
    /icon={Sprout}[\s\S]*label=\{getProductSurfaceLabel\('treehole'\)\}[\s\S]*testID='treehole-tab'/
  )
  assert.match(
    tabButton,
    /function TabButton\(\{[\s\S]*active,[\s\S]*badgeCount = 0,[\s\S]*icon: Icon,[\s\S]*label,[\s\S]*onPress,[\s\S]*testID/
  )
  assert.match(tabButton, /<Icon[\s\S]*color=\{active \? selectedIconColor : iconColor\}/)
  assert.doesNotMatch(tabButton, /<Text style=\{\[styles\.tabText/)
  assert.match(tabButton, /badgeCount > 0/)
  assert.match(source, /tabIcon: \{/)
})

test('Android room tabs are bottom navigation', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /<View style={styles\.roomContent}>/)
  assert.equal(
    source.indexOf('<View style={styles.roomContent}>') <
      source.indexOf('<View style={styles.tabs}>'),
    true
  )
  assert.match(source, /tabs: \{\s*borderTopColor: theme\.border,/)
  assert.doesNotMatch(source, /tabs: \{\s*borderBottomColor: theme\.border,/)
})

test('Android room tabs expose selected accessibility state', async () => {
  const source = await readMobileUiSource()
  const tabButton = sliceBetween(source, 'function TabButton(', 'function ChatPane(')

  assert.match(tabButton, /accessibilityRole='tab'/)
  assert.match(tabButton, /accessibilityState=\{\{ selected: active \}\}/)
})

test('Android direct message empty state avoids DM shorthand', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /Choose a trusted contact and send the first message\./)
  assert.equal(source.includes('send the first DM.'), false)
})

test('Android message empty states share layout with contextual icons', async () => {
  const source = await readMobileUiSource()
  const emptyState = sliceBetween(source, 'function EmptyState(', 'function EmptyTreehole(')
  const emptyMessages = sliceBetween(
    source,
    'function EmptyMessages(',
    'function EmptyDirectMessages('
  )
  const emptyDirectMessages = sliceBetween(
    source,
    'function EmptyDirectMessages(',
    'function DirectBubble('
  )
  const emptyTreehole = sliceBetween(source, 'function EmptyTreehole(', 'function TreeholePost(')

  assert.match(emptyState, /function EmptyState\(\{[\s\S]*copy,[\s\S]*icon: Icon,[\s\S]*title/)
  assert.match(emptyState, /<Icon color=\{theme\.iconMuted\} size=\{34\} \/>/)
  assert.match(emptyMessages, /<EmptyState[\s\S]*icon=\{MessageCircle\}/)
  assert.match(emptyDirectMessages, /<EmptyState[\s\S]*icon=\{Send\}/)
  assert.match(emptyTreehole, /<EmptyState[\s\S]*icon=\{Sprout\}/)
})

test('Android direct message composer keeps revoke in contact profiles', async () => {
  const directPane = await readFile(
    new URL('../mobile/direct-components.tsx', import.meta.url),
    'utf8'
  )
  const profileComponents = await readFile(
    new URL('../mobile/profile-components.tsx', import.meta.url),
    'utf8'
  )
  const contactChip = sliceBetween(
    profileComponents,
    'function MobileContactChip(',
    'export type ContactProfileDetailView'
  )
  const contactProfileDetail = sliceBetween(
    profileComponents,
    'function ContactProfileDetail(',
    'function getMobileAvatarToneStyle('
  )
  const peopleComponents = await readFile(
    new URL('../mobile/people-components.tsx', import.meta.url),
    'utf8'
  )
  const contactManager = peopleComponents.slice(
    peopleComponents.indexOf('function ContactManager(')
  )

  assert.match(directPane, /contactOptions\.map/)
  assert.match(directPane, /<MobileContactChip[\s\S]*contact=\{contact\}/)
  assert.equal(directPane.includes('revokeChip'), false)
  assert.equal(directPane.includes('onRevokeContact'), false)
  assert.match(contactChip, /formatMobileTrustedContactName\(contact\)/)
  assert.equal(directPane.includes('{contact.alias}'), false)
  assert.doesNotMatch(contactManager, /onRevokeContact\(profile\.profileId\)/)
  assert.doesNotMatch(contactManager, /UserMinus/)
  assert.match(contactProfileDetail, /onRevokeContact\(profile\.profileId\)/)
  assert.match(contactProfileDetail, /UserMinus/)
})

test('Android direct message zero-contact state links to People', async () => {
  const source = await readMobileUiSource()
  const chatRoom = sliceBetween(source, 'function ChatRoom(', 'function PeoplePane(')
  const directPane = sliceBetween(source, 'function DirectPane(', 'function ContactManager(')

  assert.match(chatRoom, /onOpenPeople=\{\(\) => onTabChange\('people'\)\}/)
  assert.match(directPane, /onOpenPeople/)
  assert.match(directPane, /<PanelEmptyState[\s\S]*icon=\{Users\}/)
  assert.match(directPane, /No contacts yet/)
  assert.match(directPane, /Trust a friend first, then come back here to write privately\./)
  assert.match(directPane, /testID='dm-open-people-button'/)
  assert.match(directPane, /Open Contacts/)
  assert.match(directPane, /onPress=\{onOpenPeople\}/)
})

test('Android treehole empty state talks about posts', async () => {
  const source = await readMobileUiSource()
  const copy = await readFile(new URL('../src/mobile-product-copy.ts', import.meta.url), 'utf8')

  assert.match(source, /No posts yet/)
  assert.match(source, /getMobileTreeholeEmptyCopy\(status, \{ canPost \}\)/)
  assert.match(copy, /Posts from this home will appear here\./)
  assert.match(copy, /Waiting for the home owner to share posts\./)
  assert.match(copy, /Starting Treehole\./)
  assert.equal(source.includes('No treeholes yet'), false)
  assert.equal(source.includes('Starting the treehole log.'), false)
  assert.equal(source.includes('Waiting for a home peer to share the treehole log.'), false)
})

test('Android treehole composer explains owner-only posting', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /const \[treeholeCanPost, setTreeholeCanPost\] = useState\(false\)/)
  assert.match(source, /Object\.hasOwn\(payloadRecord, 'canPost'\)/)
  assert.match(source, /setTreeholeCanPost\(Boolean\(payloadRecord\.canPost\)\)/)
  assert.equal(
    source.includes('setTreeholeCanPost(Boolean(payload.canPost))\n          return'),
    false
  )
  assert.match(source, /canPost={treeholeCanPost}/)
  assert.match(source, /function TreeholePane\(\{\s*canInteract,\s*canPost,/)
  assert.match(source, /const canSubmitPost = canPost && draft\.trim\(\)/)
  assert.match(source, /const showOwnerOnlyHint = status === 'ready' && !canPost/)
  assert.match(source, /Only the owner can post here\./)
  assert.match(source, /editable=\{canPost\}/)
  assert.match(source, /!canPost && styles\.disabledTreeholeInput/)
  assert.match(source, /disabled=\{!canSubmitPost\}/)
  assert.match(source, /<MobileSendButton[\s\S]*disabled=\{!canSubmitPost\}/)
})

test('Android treehole interactions disable when the profile cannot interact', async () => {
  const source = await readMobileUiSource()
  const treeholePane = sliceBetween(source, 'function TreeholePane(', 'function EmptyTreehole(')
  const treeholePost = sliceBetween(source, 'function TreeholePost(', 'function EmptyMessages(')

  assert.match(source, /const \[treeholeCanInteract, setTreeholeCanInteract\] = useState\(false\)/)
  assert.match(source, /Object\.hasOwn\(payloadRecord, 'canInteract'\)/)
  assert.match(source, /setTreeholeCanInteract\(Boolean\(payloadRecord\.canInteract\)\)/)
  assert.match(source, /canInteract={treeholeCanInteract}/)
  assert.match(treeholePane, /function TreeholePane\(\{\s*canInteract,/)
  assert.match(treeholePane, /<TreeholePost[\s\S]*canInteract=\{canInteract\}/)
  assert.match(treeholePost, /function TreeholePost\(\{\s*canInteract,/)
  assert.match(treeholePost, /const canSubmitComment = canInteract && commentDraft\.trim\(\)/)
  assert.match(treeholePost, /disabled=\{!canInteract\}/)
  assert.match(treeholePost, /disabled=\{!canSubmitComment\}/)
  assert.match(treeholePost, /editable=\{canInteract\}/)
  assert.match(treeholePost, /Only trusted friends can comment or like here\./)
})

test('Android room has a Contacts tab for QR and trusted contacts', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /testID='people-tab'/)
  assert.match(source, /label=\{getProductSurfaceLabel\('chat'\)\}/)
  assert.match(source, /label=\{getProductSurfaceLabel\('people'\)\}/)
  assert.match(source, /activeTab === 'people'/)
  assert.match(source, /<PeoplePane/)
  assert.match(source, /Home QR/)
  assert.match(source, /Add friend/)
  assert.match(source, /ContactManager/)
})

test('Android people UI uses profile contacts copy', async () => {
  const source = await readMobileUiSource()
  const copy = await readFile(new URL('../src/mobile-product-copy.ts', import.meta.url), 'utf8')

  assert.match(source, /title='Contacts'/)
  assert.match(source, /createContactProfileViewModel\(/)
  assert.match(source, /<Text style=\{styles\.trustStatus\}>\{profile\.statusLabel\}<\/Text>/)
  assert.match(source, /\{profile\.displayName\}/)
  assert.match(source, /`Message \$\{profile\.displayName\}`/)
  assert.match(source, /label=\{profile\.messageLabel\}/)
  assert.match(source, /`Enter \$\{profile\.displayName\} home`/)
  assert.match(source, /label=\{profile\.enterHomeLabel\}/)
  assert.match(source, /profile\.recentTitle/)
  assert.match(source, /`Remove \$\{profile\.displayName\} as friend`/)
  assert.match(source, /profile\.sourceLabel/)
  assert.match(source, /profile\.trustedAtLabel/)
  assert.match(copy, /function formatMobileTrustedContactName\(contact\?: MobileContactLike/)
  assert.match(copy, /function formatMobileTrustSource\(source\?: string \| null\)/)
  assert.match(copy, /if \(source === 'home_room'\) return 'Home'/)
  assert.match(copy, /function formatMobileTrustTime\([\s\S]*trustedAt/)
  assert.equal(source.includes('<Text style={styles.panelTitle}>Contacts</Text>'), false)
  assert.equal(copy.includes("return 'Home room'"), false)
})

test('Android people pane surfaces pending message requests', async () => {
  const source = await readMobileUiSource()
  const rpcDmMessageHandler = sliceBetween(
    source,
    'if (req.command === RPC_DM_MESSAGE)',
    'if (req.command === RPC_DM_BODY_MESSAGE)'
  )
  const incomingMessageRequestHandler = sliceBetween(
    source,
    'async function handleIncomingMessageRequest(',
    'async function persistIncomingMessageRequest('
  )
  const persistIncomingMessageRequest = sliceBetween(
    source,
    'async function persistIncomingMessageRequest(',
    'async function acceptIncomingMessageRequest('
  )
  const messageRequestManager = sliceBetween(
    source,
    'function MessageRequestManager(',
    'function PeopleActions('
  )

  assert.match(
    rpcDmMessageHandler,
    /handleIncomingMessageRequest\(asMessageRequestPayload\(payload\)\)/
  )
  assert.doesNotMatch(rpcDmMessageHandler, /appendRemoteMessageRequest/)
  assert.match(incomingMessageRequestHandler, /const stored = await persistIncomingMessageRequest/)
  assert.match(incomingMessageRequestHandler, /if \(!stored\)/)
  assert.match(incomingMessageRequestHandler, /appendRemoteMessageRequest\(current, request\)/)
  assert.match(persistIncomingMessageRequest, /return false/)
  assert.match(persistIncomingMessageRequest, /contactBookRef\.current/)
  assert.match(persistIncomingMessageRequest, /recordMessageRequest\(currentBook/)
  assert.match(persistIncomingMessageRequest, /source: 'profile_request'/)
  assert.doesNotMatch(
    persistIncomingMessageRequest,
    /alias:\s*shortenProfileId\(request\.fromProfileId\)/
  )
  assert.match(persistIncomingMessageRequest, /return true/)
  assert.match(source, /pendingRequestsByProfileId\.values\(\)/)
  assert.match(source, /pendingRequests={pendingMessageRequests}/)
  assert.match(messageRequestManager, /Friend requests/)
  assert.match(messageRequestManager, /No friend requests/)
  assert.equal(messageRequestManager.includes('Message requests'), false)
  assert.equal(messageRequestManager.includes('No message requests'), false)
  assert.match(messageRequestManager, /\{formatMessageRequestTitle\(request\)\}/)
  assert.match(messageRequestManager, /\{formatMessageRequestSubtitle\(request\)\}/)
  assert.match(messageRequestManager, /\{formatRequestPreview\(request\.text\)\}/)
  assert.equal(messageRequestManager.includes('request.alias || shortenProfileId'), false)
  assert.match(messageRequestManager, /text: request\.text/)
  assert.match(messageRequestManager, /testID='people-message-request-accept-button'/)
  assert.match(messageRequestManager, /testID='people-message-request-ignore-button'/)
  assert.match(messageRequestManager, /Ignore/)
  assert.match(source, /function ignoreIncomingMessageRequest\(requestInput: unknown\)/)
  assert.match(source, /ignoreMessageRequest\(contactBook, \{/)
  assert.match(source, /function syncTreeholePolicy\(nextPolicy: TreeholePolicy \| null\)/)
  assert.match(source, /RPC_TREEHOLE_POLICY/)
  assert.match(source, /syncTreeholePolicy\(nextPolicy\)/)
  assert.match(source, /syncTreeholePolicy\(result\.treeholePolicy\)/)
  assert.match(messageRequestManager, /fromProfileId: request\.profileId/)
  assert.match(messageRequestManager, /toProfileId: profileId/)
  assert.match(
    messageRequestManager,
    /senderEncryptionPublicKey: request\.senderEncryptionPublicKey/
  )
})

test('Android sent requests copy uses Contacts language', async () => {
  const source = await readMobileUiSource()
  const outgoingRequestManager = sliceBetween(
    source,
    'function OutgoingRequestManager(',
    'function MessageRequestManager('
  )

  assert.match(outgoingRequestManager, /Friend requests you send stay here until accepted\./)
  assert.equal(outgoingRequestManager.includes('People you asked to trust you'), false)
})

test('Android restores and saves direct request session messages', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /restoreDirectMessageSession/)
  assert.match(source, /loadDmSessionMessagesFromFileSystem/)
  assert.match(source, /saveDmSessionMessagesToFileSystem/)
  assert.match(source, /async function restoreMobileDirectMessageSession\(/)
  assert.match(source, /await restoreMobileDirectMessageSession\(\)/)
  assert.match(source, /saveMobileDmSessionMessages\(nextSession\.messages\)/)
  assert.match(source, /saveMobileDmSessionMessages\(next\.messages\)/)
})

test('Android people pane keeps visible empty states', async () => {
  const source = await readMobileUiSource()
  const requestComponents = await readFile(
    new URL('../mobile/request-components.tsx', import.meta.url),
    'utf8'
  )
  const peopleComponents = await readFile(
    new URL('../mobile/people-components.tsx', import.meta.url),
    'utf8'
  )
  const messageRequestManager = sliceBetween(
    requestComponents,
    'function MessageRequestManager(',
    'export type MessageRequestManagerProps'
  )
  const contactManager = sliceBetween(
    peopleComponents,
    'function ContactManager(',
    'function toRequestTargetProfileInput('
  )
  const contactProfileDetail = sliceBetween(
    source,
    'function ContactProfileDetail(',
    'function TabButton('
  )

  assert.match(messageRequestManager, /No friend requests/)
  assert.match(messageRequestManager, /Friend requests you receive will appear here\./)
  assert.equal(/return null/.test(messageRequestManager), false)
  assert.match(contactManager, /No contacts yet/)
  assert.match(contactManager, /Accepted friends will appear here as contacts\./)
  assert.equal(/return null/.test(contactManager), false)
  assert.match(source, /from '\.\.\/src\/request-target-profile-view-model\.ts'/)
  assert.doesNotMatch(source, /function createRequestTargetProfileViewModel\(/)
  assert.match(contactProfileDetail, /if \(!profile\) return null/)
})

test('Android people empty panels share layout with contextual icons', async () => {
  const source = await readMobileUiSource()
  const panelComponents = await readFile(
    new URL('../mobile/panel-components.tsx', import.meta.url),
    'utf8'
  )
  const messageRequestManager = sliceBetween(
    source,
    'function MessageRequestManager(',
    'function PeopleActions('
  )
  const contactManager = sliceBetween(source, 'function ContactManager(', 'function TabButton(')

  assert.match(panelComponents, /function PanelEmptyState\(\{[\s\S]*copy,[\s\S]*icon: Icon/)
  assert.match(panelComponents, /<Icon color=\{iconColor\} size=\{24\} \/>/)
  assert.match(messageRequestManager, /<PanelEmptyState[\s\S]*icon=\{MessageCircle\}/)
  assert.match(messageRequestManager, /iconColor=\{theme\.iconMuted\}/)
  assert.match(contactManager, /<PanelEmptyState[\s\S]*icon=\{Users\}/)
  assert.match(contactManager, /iconColor=\{theme\.iconMuted\}/)
})

test('Android people management panels use shared task headers', async () => {
  const source = await readMobileUiSource()
  const messageRequestManager = sliceBetween(
    source,
    'function MessageRequestManager(',
    'function PeopleActions('
  )
  const contactManager = sliceBetween(source, 'function ContactManager(', 'function TabButton(')

  assert.match(
    messageRequestManager,
    /<TaskHeader[\s\S]*eyebrow='Requests'[\s\S]*title='Friend requests'/
  )
  assert.match(
    messageRequestManager,
    /description='Accept only contacts you want to message privately\.'/
  )
  assert.match(contactManager, /<TaskHeader[\s\S]*eyebrow='Profiles'[\s\S]*title='Contacts'/)
  assert.match(
    contactManager,
    /description='Open a profile, message a trusted contact, or enter when Home access is saved\.'/
  )
  assert.equal(
    messageRequestManager.includes('<Text style={styles.panelTitle}>Message requests</Text>'),
    false
  )
  assert.equal(contactManager.includes('<Text style={styles.panelTitle}>Contacts</Text>'), false)
})

test('Android Contacts tab owns the people action UI', async () => {
  const lobbyComponents = await readFile(
    new URL('../mobile/lobby-components.tsx', import.meta.url),
    'utf8'
  )
  const peopleComponents = await readFile(
    new URL('../mobile/people-components.tsx', import.meta.url),
    'utf8'
  )
  const startupPane = lobbyComponents.slice(lobbyComponents.indexOf('function HomeStartupPane('))
  const peoplePane = sliceBetween(
    peopleComponents,
    'function PeoplePane(',
    'export type PeopleActionsProps'
  )

  assert.match(peopleComponents, /function PeopleActions\(/)
  assert.doesNotMatch(startupPane, /<PeopleActions/)
  assert.match(peoplePane, /<PeopleActions/)
})

test('Android people pane only offers joining before a home session exists', async () => {
  const source = await readMobileUiSource()
  const room = sliceBetween(source, 'function ChatRoom(', 'function toPeopleContact(')
  const peoplePane = sliceBetween(source, 'function PeoplePane(', 'function MessageRequestManager(')
  const peopleActions = sliceBetween(source, 'function PeopleActions(', 'function DirectPane(')

  assert.match(room, /canJoinHome=\{!session\}/)
  assert.match(peoplePane, /canJoinHome=\{canJoinHome\}/)
  assert.match(peopleActions, /const canUseHomeJoin = profileReady && canJoinHome/)
  assert.match(peopleActions, /disabled=\{!canUseHomeJoin\}/)
  assert.match(peopleActions, /disabled=\{!canUseHomeJoin \|\| !homeQrUri\.trim\(\)\}/)
  assert.match(peopleActions, /Leave this home before joining another one\./)
})

test('Android QR scanner keeps the camera preview visible', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /scannerCamera: \{\s*flex: 1,/)
  assert.match(source, /scannerControls: \{/)
  assert.doesNotMatch(source, /scannerCamera: \{\s*\.\.\.StyleSheet\.absoluteFillObject/)
  assert.doesNotMatch(source, /SafeAreaView/)
})

test('Android QR scanner has an in-flow permission denied state', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /const \[scannerPermissionDenied, setScannerPermissionDenied\]/)
  assert.match(source, /permissionDenied={scannerPermissionDenied}/)
  assert.match(source, /testID='qr-scanner-permission'/)
  assert.match(source, /Camera access is off\./)
  assert.match(source, /Enable camera permission to scan QR codes\./)
  assert.match(source, /setScannerPermissionDenied\(true\)/)
  assert.match(source, /setScannerPermissionDenied\(false\)/)
})

test('Android supports Neo Cozy light and Indie Console dark themes', async () => {
  const source = await readMobileUiSource()
  const tokens = await readFile(new URL('../src/mobile-theme-tokens.ts', import.meta.url), 'utf8')

  assert.match(source, /useColorScheme/)
  assert.match(source, /from '\.\.\/src\/mobile-theme-tokens\.ts'/)
  assert.match(tokens, /const mobileThemes[:\w\s<>,]*= \{/)
  assert.match(tokens, /neoCozy/)
  assert.match(tokens, /indieConsole/)
  assert.match(source, /function createMobileStyles\(theme: MobileThemeTokens\)/)
  assert.match(source, /MobileThemeContext\.Provider/)
  assert.match(source, /StatusBar barStyle=\{theme\.statusBar\}/)
  assert.match(source, /backgroundColor: theme\.surface/)
  assert.match(tokens, /surface: '#171d33'/)
  assert.match(tokens, /accent: '#ffcf3d'/)
})

test('Android theme styles are passed through context instead of mutable module state', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /const fallbackMobileStyles = createMobileStyles\(mobileThemes\.neoCozy\)/)
  assert.match(source, /const theme = getMobileThemeForScheme\(colorScheme\)/)
  assert.match(
    source,
    /const themedStyles = useMemo\(\(\) => createMobileStyles\(theme\), \[theme\]\)/
  )
  assert.match(source, /MobileThemeContext\.Provider value=\{\{ styles: themedStyles, theme \}\}/)
  assert.match(source, /styles=\{styles\}[\s\S]*theme=\{theme\}/)
  assert.doesNotMatch(source, /let styles = createMobileStyles/)
  assert.doesNotMatch(source, /styles = useMemo/)
})

test('desktop UI exposes stable hooks for two-device smoke', async () => {
  const source = await readDesktopUiSource()

  for (const id of [
    'showLargeHomeQrButton',
    'showLargeProfileQrButton',
    'largeQrDialog',
    'largeQrCode',
    'largeQrCloseButton',
    'homeQrInput',
    'joinHomeQrButton',
    'trustQrInput',
    'trustAliasInput',
    'trustButton',
    'chatInput',
    'dmRecipientInput',
    'dmInput',
    'treeholeInput'
  ]) {
    assert.match(source, new RegExp(`id=['"]${id}['"]`), `${id} is missing`)
  }

  assert.match(source, /outputId='homeQrOutput'/)
  assert.match(source, /outputId='profileQrOutput'/)
})

test('desktop large QR dialog renders scan-sized QR codes', async () => {
  const app = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const actions = await readFile(new URL('../src/desktop-qr-actions.ts', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  for (const marker of [
    'showLargeQr',
    'hideLargeQr',
    'largeQrCode',
    'setLargeQr',
    'dangerouslySetInnerHTML',
    'width: 640',
    '62vmin',
    '100vh - 150px',
    'largeQrDialog.hidden'
  ]) {
    assert.match(
      `${app}\n${controller}\n${actions}\n${styles}`,
      new RegExp(marker),
      `${marker} is missing`
    )
  }
})

test('desktop large QR dialog is keyboard reachable', async () => {
  const app = await readDesktopUiSource()
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(new URL('../src/desktop-qr-actions.ts', import.meta.url), 'utf8')

  assert.match(app, /aria-labelledby='largeQrTitle'/)
  assert.match(actions, /let largeQrReturnFocus: FocusTarget \| null = null/)
  assert.match(app, /actions\.showLargeHomeQr\(\{ returnFocus: event\.currentTarget \}\)/)
  assert.match(app, /actions\.showLargeProfileQr\(\{ returnFocus: event\.currentTarget \}\)/)
  assert.match(
    bindings,
    /showLargeHomeQr: \(\{ returnFocus \}\) =>[\s\S]*qrActions[\s\S]*\.showLargeQr\(\{[\s\S]*title: 'Debug Home QR'/
  )
  assert.match(
    bindings,
    /showLargeProfileQr: \(\{ returnFocus \}\) =>[\s\S]*qrActions[\s\S]*\.showLargeQr\(\{[\s\S]*title: 'Profile QR'/
  )
  assert.match(actions, /largeQrReturnFocus = returnFocus/)
  assert.match(app, /<ActionButton[\s\S]*autoFocus=\{qr\.isOpen\}[\s\S]*id='largeQrCloseButton'/)
  assert.match(actions, /largeQrReturnFocus\?\.focus\(\)/)
  assert.match(app, /event\.key === 'Escape'/)
  assert.match(app, /event\.target === event\.currentTarget/)
  assert.match(bindings, /hideLargeQr: \(\) => qrActions\.hideLargeQr\(\)/)
})

test('debug two-device smoke covers live DM exchange and restart persistence', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  const source = await readFile(
    new URL('../scripts/smoke-two-device-debug.mjs', import.meta.url),
    'utf8'
  )

  assert.equal(
    packageJson.scripts['smoke:two-device:debug:pear'],
    'npm run desktop:bundle && node scripts/smoke-two-device-debug.mjs --pear'
  )

  for (const marker of [
    "usePearRuntime = process\\.argv\\.includes\\('--pear'\\)",
    "KEPOS_DESKTOP_PEAR: usePearRuntime \\? '1' : undefined",
    "KEPOS_SMOKE_DESKTOP: '1'",
    'prepareAndroidDevice',
    'configureAndroidSmokeInputMethod',
    'org\\.futo\\.inputmethod\\.latin/\\.LatinIME',
    'restoreAndroidInputMethod',
    'grantAndroidCameraPermission',
    'ensureAdbReverse',
    'ensureMetroServer',
    'android\\.permission\\.CAMERA',
    'KEYCODE_WAKEUP',
    '127\\.0\\.0\\.1:8081/status',
    'Two-device smoke requires Metro',
    "runAdb\\(\\['shell', 'input', 'text', roomKey\\]\\)",
    'android-debug-join-open.yaml',
    'android-debug-join-submit.yaml',
    'bringAndroidDevClientToForeground',
    'android.intent.action.VIEW',
    'transportDebugLabel',
    'room-transport-debug',
    'tapAndroidResourceId',
    'boundsByResourceId',
    'room-transport-debug',
    "text: 'Connected\\.'",
    'openDesktopPeopleActions',
    'expo-development-client',
    'waitForAndroidAppSurface',
    'assertKeposAndroidForeground',
    'readAndroidForeground',
    'requires Kepos in foreground',
    'mCurrentFocus',
    'mFocusedApp',
    '/dev/tty',
    'runMaestroWithAndroidDiagnostics',
    'Android foreground:',
    'Android screenshot:',
    'Android UI XML:',
    "exec-out', 'screencap', '-p",
    'Unable to read Android profile URI from UI',
    'sendAndroidMessageRequest',
    'acceptDesktopMessageRequest',
    'people-tab',
    'advanced-share-toggle',
    'centerElement: true',
    'sendAndroidDmBody',
    'sendDesktopDmBody',
    'restartBothAppsAndRejoin',
    'verifyDmPersistsAfterRestart',
    'waitForAndroidRecentPostText',
    'desktop treehole post appears in Android trusted profile recent posts',
    'revokeDesktopContact',
    'verifyDesktopDmClosedAfterRevoke',
    'MaestroDriverStartupException',
    'INSTALL_FAILED_VERIFICATION_FAILURE',
    'StatusRuntimeException: UNAVAILABLE'
  ]) {
    assert.match(source, new RegExp(marker), `${marker} is missing`)
  }

  const joinFlow = source.slice(
    source.indexOf("const openFlow = path.join(workDir, 'android-debug-join-open.yaml')"),
    source.indexOf("const submitFlow = path.join(workDir, 'android-debug-join-submit.yaml')")
  )
  assert.doesNotMatch(joinFlow, /inputText: '\$\{roomKey\}'/)

  assert.equal(
    source.indexOf("id: 'people-tab'") < source.indexOf("id: 'advanced-share-toggle'"),
    true
  )
})

test('Android records accepted DM threads in UI state before async storage completes', async () => {
  const source = await readMobileUiSource()

  assert.match(
    source,
    /import \{[\s\S]*createDmThreadListView,[\s\S]*filterDirectMessagesForProfile,[\s\S]*upsertDmThread[\s\S]*\} from '\.\.\/src\/dm-thread-list\.ts'/
  )
  assert.match(
    source,
    /if \(req\.command === RPC_DM_THREAD\) \{[\s\S]*setDmThreads\(\(current\) => upsertDmThread\(current, threadPayload\)\)/
  )
})

test('Android accepted request invites update local trust state', async () => {
  const source = await readMobileUiSource()

  assert.match(source, /acceptOutgoingFriendRequest/)
  assert.match(source, /recordOutgoingFriendRequest/)
  assert.match(
    source,
    /if \(req\.command === RPC_DM_THREAD\) \{[\s\S]*acceptOutgoingFriendRequest\([\s\S]*profileId: threadPayload\.remoteProfileId/
  )
  assert.match(
    source,
    /function sendMessageRequest\(\) \{[\s\S]*recordOutgoingFriendRequest\([\s\S]*requestId: message\.requestId/
  )
})

test('debug two-device smoke resets Android throwaway storage before exercising current threads', async () => {
  const source = await readFile(
    new URL('../scripts/smoke-two-device-debug.mjs', import.meta.url),
    'utf8'
  )

  assert.match(source, /resetAndroidSmokeData\(\)/)
  assert.match(source, /markSmokeStorage\(userDataDir\)/)
  assert.match(source, /markSmokeStorage\(workDir\)/)
  assert.match(source, /rm -rf files\/kepos\/dm files\/kepos\/kepos\/dm/)
  assert.match(source, /files\/kepos\/kepos-treehole-\*/)
})

test('debug two-device smoke passes desktop direct endpoint into Android manual join', async () => {
  const source = await readFile(
    new URL('../scripts/smoke-two-device-debug.mjs', import.meta.url),
    'utf8'
  )

  assert.match(source, /KEPOS_DIRECT_ADVERTISED_HOST: directAdvertisedHost/)
  assert.match(source, /const desktopDirectEndpoint = await waitForDesktopDirectEndpoint\(page\)/)
  assert.match(source, /await runAndroidJoinFlow\(desktopHome\.roomKey, desktopDirectEndpoint\)/)
  assert.match(source, /tapAndroidResourceId\('manual-home-endpoint-input'\)/)
  assert.match(
    source,
    /runAdb\(\['shell', 'input', 'text', escapeAndroidInputText\(directEndpoint\)\]\)/
  )
  assert.match(source, /function parseDirectEndpointFromDebug\(text = ''\)/)
})
