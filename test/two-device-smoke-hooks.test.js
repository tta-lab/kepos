import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readDesktopUiSource() {
  const app = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const appState = await readFile(new URL('../desktop/app-state.jsx', import.meta.url), 'utf8')
  const panes = await readFile(new URL('../desktop/pane-components.jsx', import.meta.url), 'utf8')
  const shell = await readFile(new URL('../desktop/shell-components.jsx', import.meta.url), 'utf8')
  const context = await readFile(
    new URL('../desktop/context-components.jsx', import.meta.url),
    'utf8'
  )
  const people = await readFile(
    new URL('../desktop/people-components.jsx', import.meta.url),
    'utf8'
  )
  return `${app}\n${appState}\n${panes}\n${shell}\n${context}\n${people}`
}

test('Android UI exposes stable hooks for two-device smoke', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

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

test('Android lucide icons used in JSX are imported', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const lucideImport = source.match(/import\s+\{([^}]+)\}\s+from 'lucide-react-native'/)

  assert.ok(lucideImport, 'lucide-react-native import is missing')

  const importedIcons = new Set(
    lucideImport[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  )

  for (const icon of [
    'ArrowRight',
    'Heart',
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
    assert.match(source, new RegExp(`<${icon}\\b`), `${icon} is not rendered`)
  }
})

test('Android lobby is scrollable so QR and trust controls are reachable', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /<ScrollView[^>]+testID='lobby-scroll'/)
  assert.match(source, /contentContainerStyle={styles\.lobby}/)
  assert.match(source, /<\/ScrollView>/)
})

test('Android lobby uses product action words for QR and trust flows', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  for (const text of [
    'My Home QR',
    'Join a home',
    'My Profile QR',
    'Friend profile',
    'Friend name',
    'Paste Home QR',
    'Paste Profile QR',
    'Add trusted friend'
  ]) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.equal(source.includes('Home URI'), false)
  assert.equal(source.includes('Profile trust'), false)
  assert.equal(source.includes('Join Home URI'), false)
  assert.equal(source.includes('Trust Profile'), false)
  assert.equal(source.includes("label='Alias'"), false)
  assert.equal(source.includes('Paste Home QR text'), false)
  assert.equal(source.includes('Paste Profile QR text'), false)
})

test('Android lobby starts with compact product choices', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /function QuickStartPanel\(/)
  assert.match(source, /Start here/)
  assert.match(source, /<Field label='Name' onChangeText={onNickChange} value={nick} \/>/)
  assert.match(source, /Create my home/)
  assert.match(source, /testID='quick-show-home-qr-button'[\s\S]*Invite a friend/)
  assert.match(source, /showQuickHomeQr \? <QrCard value={myHomeQrUri} \/> : null/)
  assert.match(source, /testID='quick-scan-home-qr-button'[\s\S]*Join a home/)
  assert.match(source, /testID='quick-scan-profile-qr-button'[\s\S]*Trust a friend/)
  assert.equal(source.indexOf('Scan Home QR') > source.indexOf('function PeopleActions'), true)
  assert.equal(source.indexOf('Scan Profile QR') > source.indexOf('function PeopleActions'), true)
  assert.match(source, /const \[showPeopleSetup, setShowPeopleSetup\] = useState\(false\)/)
  assert.match(source, /testID='people-setup-toggle'/)
  assert.match(source, /People setup/)
  assert.match(source, /showPeopleSetup \? \(/)
  assert.equal(
    source.indexOf('<QuickStartPanel') < source.indexOf("testID='people-setup-toggle'"),
    true
  )
  assert.equal(source.indexOf('<PeopleActions') > source.indexOf('showPeopleSetup ? ('), true)
  assert.equal(source.includes("label='Nick'"), false)
})

test('Android setup action buttons use icons consistently', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const lobby = source.slice(
    source.indexOf('function Lobby('),
    source.indexOf('function ChatRoom(')
  )
  const peopleActions = source.slice(
    source.indexOf('function PeopleActions('),
    source.indexOf('function DirectPane(')
  )
  const directPane = source.slice(
    source.indexOf('function DirectPane('),
    source.indexOf('function ContactManager(')
  )

  assert.match(peopleActions, /testID='scan-home-qr-button'[\s\S]*<ArrowRight\b/)
  assert.match(peopleActions, /testID='scan-profile-qr-button'[\s\S]*<Plus\b/)
  assert.match(lobby, /testID='advanced-join-toggle'[\s\S]*<Settings\b/)
  assert.match(peopleActions, /testID='advanced-share-toggle'[\s\S]*<Settings\b/)
  assert.match(directPane, /testID='advanced-dm-recipient-toggle'[\s\S]*<Settings\b/)
})

