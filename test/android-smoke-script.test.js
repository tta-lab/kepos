import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readMobileSmokeUiSource() {
  const files = await Promise.all(
    [
      '../mobile/App.tsx',
      '../mobile/action-components.tsx',
      '../mobile/chrome-components.tsx',
      '../mobile/lobby-components.tsx',
      '../mobile/people-components.tsx',
      '../mobile/profile-components.tsx',
      '../mobile/qr-components.tsx',
      '../mobile/room-components.tsx',
      '../mobile/setup-components.tsx',
      '../mobile/tab-components.tsx',
      '../mobile/treehole-components.tsx'
    ].map((path) => readFile(new URL(path, import.meta.url), 'utf8'))
  )

  return files.join('\n')
}

test('android smoke is wired through Maestro', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(packageJson.scripts['smoke:android'], 'node scripts/smoke-android.mjs')

  const script = await readFile(new URL('../scripts/smoke-android.mjs', import.meta.url), 'utf8')
  assert.match(script, /maestro/)
  assert.match(script, /\.maestro\/android-smoke\.yaml/)
  assert.match(script, /grantCameraPermission/)
  assert.match(script, /prepareDeviceUi/)
  assert.match(script, /android\.permission\.CAMERA/)
  assert.doesNotMatch(script, /pm', 'clear', 'io\.guion\.kepos/)
  assert.match(script, /KEYCODE_WAKEUP/)
  assert.match(script, /cmd', 'statusbar', 'collapse/)
  assert.match(script, /reverse', 'tcp:8081', 'tcp:8081/)
  assert.match(script, /127\.0\.0\.1:8081\/status/)
  assert.match(script, /ensureMetroServer/)

  const flow = await readFile(new URL('../.maestro/android-smoke.yaml', import.meta.url), 'utf8')
  assert.match(flow, /appId: io\.guion\.kepos/)
  assert.match(
    flow,
    /runFlow:[\s\S]*visible:[\s\S]*id: ['"]home-title['"][\s\S]*id: ['"]leave-home-button['"]/
  )
  assert.match(
    flow,
    /extendedWaitUntil:\n\s+visible:\n\s+id: ['"]create-home-button['"][\s\S]*timeout: 60000/
  )
  assert.match(flow, /id: ['"]create-home-button['"]/)
  assert.match(flow, /id: ['"]home-title['"]/)
  assert.match(flow, /id: ['"]people-tab['"]/)
  assert.match(flow, /id: ['"]scan-home-qr-button['"]/)
  assert.match(flow, /id: ['"]scan-profile-qr-button['"]/)
  assert.match(flow, /id: ['"]qr-scanner-overlay['"]/)
  assert.match(flow, /id: ['"]qr-scanner-cancel['"]/)
  assert.match(flow, /No posts yet/)
  assert.match(flow, /id: ['"]treehole-post-input['"]/)
  assert.match(flow, /android smoke treehole post/)
  assert.match(flow, /hideKeyboard/)
  assert.match(flow, /id: ['"]treehole-post-button['"]/)
  assert.match(flow, /stopApp/)
  assert.match(flow, /launchApp/)
  assert.match(
    flow,
    /stopApp[\s\S]*launchApp[\s\S]*id: ['"]create-home-button['"][\s\S]*id: ['"]home-title['"][\s\S]*id: ['"]treehole-tab['"][\s\S]*android smoke treehole post/
  )
})

test('mobile exposes stable ids for Android smoke', async () => {
  const source = await readMobileSmokeUiSource()

  assert.match(source, /testID='create-home-button'/)
  assert.match(source, /testID='home-profile-uri'/)
  assert.match(source, /testID='quick-show-my-qr-button'/)
  assert.doesNotMatch(source, /testID='quick-open-contacts-button'/)
  assert.doesNotMatch(source, /testID='quick-scan-profile-qr-button'/)
  assert.doesNotMatch(source, /testID='people-setup-toggle'/)
  assert.match(source, /testID='scan-home-qr-button'/)
  assert.match(source, /testID='scan-profile-qr-button'/)
  assert.match(source, /testID='qr-scanner-overlay'/)
  assert.match(source, /testID='qr-scanner-camera'/)
  assert.match(source, /testID='qr-scanner-cancel'/)
  assert.match(source, /testID=\{title === 'Home' \? 'home-title' : 'lobby-title'\}/)
  assert.match(source, /testID='leave-home-button'/)
  assert.match(source, /testID='room-home-address'/)
  assert.match(source, /testID='chat-tab'/)
  assert.match(source, /testID='dm-tab'/)
  assert.match(source, /testID='people-tab'/)
  assert.match(source, /testID='treehole-tab'/)
  assert.match(source, /testID='treehole-post-input'/)
  assert.match(source, /testID='treehole-post-button'/)
})
