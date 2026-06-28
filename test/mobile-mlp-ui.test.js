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
  const requestActionButton = source.slice(
    source.indexOf('function MobileRequestActionButton('),
    source.indexOf('function QuickStartPanel(')
  )
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
  assert.match(
    messageRequestManager,
    /<MobileRequestActionButton[\s\S]*testID='people-message-request-ignore-button'[\s\S]*variant='ignore'/
  )
  assert.match(
    messageRequestManager,
    /<MobileRequestActionButton[\s\S]*testID='people-message-request-accept-button'[\s\S]*variant='accept'/
  )
  assert.match(
    directBubble,
    /<MobileRequestActionButton[\s\S]*testID='message-request-ignore-button'[\s\S]*variant='ignore'/
  )
  assert.match(
    directBubble,
    /<MobileRequestActionButton[\s\S]*testID='message-request-accept-button'[\s\S]*variant='accept'/
  )
  assert.match(requestActionButton, /const Icon = isAccept \? Check : X/)
  assert.match(requestActionButton, /const label = isAccept \? 'Accept' : 'Ignore'/)
  assert.match(
    requestActionButton,
    /const accessibilityLabel = isAccept \? 'Accept message request' : 'Ignore message request'/
  )
  assert.match(requestActionButton, /accessibilityLabel=\{accessibilityLabel\}/)
  assert.match(requestActionButton, /accessibilityRole='button'/)
  assert.match(requestActionButton, /accessibilityState=\{\{ disabled \}\}/)
  assert.match(requestActionButton, /disabled && styles\.disabledButton/)
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
  const contactChip = source.slice(
    source.indexOf('function MobileContactChip('),
    source.indexOf('function QuickStartPanel(')
  )

  assert.match(
    contactManager,
    /<MobileSmallActionButton[\s\S]*accessibilityLabel=\{`Revoke \$\{formatMobileTrustedContactName/
  )
  assert.match(contactManager, /icon=\{UserMinus\}/)
  assert.match(contactManager, /label='Revoke'/)
  assert.match(contactManager, /variant='danger'/)
  assert.match(contactChip, /function MobileContactChip\(\{ contact, onPress, selected \}\)/)
  assert.match(contactChip, /const label = formatMobileTrustedContactName\(contact\)/)
  assert.match(contactChip, /accessibilityLabel=\{`Direct recipient \$\{label\}`\}/)
  assert.match(contactChip, /accessibilityRole='button'/)
  assert.match(contactChip, /accessibilityState=\{\{ selected \}\}/)
  assert.match(directPane, /<MobileContactChip[\s\S]*contact=\{contact\}/)
  assert.match(directPane, /selected=\{recipient === contact\.profileId\}/)
})

test('mobile small trust and treehole actions share one icon button component', async () => {
  const source = await readMobileSource()
  const contactManager = source.slice(
    source.indexOf('function ContactManager('),
    source.indexOf('function TabButton(')
  )
  const treeholePost = source.slice(
    source.indexOf('function TreeholePost('),
    source.indexOf('function EmptyMessages(')
  )
  const smallActionButton = source.slice(
    source.indexOf('function MobileSmallActionButton('),
    source.indexOf('function QuickStartPanel(')
  )

  assert.match(smallActionButton, /function MobileSmallActionButton\(/)
  assert.match(smallActionButton, /const isDanger = variant === 'danger'/)
  assert.match(smallActionButton, /accessibilityRole='button'/)
  assert.match(smallActionButton, /accessibilityState=\{\{ disabled \}\}/)
  assert.match(smallActionButton, /isDanger \? styles\.revokeButton : styles\.smallActionButton/)
  assert.match(smallActionButton, /disabled && styles\.disabledSmallActionButton/)
  assert.match(contactManager, /<MobileSmallActionButton[\s\S]*variant='danger'/)
  assert.match(treeholePost, /<MobileSmallActionButton[\s\S]*icon=\{Heart\}/)
  assert.match(treeholePost, /<MobileSmallActionButton[\s\S]*label='Like'/)
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
  assert.match(room, /expanded=\{showRoomAdvanced\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showHomeQr \}\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showProfileQr \}\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showAdvancedShare \}\}/)
  assert.match(
    directPane,
    /expanded=\{showAdvancedDmRecipient\}[\s\S]*testID='advanced-dm-recipient-toggle'/
  )
})

test('mobile room and direct advanced toggles share one component', async () => {
  const source = await readMobileSource()
  const room = source.slice(
    source.indexOf('function ChatRoom('),
    source.indexOf('function TaskHeader(')
  )
  const directPane = source.slice(
    source.indexOf('function DirectPane('),
    source.indexOf('function ContactManager(')
  )
  const advancedToggle = source.slice(
    source.indexOf('function MobileAdvancedToggle('),
    source.indexOf('function QuickStartPanel(')
  )

  assert.match(advancedToggle, /function MobileAdvancedToggle\(/)
  assert.match(advancedToggle, /accessibilityRole='button'/)
  assert.match(advancedToggle, /accessibilityState=\{\{ expanded \}\}/)
  assert.match(advancedToggle, /variant === 'compact'/)
  assert.match(advancedToggle, /styles\.directAdvancedToggle : styles\.roomAdvancedButton/)
  assert.match(room, /<MobileAdvancedToggle[\s\S]*testID='room-advanced-toggle'/)
  assert.match(directPane, /<MobileAdvancedToggle[\s\S]*variant='compact'/)
})

test('mobile top-bar icon controls share one icon button component', async () => {
  const source = await readMobileSource()
  const chatRoom = source.slice(
    source.indexOf('function ChatRoom('),
    source.indexOf('function TaskHeader(')
  )
  const iconButton = source.slice(
    source.indexOf('function MobileIconButton('),
    source.indexOf('function MobileSendButton(')
  )

  assert.match(
    iconButton,
    /function MobileIconButton\(\{ accessibilityLabel, icon: Icon, onPress, testID \}\)/
  )
  assert.match(iconButton, /accessibilityLabel=\{accessibilityLabel\}/)
  assert.match(iconButton, /accessibilityRole='button'/)
  assert.match(iconButton, /style=\{styles\.iconButton\}/)
  assert.match(iconButton, /<Icon color=\{theme\.accentStrong\} size=\{18\} \/>/)
  assert.match(chatRoom, /<MobileIconButton[\s\S]*accessibilityLabel='Leave home'/)
  assert.match(chatRoom, /<MobileIconButton[\s\S]*icon=\{LogOut\}/)
  assert.match(chatRoom, /<MobileIconButton[\s\S]*testID='leave-home-button'/)
})

test('mobile QR scanner cancel uses a focused scanner action component', async () => {
  const source = await readMobileSource()
  const qrScanner = source.slice(
    source.indexOf('function QrScanner('),
    source.indexOf('function Lobby(')
  )
  const scannerCancelButton = source.slice(
    source.indexOf('function MobileScannerCancelButton('),
    source.indexOf('function MobileSendButton(')
  )

  assert.match(qrScanner, /<MobileScannerCancelButton onPress=\{onCancel\} \/>/)
  assert.match(scannerCancelButton, /function MobileScannerCancelButton\(\{ onPress \}\)/)
  assert.match(scannerCancelButton, /accessibilityLabel='Cancel QR scan'/)
  assert.match(scannerCancelButton, /accessibilityRole='button'/)
  assert.match(scannerCancelButton, /style=\{styles\.scannerCancel\}/)
  assert.match(scannerCancelButton, /testID='qr-scanner-cancel'/)
  assert.match(scannerCancelButton, /<Text style=\{styles\.scannerCancelText\}>Cancel<\/Text>/)
})

test('mobile setup actions share one icon button component', async () => {
  const source = await readMobileSource()
  const lobby = source.slice(
    source.indexOf('function Lobby('),
    source.indexOf('function ChatRoom(')
  )
  const quickStart = source.slice(
    source.indexOf('function QuickStartPanel('),
    source.indexOf('function PeoplePane(')
  )
  const peopleActions = source.slice(
    source.indexOf('function PeopleActions('),
    source.indexOf('function DirectPane(')
  )
  const actionButton = source.slice(
    source.indexOf('function MobileActionButton('),
    source.indexOf('function QuickStartPanel(')
  )

  assert.match(actionButton, /function MobileActionButton\(/)
  assert.match(actionButton, /const isPrimary = variant === 'primary'/)
  assert.match(
    actionButton,
    /const buttonAccessibilityState = \{ \.\.\.accessibilityState, disabled \}/
  )
  assert.match(actionButton, /accessibilityRole='button'/)
  assert.match(actionButton, /accessibilityState=\{buttonAccessibilityState\}/)
  assert.match(actionButton, /disabled && styles\.disabledButton/)
  assert.match(actionButton, /icon: Icon/)
  assert.match(lobby, /<MobileActionButton[\s\S]*testID='advanced-join-toggle'/)
  assert.match(lobby, /<MobileActionButton[\s\S]*testID='manual-home-join-button'/)
  assert.match(lobby, /<MobileActionButton[\s\S]*testID='people-setup-toggle'/)
  assert.match(quickStart, /<MobileActionButton[\s\S]*variant='primary'/)
  assert.match(quickStart, /<MobileActionButton[\s\S]*testID='quick-scan-home-qr-button'/)
  assert.match(peopleActions, /<MobileActionButton[\s\S]*testID='scan-profile-qr-button'/)
  assert.match(peopleActions, /<MobileActionButton[\s\S]*testID='advanced-share-toggle'/)
})

test('mobile composers share one send button component', async () => {
  const source = await readMobileSource()
  const directPane = source.slice(
    source.indexOf('function DirectPane('),
    source.indexOf('function ContactManager(')
  )
  const chatPane = source.slice(
    source.indexOf('function ChatPane('),
    source.indexOf('function TreeholePane(')
  )
  const treeholePane = source.slice(
    source.indexOf('function TreeholePane('),
    source.indexOf('function EmptyState(')
  )
  const treeholePost = source.slice(
    source.indexOf('function TreeholePost('),
    source.indexOf('function EmptyMessages(')
  )
  const sendButton = source.slice(
    source.indexOf('function MobileSendButton('),
    source.indexOf('function QuickStartPanel(')
  )

  assert.match(sendButton, /function MobileSendButton\(/)
  assert.match(sendButton, /accessibilityRole='button'/)
  assert.match(sendButton, /accessibilityState=\{\{ disabled \}\}/)
  assert.match(sendButton, /isSmall \? styles\.smallSendButton : styles\.sendButton/)
  assert.match(sendButton, /disabled && styles\.disabledSendButton/)
  assert.match(directPane, /<MobileSendButton[\s\S]*testID='dm-send-button'/)
  assert.match(chatPane, /<MobileSendButton[\s\S]*testID='chat-send-button'/)
  assert.match(treeholePane, /<MobileSendButton[\s\S]*testID='treehole-post-button'/)
  assert.match(treeholePost, /<MobileSendButton[\s\S]*size='small'/)
})

test('mobile product notices are announced as polite status updates', async () => {
  const source = await readMobileSource()
  const header = source.slice(
    source.indexOf('function Header('),
    source.indexOf('function QrCard(')
  )

  assert.match(header, /accessibilityLabel='Current status'/)
  assert.match(header, /accessibilityLiveRegion='polite'/)
  assert.match(header, /testID='app-notice'/)
})
