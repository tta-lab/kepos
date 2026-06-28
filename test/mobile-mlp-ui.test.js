import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readMobileSource() {
  return await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
}

test('mobile tabs surface pending direct and people work without changing tab layout', async () => {
  const source = await readMobileSource()

  assert.match(
    source,
    /const tabBadges = \{[\s\S]*direct: dmMessages\.filter[\s\S]*message\.type === 'kepos\.message\.request\.v1' && message\.direction === 'in'[\s\S]*\.length,[\s\S]*people: pendingRequests\.length[\s\S]*\}/
  )
  assert.match(source, /badgeCount=\{tabBadges\.direct\}[\s\S]*testID='dm-tab'/)
  assert.match(source, /badgeCount=\{tabBadges\.people\}[\s\S]*testID='people-tab'/)
  assert.match(source, /function TabButton\(\{ active, badgeCount = 0, icon: Icon, label/)
  assert.match(
    source,
    /<View style=\{styles\.tabBadge\} accessibilityLabel=\{`\$\{label\} pending \$\{badgeCount\}`\}>/
  )
  assert.match(source, /\{badgeCount > 99 \? '99\+' : badgeCount\}/)
  assert.match(source, /tabBadge: \{/)
  assert.match(source, /tabBadgeText: \{/)
})