test('Android lobby uses shared task headers for setup panels', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const quickStart = source.slice(
    source.indexOf('function QuickStartPanel('),
    source.indexOf('function PeoplePane(')
  )
  const peopleActions = source.slice(
    source.indexOf('function PeopleActions('),
    source.indexOf('function DirectPane(')
  )

  assert.match(source, /function TaskHeader\(\{ eyebrow, title, description \}\)/)
  assert.match(quickStart, /<TaskHeader[\s\S]*eyebrow='Start'[\s\S]*title='Start here'/)
  assert.match(
    quickStart,
    /description=\{[\s\S]*profileReady[\s\S]*\? 'Start a private space for trusted friends\. Create, join, or trust someone nearby\.'[\s\S]*: 'Setting up your profile\.\.\.'[\s\S]*\}/
  )
  assert.match(peopleActions, /<TaskHeader[\s\S]*eyebrow='Invite'[\s\S]*title='My Home QR'/)
  assert.match(peopleActions, /<TaskHeader[\s\S]*eyebrow='Trust'[\s\S]*title='My Profile QR'/)
  assert.match(source, /taskHeader: \{/)
  assert.match(source, /taskEyebrow: \{/)
  assert.match(source, /taskTitle: \{/)
  assert.match(source, /taskDescription: \{/)
})

test('Android lobby disables profile-dependent actions while profile loads', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(
    source,
    /const profileReady = Boolean\(identity && profileId && homeRoomKey && contactBook\)/
  )
  assert.match(source, /profileReady={profileReady}/)
  assert.match(source, /function QuickStartPanel\([\s\S]*profileReady[\s\S]*\) \{/)
  assert.match(source, /Setting up your profile\.\.\./)
  assert.match(source, /disabled={!profileReady}/)
  assert.match(source, /!profileReady && styles\.disabledButton/)
  assert.match(source, /canJoin={profileReady && canJoin}/)
  assert.match(source, /function PeopleActions\([\s\S]*profileReady[\s\S]*\) \{/)
  assert.match(source, /const canUseHomeJoin = profileReady && canJoinHome/)
  assert.match(source, /disabled=\{!canUseHomeJoin \|\| !homeQrUri\.trim\(\)\}/)
  assert.match(source, /disabled={!profileReady \|\| !trustQrUri\.trim\(\)}/)
})

test('Android normal UI copy avoids backend and address language', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  for (const text of [
    'Create your home or join a friend',
    'Create my home',
    'Start a private space for trusted friends.',
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
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

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
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /const \[showHomeQr, setShowHomeQr\] = useState\(false\)/)
  assert.match(source, /const \[showProfileQr, setShowProfileQr\] = useState\(false\)/)
  assert.match(source, /Show My Home QR/)
  assert.match(source, /Show My Profile QR/)
  assert.match(source, /showHomeQr \? <QrCard value={myHomeQrUri} \/> : null/)
  assert.match(source, /showProfileQr \? <QrCard value={profileQrUri} \/> : null/)
  assert.equal(
    source.includes('<Text style={styles.panelTitle}>My Home QR</Text>\\n        <QrCard'),
    false
  )
  assert.equal(
    source.includes('<Text style={styles.panelTitle}>My Profile QR</Text>\\n        <QrCard'),
    false
  )
})

test('Android paste QR fallback stays behind advanced people controls', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

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
  const mobile = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const desktopApp = await readDesktopUiSource()
  const desktop = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const desktopBindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const desktopPeopleViewModel = await readFile(
    new URL('../src/desktop-people-view-model.js', import.meta.url),
    'utf8'
  )
  const desktopDirectViewModel = await readFile(
    new URL('../src/desktop-direct-view-model.js', import.meta.url),
    'utf8'
  )

  assert.match(mobile, /: formatMessageRequestTitle\(message\)/)
  assert.match(desktopDirectViewModel, /formatDesktopMessageRequestTitle/)
  assert.match(mobile, /You asked someone to start a DM/)
  assert.match(desktopDirectViewModel, /You asked someone to start a DM/)
  assert.match(desktopPeopleViewModel, /wants to start a DM/)
  assert.match(mobile, /testID='message-request-ignore-button'/)
  assert.match(mobile, /onIgnoreRequest\(message\)/)
  assert.match(desktopApp, /onClick=\{\(\) => onIgnore\(message\.actions\.ignoreMessage\)\}/)
  assert.match(
    desktopBindings,
    /ignoreMessage: \(message\) => dispatchCommand\('ignoreMessageRequest'/
  )
  assert.match(mobile, /wants to start a DM/)
  assert.match(desktopPeopleViewModel, /wants to start a DM/)
  assert.equal(mobile.includes('asked Profile'), false)
  assert.equal(desktop.includes('asked Profile'), false)
  assert.equal(mobile.includes('Profile ${shortenProfileId(peer)} wants to start a DM'), false)
  assert.equal(desktop.includes('Profile ${shorten(peer)} wants to start a DM'), false)
  assert.equal(mobile.includes('request ${outgoing ?'), false)
  assert.equal(desktop.includes('message request ${message.direction'), false)
})

test('direct message meta avoids DM fallback and raw recipient framing', async () => {
  const mobile = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const desktop = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const desktopDirectViewModel = await readFile(
    new URL('../src/desktop-direct-view-model.js', import.meta.url),
    'utf8'
  )

  assert.match(mobile, /You to \${displayDirectPeer\(message\.toProfileId\)}/)
  assert.match(desktopDirectViewModel, /You to \$\{displayDirectPeer\(message\.toProfileId/)
  assert.match(mobile, /\${displayDirectPeer\(message\.fromProfileId, message\.nick\)} to you/)
  assert.match(desktopDirectViewModel, /displayDirectPeer\(message\.fromProfileId/)
  assert.equal(mobile.includes("message.nick || 'DM'"), false)
  assert.equal(desktop.includes("message.nick || 'DM'"), false)
})

test('Android message bubbles separate metadata from readable bodies', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /style=\{styles\.bubbleMetaRow\}/)
  assert.match(source, /style=\{\[\s*styles\.bubbleTextBlock/)
  assert.match(source, /bubbleMetaRow: \{/)
  assert.match(source, /bubbleTextBlock: \{/)
  assert.match(source, /inBubbleTextBlock: \{/)
  assert.match(source, /outBubbleTextBlock: \{/)
})

test('normal error notices avoid raw exception text', async () => {
  const mobile = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
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
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /const \[lastError, setLastError\] = useState\(''\)/)
  assert.match(source, /lastError={lastError}/)
  assert.match(source, /setLastError\(error\.message\)/)
  assert.match(source, /setLastError\(payload\.message \|\| 'Home connection error'\)/)
  assert.match(source, /<Text style={styles\.roomLabel}>Error detail<\/Text>/)
  assert.match(source, /testID='room-error-detail'/)
  assert.match(source, /\{lastError \|\| 'none'\}/)
  assert.equal(source.includes('setNotice(error.message)'), false)
  assert.equal(source.includes('setNotice(payload.message)'), false)
})

test('mobile success notices avoid profile id snippets', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /setNotice\('Trusted friend added\.'\)/)
  assert.match(source, /setNotice\('Trust revoked\.'\)/)
  assert.match(source, /setNotice\('Message request accepted\.'\)/)
  assert.match(source, /setNotice\('Could not save this direct message\.'\)/)
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
    new URL('../src/desktop-message-request-actions.js', import.meta.url),
    'utf8'
  )
  const controlActions = await readFile(
    new URL('../src/desktop-control-actions.js', import.meta.url),
    'utf8'
  )
  const trustActions = await readFile(
    new URL('../src/desktop-trust-actions.js', import.meta.url),
    'utf8'
  )
  const source = `${controller}\n${messageRequestActions}\n${controlActions}\n${trustActions}`

  assert.match(source, /setNotice\('Trusted friend added\.'\)/)
  assert.match(source, /setNotice\('Message request accepted\.'\)/)
  assert.match(source, /setNotice\('Direct message ready\.'\)/)
  assert.match(source, /setNotice\('Trust revoked\.'\)/)
  assert.equal(source.includes("notice: 'DM invite accepted.'"), false)
  assert.equal(source.includes('notice: `Trusted ${shorten(result.profileId)}.`'), false)
  assert.equal(
    source.includes('notice: `Accepted message request from ${shorten(message.fromProfileId)}.`'),
    false
  )
})

test('Android header shows product home status instead of raw peer count', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /function getMobileHomeStatus\(/)
  assert.match(source, /function getMobileTreeholeStatus\(/)
  assert.match(source, /getMobileHomeStatus\(\{ online: peerCount, session \}\)/)
  assert.match(source, /getMobileTreeholeStatus\(treeholeStatus\)/)
  assert.match(source, /treeholeStatusLabel=\{treeholeStatusLabel\}/)
  assert.match(source, /style=\{styles\.mobileStatusStrip\}/)
  assert.match(source, /style=\{styles\.homeStatusPill\}/)
  assert.match(source, /style=\{styles\.treeholeStatusPill\}/)
  assert.match(source, /Connected/)
  assert.match(source, /Waiting for friends/)
  assert.match(source, /Offline/)
  assert.match(source, /Treehole ready/)
  assert.match(source, /Treehole offline/)
  assert.equal(source.includes('Looking for peers'), false)
  assert.equal(source.includes('{online} peer'), false)
})

test('Android backend status notices avoid raw worker status codes', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /function getMobileBackendNotice\(status\)/)
  assert.match(source, /setNotice\(getMobileBackendNotice\(payload\.status\)\)/)
  assert.match(source, /return 'Starting home\.\.\.'/)
  assert.match(source, /return 'Syncing treehole\.\.\.'/)
  assert.match(source, /return 'Connected\.'/)
  assert.equal(source.includes('setNotice(`Home ${payload.status}.`)'), false)
  assert.equal(source.includes('Home joining-swarm.'), false)
  assert.equal(source.includes('Home opening-treehole-store.'), false)
})

test('Android room bar keeps raw home key behind advanced details', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /const \[showRoomAdvanced, setShowRoomAdvanced\] = useState\(false\)/)
  assert.match(source, /function getMobileRoomSurface\(activeTab\)/)
  assert.match(source, /const roomSurface = getMobileRoomSurface\(activeTab\)/)
  assert.match(source, /Current space/)
  assert.match(source, /\{roomSurface\}/)
  assert.equal(source.includes('Live session'), false)
  assert.match(source, /showRoomAdvanced \? \(/)
  assert.equal(
    source.indexOf("testID='room-home-address'") > source.indexOf('showRoomAdvanced ? ('),
    true
  )
})

test('Android room advanced action uses an icon like other advanced controls', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const chatRoom = source.slice(
    source.indexOf('function ChatRoom('),
    source.indexOf('function TaskHeader(')
  )

  assert.match(chatRoom, /style=\{styles\.roomAdvancedButton\}/)
  assert.match(chatRoom, /<Settings color=\{theme\.inkSoft\} size=\{15\} \/>/)
  assert.match(chatRoom, /<Text style=\{styles\.advancedSummary\}>Advanced<\/Text>/)
})

test('Android room panes label live and durable surfaces', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  for (const text of ['Live home chat', 'Direct messages', 'Durable treehole']) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.match(source, /paneEyebrow:/)
  assert.match(source, /paneTitle:/)
})

test('Android home chat disables empty sends like other composers', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /testID='chat-send-button'/)
  assert.match(source, /disabled=\{!draft\.trim\(\)\}/)
  assert.match(source, /\[styles\.sendButton, !draft\.trim\(\) && styles\.disabledSendButton\]/)
})

