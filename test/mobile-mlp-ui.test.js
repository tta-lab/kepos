import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readMobileSource() {
  return await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
}

async function readMobileProductCopySource() {
  return await readFile(new URL('../src/mobile-product-copy.js', import.meta.url), 'utf8')
}

async function readMobileRoomViewModelSource() {
  return await readFile(new URL('../src/mobile-room-view-model.js', import.meta.url), 'utf8')
}

test('mobile tabs surface pending direct and people work without changing tab layout', async () => {
  const source = await readMobileSource()
  const copy = await readMobileProductCopySource()
  const viewModel = await readMobileRoomViewModelSource()

  assert.match(source, /getMobileTabBadges\(\{ dmMessages, pendingRequests \}\)/)
  assert.match(
    viewModel,
    /function getMobileTabBadges\(\{ dmMessages = \[\], pendingRequests = \[\] \}\)/
  )
  assert.match(viewModel, /message\?\.type === 'kepos\.message\.request\.v1'/)
  assert.match(viewModel, /message\?\.direction === 'in'/)
  assert.match(viewModel, /people: pendingRequests\.length/)
  assert.match(source, /badgeCount=\{tabBadges\.direct\}[\s\S]*testID='dm-tab'/)
  assert.match(source, /badgeCount=\{tabBadges\.people\}[\s\S]*testID='people-tab'/)
  assert.match(source, /function TabButton\(\{ active, badgeCount = 0, icon: Icon, label/)
  assert.match(source, /accessibilityLabel=\{getMobileTabButtonLabel\(label, badgeCount\)\}/)
  assert.match(copy, /function getMobileTabButtonLabel\(label, badgeCount\) \{/)
  assert.match(copy, /return `\$\{label\}, \$\{badgeCount\} pending`/)
  assert.match(
    source,
    /<View style=\{styles\.tabBadge\} accessibilityLabel=\{`\$\{label\} pending \$\{badgeCount\}`\}>/
  )
  assert.match(source, /\{formatPendingBadgeCount\(badgeCount\)\}/)
  assert.match(copy, /function formatPendingBadgeCount\(badgeCount\) \{/)
  assert.match(copy, /return badgeCount > 99 \? '99\+' : String\(badgeCount\)/)
  assert.match(source, /tabBadge: \{/)
  assert.match(source, /tabBadgeText: \{/)
})
