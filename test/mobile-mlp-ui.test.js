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

test('mobile request actions use icon-led trust controls', async () => {
  const source = await readMobileSource()
  const importBlock = source.match(/import\s+\{([\s\S]*?)\}\s+from 'lucide-react-native'/)?.[1]
  const messageRequestManager = source.slice(
    source.indexOf('function MessageRequestManager('),
    source.indexOf('function PanelEmptyState(')
  )
  const directBubble = source.slice(
    source.indexOf('function DirectBubble('),
    source.indexOf('function MessageBubble(')
  )

  assert.match(importBlock, /\bCheck\b/)
  assert.match(importBlock, /\bX\b/)
  assert.match(messageRequestManager, /testID='people-message-request-ignore-button'[\s\S]*<X\b/)
  assert.match(
    messageRequestManager,
    /testID='people-message-request-accept-button'[\s\S]*<Check\b/
  )
  assert.match(directBubble, /testID='message-request-ignore-button'[\s\S]*<X\b/)
  assert.match(directBubble, /testID='message-request-accept-button'[\s\S]*<Check\b/)
})

test('mobile direct contact chips and revoke actions expose trust state', async () => {
  const source = await readMobileSource()
  const contactManager = source.slice(
    source.indexOf('function ContactManager('),
    source.indexOf('function TabButton(')
  )
  const directPane = source.slice(
    source.indexOf('function DirectPane('),
    source.indexOf('function ContactManager(')
  )

  assert.match(contactManager, /accessibilityLabel=\{`Revoke \$\{formatMobileTrustedContactName/)
  assert.match(contactManager, /<UserMinus color=\{theme\.danger\} size=\{18\} \/>/)
  assert.match(
    directPane,
    /accessibilityLabel=\{`Direct recipient \$\{formatMobileTrustedContactName/
  )
  assert.match(directPane, /accessibilityRole='button'/)
  assert.match(
    directPane,
    /accessibilityState=\{\{ selected: recipient === contact\.profileId \}\}/
  )
})

test('mobile collapsible controls expose expanded state', async () => {
  const source = await readMobileSource()
  const lobby = source.slice(
    source.indexOf('function Lobby('),
    source.indexOf('function ChatRoom(')
  )
  const quickStart = source.slice(
    source.indexOf('function QuickStartPanel('),
    source.indexOf('function PeoplePane(')
  )
  const room = source.slice(
    source.indexOf('function ChatRoom('),
    source.indexOf('function TaskHeader(')
  )
  const peopleActions = source.slice(
    source.indexOf('function PeopleActions('),
    source.indexOf('function DirectPane(')
  )
  const directPane = source.slice(
    source.indexOf('function DirectPane('),
    source.indexOf('function ContactManager(')
  )

  assert.match(
    lobby,
    /accessibilityState=\{\{ expanded: showAdvancedJoin \}\}[\s\S]*testID='advanced-join-toggle'/
  )
  assert.match(
    lobby,
    /accessibilityState=\{\{ expanded: showPeopleSetup \}\}[\s\S]*testID='people-setup-toggle'/
  )
  assert.match(quickStart, /accessibilityState=\{\{ expanded: showQuickHomeQr \}\}/)
  assert.match(room, /accessibilityState=\{\{ expanded: showRoomAdvanced \}\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showHomeQr \}\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showProfileQr \}\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showAdvancedShare \}\}/)
  assert.match(
    directPane,
    /accessibilityState=\{\{ expanded: showAdvancedDmRecipient \}\}[\s\S]*testID='advanced-dm-recipient-toggle'/
  )
})