test('Android icon-only buttons expose accessible labels', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  for (const label of [
    'Leave home',
    'Send home message',
    'Send direct message',
    'Post to treehole',
    'Send treehole comment'
  ]) {
    assert.match(source, new RegExp(`accessibilityLabel=['"]${label}['"]`), `${label} is missing`)
  }
})

test('Android room tabs use product labels', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /label='Direct'[\s\S]*testID='dm-tab'/)
  assert.equal(source.includes("label='DM'"), false)
})

test('Android room tabs use icons for main navigation', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const tabs = source.slice(
    source.indexOf('<View style={styles.tabs}>'),
    source.indexOf('function TaskHeader(')
  )
  const tabButton = source.slice(
    source.indexOf('function TabButton('),
    source.indexOf('function ChatPane(')
  )

  assert.match(tabs, /icon={MessageCircle}[\s\S]*label='Home'[\s\S]*testID='chat-tab'/)
  assert.match(tabs, /icon={Send}[\s\S]*label='Direct'[\s\S]*testID='dm-tab'/)
  assert.match(tabs, /icon={Sprout}[\s\S]*label='Treehole'[\s\S]*testID='treehole-tab'/)
  assert.match(tabs, /icon={Users}[\s\S]*label='People'[\s\S]*testID='people-tab'/)
  assert.match(
    tabButton,
    /function TabButton\(\{ active, badgeCount = 0, icon: Icon, label, onPress, testID \}\)/
  )
  assert.match(tabButton, /<Icon[\s\S]*color=\{active \? theme\.surface : theme\.iconMuted\}/)
  assert.match(tabButton, /badgeCount > 0/)
  assert.match(source, /tabIcon: \{/)
})

