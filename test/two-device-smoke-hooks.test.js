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
