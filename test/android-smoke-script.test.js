import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('android smoke is wired through Maestro', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(packageJson.scripts['smoke:android'], 'node scripts/smoke-android.mjs')

  const script = await readFile(new URL('../scripts/smoke-android.mjs', import.meta.url), 'utf8')
  assert.match(script, /maestro/)
  assert.match(script, /\.maestro\/android-smoke\.yaml/)

  const flow = await readFile(new URL('../.maestro/android-smoke.yaml', import.meta.url), 'utf8')
  assert.match(flow, /appId: io\.guion\.kepos/)
  assert.match(flow, /id: ['"]create-home-button['"]/)
  assert.match(flow, /id: ['"]room-home-address['"]/)
})

test('mobile exposes stable ids for Android smoke', async () => {
  const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /testID='create-home-button'/)
  assert.match(source, /testID='home-profile-uri'/)
  assert.match(source, /testID='room-home-address'/)
  assert.match(source, /testID='chat-tab'/)
  assert.match(source, /testID='treehole-tab'/)
})