test('Android room tabs are bottom navigation', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

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
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const tabButton = source.slice(
    source.indexOf('function TabButton('),
    source.indexOf('function ChatPane(')
  )

  assert.match(tabButton, /accessibilityRole='tab'/)
  assert.match(tabButton, /accessibilityState=\{\{ selected: active \}\}/)
})

test('Android direct message empty state avoids DM shorthand', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /Choose a trusted friend and send the first message\./)
  assert.equal(source.includes('send the first DM.'), false)
})

test('Android message empty states share layout with contextual icons', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const emptyState = source.slice(
    source.indexOf('function EmptyState('),
    source.indexOf('function EmptyTreehole(')
  )
  const emptyMessages = source.slice(
    source.indexOf('function EmptyMessages('),
    source.indexOf('function EmptyDirectMessages(')
  )
  const emptyDirectMessages = source.slice(
    source.indexOf('function EmptyDirectMessages('),
    source.indexOf('function DirectBubble(')
  )
  const emptyTreehole = source.slice(
    source.indexOf('function EmptyTreehole('),
    source.indexOf('function PaneLabel(')
  )

  assert.match(emptyState, /function EmptyState\(\{\s*copy,\s*icon: Icon,\s*title\s*\}\)/)
  assert.match(emptyState, /<Icon color=\{theme\.iconMuted\} size=\{34\} \/>/)
  assert.match(emptyMessages, /<EmptyState[\s\S]*icon=\{MessageCircle\}/)
  assert.match(emptyDirectMessages, /<EmptyState[\s\S]*icon=\{Send\}/)
  assert.match(emptyTreehole, /<EmptyState[\s\S]*icon=\{Sprout\}/)
})

