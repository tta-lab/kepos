import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

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
    'Add trusted friend'
  ]) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.equal(source.includes('Home URI'), false)
  assert.equal(source.includes('Profile trust'), false)
  assert.equal(source.includes('Join Home URI'), false)
  assert.equal(source.includes('Trust Profile'), false)
})

test('Android lobby starts with compact product choices', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /function QuickStartPanel\(/)
  assert.match(source, /Start here/)
  assert.match(source, /Create my home/)
  assert.match(source, /Scan Home QR/)
  assert.match(source, /Scan Profile QR/)
  assert.equal(source.indexOf('<QuickStartPanel') < source.indexOf('<PeopleActions'), true)
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
  assert.equal(
    source.indexOf("testID='home-address-uri'") > source.indexOf('showAdvancedShare ? ('),
    true
  )
  assert.equal(
    source.indexOf("testID='home-profile-uri'") > source.indexOf('showAdvancedShare ? ('),
    true
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
  const desktop = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(mobile, /wants to start a DM/)
  assert.match(desktop, /wants to start a DM/)
  assert.equal(mobile.includes('request ${outgoing ?'), false)
  assert.equal(desktop.includes('message request ${message.direction'), false)
})

test('normal error notices avoid raw exception text', async () => {
  const mobile = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
  const desktop = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.equal(/setNotice\(`[^`]*\$\{error\.message\}/.test(mobile), false)
  assert.equal(/setNotice\(payload\.message/.test(mobile), false)
  assert.equal(/notice: error\.message/.test(desktop), false)
  assert.match(mobile, /Could not join this home\./)
  assert.match(mobile, /Could not read this Home QR\./)
  assert.match(desktop, /Something went wrong\./)
})

test('Android header shows product home status instead of raw peer count', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /function getMobileHomeStatus\(/)
  assert.match(source, /getMobileHomeStatus\(\{ online: peerCount, session \}\)/)
  assert.match(source, /Connected/)
  assert.match(source, /Looking for peers/)
  assert.match(source, /Offline/)
  assert.equal(source.includes('{online} peer'), false)
})

test('Android room bar keeps raw home key behind advanced details', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /const \[showRoomAdvanced, setShowRoomAdvanced\] = useState\(false\)/)
  assert.match(source, /Live session/)
  assert.match(source, /showRoomAdvanced \? \(/)
  assert.equal(
    source.indexOf("testID='room-home-address'") > source.indexOf('showRoomAdvanced ? ('),
    true
  )
})

test('Android room panes label live and durable surfaces', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  for (const text of ['Live home chat', 'Direct messages', 'Durable treehole']) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.match(source, /paneEyebrow:/)
  assert.match(source, /paneTitle:/)
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
  assert.equal(source.includes('<Text style={styles.panelTitle}>Contacts</Text>'), false)
})

test('Android lobby and room reuse the same people action UI', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /function PeopleActions\(/)
  assert.match(source, /function Lobby[\s\S]*<PeopleActions/)
  assert.match(source, /function PeoplePane[\s\S]*<PeopleActions/)
})

test('Android QR scanner keeps the camera preview visible', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /scannerCamera: \{\s*flex: 1,/)
  assert.match(source, /scannerControls: \{/)
  assert.doesNotMatch(source, /scannerCamera: \{\s*\.\.\.StyleSheet\.absoluteFillObject/)
  assert.doesNotMatch(source, /SafeAreaView/)
})

test('desktop UI exposes stable hooks for two-device smoke', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

  for (const id of [
    'homeQrOutput',
    'profileQrOutput',
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
})

test('desktop large QR dialog renders scan-sized QR codes', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  for (const marker of [
    'showLargeQr',
    'hideLargeQr',
    'largeQrCode',
    'width: 520',
    'largeQrDialog.hidden'
  ]) {
    assert.match(`${source}\n${styles}`, new RegExp(marker), `${marker} is missing`)
  }
})

test('debug two-device smoke covers live DM exchange and restart persistence', async () => {
  const source = await readFile(
    new URL('../scripts/smoke-two-device-debug.mjs', import.meta.url),
    'utf8'
  )

  for (const marker of [
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