test('Android direct message composer keeps revoke in People', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const directPane = source.slice(
    source.indexOf('function DirectPane('),
    source.indexOf('function ContactManager(')
  )
  const contactManager = source.slice(source.indexOf('function ContactManager('))

  assert.match(directPane, /contactOptions\.map/)
  assert.equal(directPane.includes('revokeChip'), false)
  assert.equal(directPane.includes('onRevokeContact'), false)
  assert.match(contactManager, /onRevokeContact\(contact\.profileId\)/)
  assert.match(contactManager, /UserMinus/)
})

test('Android direct message zero-contact state links to People', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const chatRoom = source.slice(
    source.indexOf('function ChatRoom('),
    source.indexOf('function PeoplePane(')
  )
  const directPane = source.slice(
    source.indexOf('function DirectPane('),
    source.indexOf('function ContactManager(')
  )

  assert.match(chatRoom, /onOpenPeople=\{\(\) => onTabChange\('people'\)\}/)
  assert.match(directPane, /onOpenPeople/)
  assert.match(directPane, /<PanelEmptyState[\s\S]*icon=\{Users\}/)
  assert.match(directPane, /No trusted friends yet/)
  assert.match(directPane, /Trust a friend first, then come back here to write privately\./)
  assert.match(directPane, /testID='dm-open-people-button'/)
  assert.match(directPane, /Trust a friend/)
  assert.match(directPane, /onPress=\{onOpenPeople\}/)
})

test('Android treehole empty state talks about posts', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /No posts yet/)
  assert.match(source, /Waiting for the home owner to share the treehole\./)
  assert.match(source, /Starting the treehole\./)
  assert.equal(source.includes('No treeholes yet'), false)
  assert.equal(source.includes('Starting the treehole log.'), false)
  assert.equal(source.includes('Waiting for a home peer to share the treehole log.'), false)
})

test('Android treehole composer explains owner-only posting', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /const \[treeholeCanPost, setTreeholeCanPost\] = useState\(false\)/)
  assert.match(source, /Object\.hasOwn\(payload, 'canPost'\)/)
  assert.match(source, /setTreeholeCanPost\(Boolean\(payload\.canPost\)\)/)
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
  assert.match(source, /!canSubmitPost && styles\.disabledSendButton/)
})

test('Android treehole interactions disable when the profile cannot interact', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const treeholePane = source.slice(
    source.indexOf('function TreeholePane('),
    source.indexOf('function EmptyTreehole(')
  )
  const treeholePost = source.slice(
    source.indexOf('function TreeholePost('),
    source.indexOf('function displayPostAuthor(')
  )

  assert.match(source, /const \[treeholeCanInteract, setTreeholeCanInteract\] = useState\(false\)/)
  assert.match(source, /Object\.hasOwn\(payload, 'canInteract'\)/)
  assert.match(source, /setTreeholeCanInteract\(Boolean\(payload\.canInteract\)\)/)
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

test('Android room has a People tab for QR and trusted contacts', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /testID='people-tab'/)
  assert.match(source, /label='Home'/)
  assert.match(source, /activeTab === 'people'/)
  assert.match(source, /<PeoplePane/)
  assert.match(source, /My Home QR/)
  assert.match(source, /My Profile QR/)
  assert.match(source, /ContactManager/)
})

test('Android people UI uses trusted friends copy', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /Trusted friends/)
  assert.match(source, /<Text style=\{styles\.trustStatus\}>Trusted<\/Text>/)
  assert.match(source, /\{formatMobileTrustSource\(contact\.source\)\}/)
  assert.match(source, /\{formatMobileTrustTime\(contact\.trustedAt\)\}/)
  assert.match(source, /function formatMobileTrustSource\(source\)/)
  assert.match(source, /function formatMobileTrustTime\(trustedAt\)/)
  assert.equal(source.includes('<Text style={styles.panelTitle}>Contacts</Text>'), false)
})

test('Android people pane surfaces pending message requests', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const messageRequestManager = source.slice(
    source.indexOf('function MessageRequestManager('),
    source.indexOf('function PeopleActions(')
  )

  assert.match(source, /pendingRequestsByProfileId\.values\(\)/)
  assert.match(source, /pendingRequests={pendingMessageRequests}/)
  assert.match(messageRequestManager, /Message requests/)
  assert.match(messageRequestManager, /\{formatMessageRequestTitle\(request\)\}/)
  assert.match(source, /function formatMessageRequestTitle\(request\)/)
  assert.match(source, /return `\$\{name\} wants to start a DM\.`/)
  assert.match(messageRequestManager, /\{formatRequestPreview\(request\.text\)\}/)
  assert.match(source, /function formatRequestPreview\(text\)/)
  assert.match(source, /return text\?\.trim\(\) \|\| 'No message yet'/)
  assert.match(messageRequestManager, /text: request\.text/)
  assert.match(messageRequestManager, /testID='people-message-request-accept-button'/)
  assert.match(messageRequestManager, /testID='people-message-request-ignore-button'/)
  assert.match(messageRequestManager, /Ignore/)
  assert.match(source, /function ignoreIncomingMessageRequest\(request\)/)
  assert.match(source, /ignoreMessageRequest\(contactBook, \{/)
  assert.match(messageRequestManager, /fromProfileId: request\.profileId/)
  assert.match(messageRequestManager, /toProfileId: profileId/)
  assert.match(
    messageRequestManager,
    /senderEncryptionPublicKey: request\.senderEncryptionPublicKey/
  )
})

test('Android restores and saves direct request session messages', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /restoreDirectMessageSession/)
  assert.match(source, /loadDmSessionMessagesFromFileSystem/)
  assert.match(source, /saveDmSessionMessagesToFileSystem/)
  assert.match(source, /async function restoreMobileDirectMessageSession\(/)
  assert.match(source, /await restoreMobileDirectMessageSession\(\)/)
  assert.match(source, /saveMobileDmSessionMessages\(nextSession\.messages\)/)
  assert.match(source, /saveMobileDmSessionMessages\(next\.messages\)/)
})

test('Android people pane keeps visible empty states', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const messageRequestManager = source.slice(
    source.indexOf('function MessageRequestManager('),
    source.indexOf('function PeopleActions(')
  )
  const contactManager = source.slice(
    source.indexOf('function ContactManager('),
    source.indexOf('function TabButton(')
  )

  assert.match(messageRequestManager, /No message requests/)
  assert.match(messageRequestManager, /New requests from friends will appear here\./)
  assert.equal(messageRequestManager.includes('return null'), false)
  assert.match(contactManager, /No trusted friends yet/)
  assert.match(contactManager, /Trust a friend to unlock home access and direct messages\./)
  assert.equal(contactManager.includes('return null'), false)
})

test('Android people empty panels share layout with contextual icons', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const panelEmptyState = source.slice(
    source.indexOf('function PanelEmptyState('),
    source.indexOf('function PeopleActions(')
  )
  const messageRequestManager = source.slice(
    source.indexOf('function MessageRequestManager('),
    source.indexOf('function PeopleActions(')
  )
  const contactManager = source.slice(
    source.indexOf('function ContactManager('),
    source.indexOf('function TabButton(')
  )

  assert.match(panelEmptyState, /function PanelEmptyState\(\{\s*copy,\s*icon: Icon,\s*title\s*\}\)/)
  assert.match(panelEmptyState, /<Icon color=\{theme\.iconMuted\} size=\{24\} \/>/)
  assert.match(messageRequestManager, /<PanelEmptyState[\s\S]*icon=\{MessageCircle\}/)
  assert.match(contactManager, /<PanelEmptyState[\s\S]*icon=\{Users\}/)
})

test('Android people management panels use shared task headers', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const messageRequestManager = source.slice(
    source.indexOf('function MessageRequestManager('),
    source.indexOf('function PeopleActions(')
  )
  const contactManager = source.slice(
    source.indexOf('function ContactManager('),
    source.indexOf('function TabButton(')
  )

  assert.match(
    messageRequestManager,
    /<TaskHeader[\s\S]*eyebrow='Requests'[\s\S]*title='Message requests'/
  )
  assert.match(
    messageRequestManager,
    /description='Accept only the people you want to talk with privately\.'/
  )
  assert.match(contactManager, /<TaskHeader[\s\S]*eyebrow='Trust'[\s\S]*title='Trusted friends'/)
  assert.match(
    contactManager,
    /description='Manage who can enter your home and send direct messages\.'/
  )
  assert.equal(
    messageRequestManager.includes('<Text style={styles.panelTitle}>Message requests</Text>'),
    false
  )
  assert.equal(
    contactManager.includes('<Text style={styles.panelTitle}>Trusted friends</Text>'),
    false
  )
})

test('Android lobby and room reuse the same people action UI', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /function PeopleActions\(/)
  assert.match(source, /function Lobby[\s\S]*<PeopleActions/)
  assert.match(source, /function PeoplePane[\s\S]*<PeopleActions/)
})

test('Android room people pane does not offer joining another home', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const lobby = source.slice(
    source.indexOf('function Lobby('),
    source.indexOf('function ChatRoom(')
  )
  const peoplePane = source.slice(
    source.indexOf('function PeoplePane('),
    source.indexOf('function MessageRequestManager(')
  )
  const peopleActions = source.slice(
    source.indexOf('function PeopleActions('),
    source.indexOf('function DirectPane(')
  )

  assert.match(lobby, /canJoinHome=\{true\}/)
  assert.match(peoplePane, /canJoinHome=\{false\}/)
  assert.match(peopleActions, /const canUseHomeJoin = profileReady && canJoinHome/)
  assert.match(peopleActions, /disabled=\{!canUseHomeJoin\}/)
  assert.match(peopleActions, /disabled=\{!canUseHomeJoin \|\| !homeQrUri\.trim\(\)\}/)
  assert.match(peopleActions, /Leave this home before joining another one\./)
})

test('Android QR scanner keeps the camera preview visible', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /scannerCamera: \{\s*flex: 1,/)
  assert.match(source, /scannerControls: \{/)
  assert.doesNotMatch(source, /scannerCamera: \{\s*\.\.\.StyleSheet\.absoluteFillObject/)
  assert.doesNotMatch(source, /SafeAreaView/)
})

test('Android QR scanner has an in-flow permission denied state', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /const \[scannerPermissionDenied, setScannerPermissionDenied\]/)
  assert.match(source, /permissionDenied={scannerPermissionDenied}/)
  assert.match(source, /testID='qr-scanner-permission'/)
  assert.match(source, /Camera access is off\./)
  assert.match(source, /Enable camera permission to scan QR codes\./)
  assert.match(source, /setScannerPermissionDenied\(true\)/)
  assert.match(source, /setScannerPermissionDenied\(false\)/)
})

test('Android supports Neo Cozy light and Indie Console dark themes', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /useColorScheme/)
  assert.match(source, /const mobileThemes = \{/)
  assert.match(source, /neoCozy/)
  assert.match(source, /indieConsole/)
  assert.match(source, /function createMobileStyles\(theme\)/)
  assert.match(source, /MobileThemeContext\.Provider/)
  assert.match(source, /StatusBar barStyle=\{theme\.statusBar\}/)
  assert.match(source, /backgroundColor: theme\.surface/)
  assert.match(source, /surface: '#171d33'/)
  assert.match(source, /accent: '#ffcf3d'/)
})

test('Android theme styles are passed through context instead of mutable module state', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /const fallbackMobileStyles = createMobileStyles\(mobileThemes\.neoCozy\)/)
  assert.match(
    source,
    /const themedStyles = useMemo\(\(\) => createMobileStyles\(theme\), \[theme\]\)/
  )
  assert.match(source, /MobileThemeContext\.Provider value=\{\{ styles: themedStyles, theme \}\}/)
  assert.match(source, /const \{ styles, theme \} = useMobileTheme\(\)/)
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
  const actions = await readFile(new URL('../src/desktop-qr-actions.js', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  for (const marker of [
    'showLargeQr',
    'hideLargeQr',
    'largeQrCode',
    'setLargeQr',
    'dangerouslySetInnerHTML',
    'width: 520',
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
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const actions = await readFile(new URL('../src/desktop-qr-actions.js', import.meta.url), 'utf8')

  assert.match(app, /aria-labelledby='largeQrTitle'/)
  assert.match(actions, /let largeQrReturnFocus = null/)
  assert.match(app, /actions\.showLargeHomeQr\(\{ returnFocus: event\.currentTarget \}\)/)
  assert.match(app, /actions\.showLargeProfileQr\(\{ returnFocus: event\.currentTarget \}\)/)
  assert.match(
    bindings,
    /showLargeHomeQr: \(\{ returnFocus \}\) =>[\s\S]*qrActions[\s\S]*\.showLargeQr\(\{[\s\S]*title: 'Home QR'/
  )
  assert.match(
    bindings,
    /showLargeProfileQr: \(\{ returnFocus \}\) =>[\s\S]*qrActions[\s\S]*\.showLargeQr\(\{[\s\S]*title: 'Profile QR'/
  )
  assert.match(actions, /largeQrReturnFocus = returnFocus/)
  assert.match(app, /id='largeQrCloseButton'[\s\S]*autoFocus=\{qr\.isOpen\}/)
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
    "KEPOS_SMOKE_DESKTOP: usePearRuntime \\? undefined : '1'",
    'sendAndroidMessageRequest',
    'acceptDesktopMessageRequest',
    'advanced-share-toggle',
    'sendAndroidDmBody',
    'sendDesktopDmBody',
    'restartBothAppsAndRejoin',
    'verifyDmPersistsAfterRestart',
    'revokeDesktopContact',
    'verifyDesktopDmClosedAfterRevoke',
    'MaestroDriverStartupException'
  ]) {
    assert.match(source, new RegExp(marker), `${marker} is missing`)
  }
})
