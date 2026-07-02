import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readMobileSource() {
  return await readFile(new URL('../mobile/App.tsx', import.meta.url), 'utf8')
}

async function readMobileActionComponentsSource() {
  return await readFile(new URL('../mobile/action-components.tsx', import.meta.url), 'utf8')
}

async function readMobileQrComponentsSource() {
  return await readFile(new URL('../mobile/qr-components.tsx', import.meta.url), 'utf8')
}

async function readMobilePanelComponentsSource() {
  return await readFile(new URL('../mobile/panel-components.tsx', import.meta.url), 'utf8')
}

async function readMobileProfileComponentsSource() {
  return await readFile(new URL('../mobile/profile-components.tsx', import.meta.url), 'utf8')
}

async function readMobilePeopleComponentsSource() {
  return await readFile(new URL('../mobile/people-components.tsx', import.meta.url), 'utf8')
}

async function readMobileMessageComponentsSource() {
  return await readFile(new URL('../mobile/message-components.tsx', import.meta.url), 'utf8')
}

async function readMobileDirectComponentsSource() {
  return await readFile(new URL('../mobile/direct-components.tsx', import.meta.url), 'utf8')
}

async function readMobileLobbyComponentsSource() {
  return await readFile(new URL('../mobile/lobby-components.tsx', import.meta.url), 'utf8')
}

async function readMobileRoomComponentsSource() {
  return await readFile(new URL('../mobile/room-components.tsx', import.meta.url), 'utf8')
}

async function readMobileThreadComponentsSource() {
  return await readFile(new URL('../mobile/thread-components.tsx', import.meta.url), 'utf8')
}

async function readMobileFormComponentsSource() {
  return await readFile(new URL('../mobile/form-components.tsx', import.meta.url), 'utf8')
}

async function readMobileEmptyComponentsSource() {
  return await readFile(new URL('../mobile/empty-components.tsx', import.meta.url), 'utf8')
}

async function readMobileTabComponentsSource() {
  return await readFile(new URL('../mobile/tab-components.tsx', import.meta.url), 'utf8')
}

async function readMobileTreeholeComponentsSource() {
  return await readFile(new URL('../mobile/treehole-components.tsx', import.meta.url), 'utf8')
}

async function readMobileSetupComponentsSource() {
  return await readFile(new URL('../mobile/setup-components.tsx', import.meta.url), 'utf8')
}

async function readMobileStylesSource() {
  return await readFile(new URL('../mobile/styles.ts', import.meta.url), 'utf8')
}

async function readMobileChromeComponentsSource() {
  return await readFile(new URL('../mobile/chrome-components.tsx', import.meta.url), 'utf8')
}

async function readMobileRequestComponentsSource() {
  return await readFile(new URL('../mobile/request-components.tsx', import.meta.url), 'utf8')
}

async function readMobileAvatarViewModelSource() {
  return await readFile(new URL('../src/mobile-avatar-view-model.ts', import.meta.url), 'utf8')
}

async function readMobileProductCopySource() {
  return await readFile(new URL('../src/mobile-product-copy.ts', import.meta.url), 'utf8')
}

async function readProductSurfacesSource() {
  return await readFile(new URL('../src/product-surfaces.ts', import.meta.url), 'utf8')
}

async function readMobileProfileBootstrapSource() {
  return await readFile(new URL('../src/mobile-profile-bootstrap.ts', import.meta.url), 'utf8')
}

async function readMobileRoomViewModelSource() {
  return await readFile(new URL('../src/mobile-room-view-model.ts', import.meta.url), 'utf8')
}

test('mobile tabs surface pending direct and people work without changing tab layout', async () => {
  const source = await readMobileSource()
  const copy = await readMobileProductCopySource()
  const roomComponents = await readMobileRoomComponentsSource()
  const mobileStyles = await readMobileStylesSource()
  const tabComponents = await readMobileTabComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const viewModel = await readMobileRoomViewModelSource()

  assert.doesNotMatch(source, /@ts-nocheck/)
  assert.match(source, /import \{ createMobileStyles, type MobileStyles \} from '\.\/styles\.ts'/)
  assert.doesNotMatch(source, /function createMobileStyles\(/)
  assert.doesNotMatch(source, /type MobileStyles = ReturnType<typeof createMobileStyles>/)
  assert.match(mobileStyles, /export function createMobileStyles\(/)
  assert.match(mobileStyles, /export type MobileStyles = ReturnType<typeof createMobileStyles>/)
  assert.match(peopleComponents, /import type \{ MobileStyles \} from '\.\/styles\.ts'/)
  assert.doesNotMatch(peopleComponents, /type MobileStyles = any/)
  assert.match(mobileStyles, /StyleSheet\.create\(/)
  assert.match(mobileStyles, /Platform\.OS === 'android'/)
  assert.match(mobileStyles, /StatusBar\.currentHeight/)
  assert.match(source, /import \{ ChatRoom \} from '\.\/room-components\.tsx'/)
  assert.doesNotMatch(source, /function ChatRoom\(/)
  assert.match(roomComponents, /export type ChatRoomProps = \{/)
  assert.match(
    roomComponents,
    /getMobileTabBadges\(\{ dmMessages, outgoingRequests, pendingRequests \}\)/
  )
  assert.match(
    viewModel,
    /function getMobileTabBadges\(\{[\s\S]*dmMessages = \[\],[\s\S]*outgoingRequests = \[\],[\s\S]*pendingRequests = \[\][\s\S]*\}: MobileTabBadgesInput\)/
  )
  assert.match(viewModel, /message\?\.type === 'kepos\.message\.request\.v1'/)
  assert.match(viewModel, /message\?\.direction === 'in'/)
  assert.match(viewModel, /people: pendingRequests\.length \+ outgoingRequests\.length/)
  assert.match(roomComponents, /productSurfaceTabs\.map\(\(surface\) =>/)
  assert.match(
    roomComponents,
    /badgeCount=\{getMobileSurfaceBadgeCount\(surface\.id, tabBadges\)\}/
  )
  assert.match(roomComponents, /if \(surfaceId === 'dm'\) return tabBadges\.direct/)
  assert.match(roomComponents, /if \(surfaceId === 'people'\) return tabBadges\.people/)
  assert.match(roomComponents, /people: 'people-tab'/)
  assert.match(roomComponents, /import \{ TabButton,[\s\S]*\} from '\.\/tab-components\.tsx'/)
  assert.doesNotMatch(source, /function TabButton\(/)
  assert.match(tabComponents, /export type TabButtonProps = \{/)
  assert.match(tabComponents, /function TabButton\(\{[\s\S]*badgeCount = 0,[\s\S]*icon: Icon/)
  assert.match(tabComponents, /accessibilityLabel=\{getMobileTabButtonLabel\(label, badgeCount\)\}/)
  assert.match(copy, /function getMobileTabButtonLabel\(label: string, badgeCount: number\) \{/)
  assert.match(copy, /return `\$\{label\}, \$\{badgeCount\} pending`/)
  assert.match(
    tabComponents,
    /<View style=\{styles\.tabBadge\} accessibilityLabel=\{`\$\{label\} pending \$\{badgeCount\}`\}>/
  )
  assert.match(tabComponents, /\{formatPendingBadgeCount\(badgeCount\)\}/)
  assert.match(copy, /function formatPendingBadgeCount\(badgeCount: number\) \{/)
  assert.match(copy, /return badgeCount > 99 \? '99\+' : String\(badgeCount\)/)
  assert.match(mobileStyles, /tabBadge: \{/)
  assert.match(mobileStyles, /tabBadgeText: \{/)
  assert.match(roomComponents, /productSurfaceTabs\.map\(\(surface\) =>/)
  assert.match(
    roomComponents,
    /const MOBILE_TAB_ICONS: Record<ProductSurfaceId, TabButtonProps\['icon'\]> = \{/
  )
  assert.match(roomComponents, /chat: House/)
  assert.match(roomComponents, /dm: Send/)
  assert.match(roomComponents, /people: Users/)
  assert.match(roomComponents, /treehole: Sprout/)
  assert.match(roomComponents, /label=\{surface\.label\}/)
  assert.match(roomComponents, /iconColor=\{theme\.iconMuted\}/)
  assert.match(roomComponents, /selectedIconColor=\{theme\.surface\}/)
  assert.match(roomComponents, /styles=\{styles\}/)
  assert.match(roomComponents, /productSurfaceTabs\.map\(\(surface\) =>/)
  assert.match(roomComponents, /MOBILE_TAB_ICONS\[surface\.id\]/)
  assert.match(roomComponents, /label=\{surface\.label\}/)
  assert.match(roomComponents, /testID=\{MOBILE_TAB_TEST_IDS\[surface\.id\]\}/)
  assert.doesNotMatch(source, /\bDoorOpen,/)
})

test('mobile chrome is compact enough for the first Android screen', async () => {
  const mobileStyles = await readMobileStylesSource()

  assert.match(
    mobileStyles,
    /header: \{[\s\S]*paddingHorizontal: 16,[\s\S]*paddingTop: 10,[\s\S]*paddingBottom: 10/
  )
  assert.match(mobileStyles, /mark: \{[\s\S]*height: 34,[\s\S]*width: 34/)
  assert.match(mobileStyles, /title: \{[\s\S]*fontSize: 24/)
  assert.match(mobileStyles, /mobileStatusStrip: \{[\s\S]*marginTop: 8/)
  assert.match(mobileStyles, /notice: \{[\s\S]*fontSize: 12,[\s\S]*marginTop: 8/)
  assert.match(mobileStyles, /roomBar: \{[\s\S]*paddingHorizontal: 16,[\s\S]*paddingVertical: 8/)
  assert.match(mobileStyles, /roomAdvancedButton: \{[\s\S]*height: 36/)
})

test('mobile startup uses the same four-tab app shell as the active home view', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const lobbyComponents = await readMobileLobbyComponentsSource()
  const productSurfaces = await readProductSurfacesSource()

  assert.doesNotMatch(source, /import \{ Lobby \} from '\.\/lobby-components\.tsx'/)
  assert.doesNotMatch(source, /<Lobby[\s\S]*\/>/)
  assert.match(source, /<ChatRoom[\s\S]*session=\{session\}/)
  assert.match(source, /const \[activeTab, setActiveTab\] = useState\('people'\)/)
  assert.match(source, /setActiveTab\('people'\)/)
  assert.match(source, /setSession\(homeJoin\.session\)[\s\S]*setActiveTab\('chat'\)/)
  assert.match(source, /canJoin=\{profileReady && canJoin\}/)
  assert.match(source, /onCreateRoom=\{createRoom\}/)
  assert.match(source, /onChooseLocalAvatarImage=\{chooseLocalAvatarImage\}/)
  assert.match(source, /onLocalAvatarUriChange=\{updateLocalAvatarUri\}/)
  assert.match(source, /onRoomKeyChange=\{setRoomKey\}/)
  assert.match(source, /showAdvancedJoin=\{showAdvancedJoin\}/)
  assert.match(roomComponents, /import \{ HomeStartupPane/)
  assert.match(roomComponents, /session\?:/)
  assert.match(roomComponents, /!session \? \(/)
  assert.match(roomComponents, /<HomeStartupPane[\s\S]*onCreateRoom=\{onCreateRoom\}/)
  assert.match(roomComponents, /activeTab === 'chat'/)
  assert.match(roomComponents, /productSurfaceTabs\.map\(\(surface\) =>/)
  assert.match(roomComponents, /chat: 'chat-tab'/)
  assert.match(roomComponents, /dm: 'dm-tab'/)
  assert.match(roomComponents, /people: 'people-tab'/)
  assert.match(roomComponents, /treehole: 'treehole-tab'/)
  assert.match(lobbyComponents, /export function HomeStartupPane\(/)
  assert.doesNotMatch(lobbyComponents, /PeopleActions/)
  assert.match(productSurfaces, /label: 'Home'/)
  assert.match(productSurfaces, /label: 'Chat'/)
  assert.match(productSurfaces, /label: 'Contacts'/)
  assert.match(productSurfaces, /label: 'Treehole'/)
})

test('mobile request actions use icon-led trust controls', async () => {
  const source = await readMobileSource()
  const directComponents = await readMobileDirectComponentsSource()
  const messageComponents = await readMobileMessageComponentsSource()
  const requestComponents = await readMobileRequestComponentsSource()
  const actionComponents = await readMobileActionComponentsSource()
  const importBlock = actionComponents.match(
    /import\s+\{([\s\S]*?)\}\s+from 'lucide-react-native'/
  )?.[1]
  const requestActionButton = actionComponents.slice(
    actionComponents.indexOf('function MobileRequestActionButton('),
    actionComponents.length
  )
  const messageRequestManager = requestComponents.slice(
    requestComponents.indexOf('function MessageRequestManager('),
    requestComponents.length
  )
  const directBubble = messageComponents.slice(
    messageComponents.indexOf('function DirectBubble('),
    messageComponents.indexOf('export type MessageBubble')
  )

  assert.match(
    directComponents,
    /import \{[\s\S]*MobileSendButton[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.match(messageComponents, /export function DirectBubble\(/)
  assert.doesNotMatch(source, /function MobileRequestActionButton\(/)
  assert.doesNotMatch(source, /function DirectBubble\(/)
  assert.doesNotMatch(source, /function MessageRequestManager\(/)
  assert.match(actionComponents, /export type MobileRequestActionButtonProps = \{/)
  assert.match(messageComponents, /export type DirectBubbleProps = \{/)
  assert.match(requestComponents, /export type MessageRequestManagerProps = \{/)
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
    /const accessibilityLabel = isAccept \? 'Accept friend request' : 'Ignore friend request'/
  )
  assert.equal(requestActionButton.includes('message request'), false)
  assert.match(requestActionButton, /accessibilityLabel=\{accessibilityLabel\}/)
  assert.match(requestActionButton, /accessibilityRole='button'/)
  assert.match(requestActionButton, /accessibilityState=\{\{ disabled \}\}/)
  assert.match(requestActionButton, /disabled && styles\.disabledButton/)
})

test('mobile direct messages show generated sender avatars', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const directComponents = await readMobileDirectComponentsSource()
  const messageComponents = await readMobileMessageComponentsSource()
  const avatarViewModel = await readMobileAvatarViewModelSource()
  const directBubble = messageComponents.slice(
    messageComponents.indexOf('function DirectBubble('),
    messageComponents.indexOf('export type MessageBubble')
  )

  assert.match(
    roomComponents,
    /import \{ HomeChatPane,[\s\S]*\} from '\.\/message-components\.tsx'/
  )
  assert.match(
    directComponents,
    /import \{[\s\S]*DirectBubble,[\s\S]*\} from '\.\/message-components\.tsx'/
  )
  assert.doesNotMatch(source, /function DirectBubble\(/)
  assert.doesNotMatch(source, /function MessageBubble\(/)
  assert.match(messageComponents, /export type DirectBubbleProps = \{/)
  assert.match(avatarViewModel, /createProfileAvatarViewModel/)
  assert.match(
    directBubble,
    /const avatar = createMobileDirectMessageAvatar\(message, contacts, resolveAvatarMediaUri\)/
  )
  assert.match(directBubble, /formatMobileDirectMessageMeta\(message, contacts\)/)
  assert.match(directBubble, /<MobileProfileAvatar avatar=\{avatar\} styles=\{styles\} \/>/)
  assert.match(directBubble, /styles\.directBubbleRow/)
})

test('mobile home message bubbles are checked TSX components', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const directComponents = await readMobileDirectComponentsSource()
  const messageComponents = await readMobileMessageComponentsSource()
  const homeChatPane = messageComponents.slice(
    messageComponents.indexOf('function HomeChatPane('),
    messageComponents.indexOf('export type DirectBubbleContact')
  )
  const messageBubble = messageComponents.slice(
    messageComponents.indexOf('function MessageBubble(')
  )

  assert.match(
    roomComponents,
    /import \{ HomeChatPane,[\s\S]*\} from '\.\/message-components\.tsx'/
  )
  assert.match(
    directComponents,
    /import \{[\s\S]*DirectBubble,[\s\S]*\} from '\.\/message-components\.tsx'/
  )
  assert.match(
    roomComponents,
    /<HomeChatPane[\s\S]*draft=\{draft\}[\s\S]*messages=\{session\.messages\}[\s\S]*onDraftChange=\{onDraftChange\}[\s\S]*onSend=\{onSend\}/
  )
  assert.doesNotMatch(source, /function ChatPane\(/)
  assert.match(messageComponents, /export type HomeChatPaneProps = \{/)
  assert.match(
    homeChatPane,
    /<PaneLabel eyebrow='live' styles=\{styles\} title='Live home chat' \/>/
  )
  assert.match(
    homeChatPane,
    /renderItem=\{\(\{ item \}\) => <MessageBubble message=\{item\} styles=\{styles\} \/>\}/
  )
  assert.doesNotMatch(source, /function MessageBubble\(/)
  assert.match(messageComponents, /export type MessageBubbleProps = \{/)
  assert.match(messageBubble, /const outgoing = message\.direction === 'out'/)
  assert.match(messageBubble, /formatMobileHomeMessageMeta\(message\)/)
  assert.match(messageBubble, /outgoing \? styles\.outBubble : styles\.inBubble/)
})

test('mobile text fields are checked TSX components', async () => {
  const source = await readMobileSource()
  const formComponents = await readMobileFormComponentsSource()
  const setupComponents = await readMobileSetupComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const field = formComponents.slice(formComponents.indexOf('function Field('))
  const quickStart = setupComponents.slice(
    setupComponents.indexOf('export function QuickStartPanel')
  )
  const peopleActions = peopleComponents.slice(
    peopleComponents.indexOf('function PeopleActions('),
    peopleComponents.indexOf('export type ContactManagerProps')
  )

  assert.match(source, /import \{ Field \} from '\.\/form-components\.tsx'/)
  assert.doesNotMatch(source, /function Field\(/)
  assert.match(formComponents, /export type FieldProps = \{/)
  assert.match(formComponents, /onChangeText\(value: string\): void/)
  assert.match(field, /autoCapitalize='none'/)
  assert.match(field, /autoCorrect=\{false\}/)
  assert.match(field, /testID=\{testID\}/)
  assert.match(
    quickStart,
    /<Field label='Name' onChangeText=\{onNickChange\} styles=\{styles\} value=\{nick\} \/>/
  )
  assert.match(
    peopleActions,
    /<Field[\s\S]*label='Friend name'[\s\S]*onChangeText=\{onTrustAliasChange\}[\s\S]*styles=\{styles\}[\s\S]*testID='trust-profile-alias-input'/
  )
})

test('mobile profile avatars render real image snapshots when available', async () => {
  const source = await readMobileSource()
  const directComponents = await readMobileDirectComponentsSource()
  const profileComponents = await readMobileProfileComponentsSource()
  const avatar = profileComponents.slice(
    profileComponents.indexOf('function MobileProfileAvatar('),
    profileComponents.indexOf('function getMobileAvatarToneStyle(')
  )

  assert.match(
    source,
    /import \{ ContactProfileDetail, MobileProfileAvatar \} from '\.\/profile-components\.tsx'/
  )
  assert.match(directComponents, /ProfileRequestTargetCard,[\s\S]*type MobileContactChipStyles/)
  assert.doesNotMatch(source, /function MobileProfileAvatar\(/)
  assert.match(profileComponents, /import\s+\{[^}]*\bImage\b[^}]*\}\s+from 'react-native'/)
  assert.match(profileComponents, /export type MobileProfileAvatarProps = \{/)
  assert.match(avatar, /avatar\?\.imageUri/)
  assert.match(avatar, /<Image[\s\S]*source=\{\{ uri: avatar\.imageUri \}\}/)
  assert.match(avatar, /<Text style=\{styles\.contactAvatarText\}>/)
})

test('mobile QR card rendering lives in checked TSX component', async () => {
  const source = await readMobileSource()
  const chromeComponents = await readMobileChromeComponentsSource()
  const qrComponents = await readMobileQrComponentsSource()

  assert.doesNotMatch(source, /from 'react-native-qrcode-svg'/)
  assert.match(source, /import \{[\s\S]*QrCard[\s\S]*\} from '\.\/chrome-components\.tsx'/)
  assert.doesNotMatch(source, /function QrCard\(/)
  assert.match(chromeComponents, /import \{ MobileQrCard \} from '\.\/qr-components\.tsx'/)
  assert.match(chromeComponents, /<MobileQrCard[\s\S]*backgroundColor=\{backgroundColor\}/)
  assert.match(chromeComponents, /export type QrCardProps = \{/)
  assert.match(qrComponents, /export type MobileQrCardProps = \{/)
  assert.match(qrComponents, /import QRCode, \{ type QRCodeProps \} from 'react-native-qrcode-svg'/)
  assert.match(qrComponents, /QRCode as unknown as ComponentType<QRCodeProps>/)
  assert.match(qrComponents, /value: string/)
})

test('mobile panel empty state lives in checked TSX component', async () => {
  const source = await readMobileSource()
  const panelComponents = await readMobilePanelComponentsSource()

  assert.match(
    source,
    /import \{ PaneLabel, PanelEmptyState, TaskHeader \} from '\.\/panel-components\.tsx'/
  )
  assert.doesNotMatch(source, /function PanelEmptyState\(/)
  assert.match(panelComponents, /export type PanelEmptyStateProps = \{/)
  assert.match(panelComponents, /copy: string/)
  assert.match(panelComponents, /title: string/)
  assert.match(panelComponents, /icon: ComponentType<PanelEmptyStateIconProps>/)
})

test('mobile primary empty states live in checked TSX components', async () => {
  const source = await readMobileSource()
  const directComponents = await readMobileDirectComponentsSource()
  const emptyComponents = await readMobileEmptyComponentsSource()
  const messageComponents = await readMobileMessageComponentsSource()
  const treeholeComponents = await readMobileTreeholeComponentsSource()
  const homeChatPane = messageComponents.slice(
    messageComponents.indexOf('function HomeChatPane('),
    messageComponents.indexOf('export type DirectBubbleContact')
  )
  const treeholePane = treeholeComponents.slice(
    treeholeComponents.indexOf('function TreeholePane('),
    treeholeComponents.indexOf('export function TreeholePost(')
  )

  assert.match(
    directComponents,
    /import \{[\s\S]*EmptyDirectMessages,[\s\S]*\} from '\.\/empty-components\.tsx'/
  )
  assert.doesNotMatch(source, /function EmptyState\(/)
  assert.doesNotMatch(source, /function EmptyMessages\(/)
  assert.doesNotMatch(source, /function EmptyDirectMessages\(/)
  assert.doesNotMatch(source, /function EmptyTreehole\(/)
  assert.match(emptyComponents, /export type EmptyStateProps = \{/)
  assert.match(emptyComponents, /export function EmptyMessages\(/)
  assert.match(emptyComponents, /export function EmptyDirectMessages\(/)
  assert.match(emptyComponents, /export function EmptyTreehole\(/)
  assert.match(emptyComponents, /getMobileTreeholeEmptyCopy\(status, \{ canPost \}\)/)
  assert.match(emptyComponents, /copy='Send the first line from this phone\.'/)
  assert.match(emptyComponents, /copy='Choose a trusted contact and send the first message\.'/)
  assert.match(
    homeChatPane,
    /ListEmptyComponent=\{<EmptyMessages styles=\{styles\} theme=\{theme\} \/>\}/
  )
  assert.match(
    directComponents,
    /ListEmptyComponent=\{<EmptyDirectMessages styles=\{styles\} theme=\{theme\} \/>\}/
  )
  assert.match(
    treeholePane,
    /ListEmptyComponent=\{[\s\S]*<EmptyTreehole canPost=\{canPost\} status=\{status\} styles=\{styles\} theme=\{theme\} \/>[\s\S]*\}/
  )
})

test('mobile pane labels live in checked TSX panel components', async () => {
  const source = await readMobileSource()
  const panelComponents = await readMobilePanelComponentsSource()

  assert.doesNotMatch(source, /function PaneLabel\(/)
  assert.match(panelComponents, /export type PaneLabelProps = \{/)
  assert.match(panelComponents, /eyebrow: string/)
  assert.match(panelComponents, /title: string/)
  assert.match(panelComponents, /function PaneLabel\(/)
})

test('mobile task headers live in checked TSX panel components', async () => {
  const source = await readMobileSource()
  const panelComponents = await readMobilePanelComponentsSource()

  assert.doesNotMatch(source, /function TaskHeader\(/)
  assert.match(panelComponents, /export type TaskHeaderProps = \{/)
  assert.match(panelComponents, /description\?: string/)
  assert.match(panelComponents, /eyebrow: string/)
  assert.match(panelComponents, /title: string/)
  assert.match(panelComponents, /function TaskHeader\(/)
})

test('mobile Profile QR includes the local profile avatar uri when present', async () => {
  const source = await readMobileSource()
  const profileQr = source.slice(
    source.indexOf('const shareQrPayloads = useMemo('),
    source.indexOf('const profileQrUri = shareQrPayloads')
  )

  assert.match(source, /import \{ createShareQrPayloads \} from '\.\.\/src\/share-qr-service\.ts'/)
  assert.match(profileQr, /createShareQrPayloads\(/)
  assert.match(profileQr, /avatarMedia: localAvatarMedia/)
  assert.match(profileQr, /avatarUri: localAvatarUri/)
  assert.match(profileQr, /homeRoom: homeRoomKey/)
  assert.match(profileQr, /\[homeRoomKey, identity, localAvatarMedia, localAvatarUri, nick\]/)
  assert.match(source, /const profileQrUri = shareQrPayloads \? shareQrPayloads\.primaryUri : ''/)
  assert.match(source, /const myHomeQrUri = shareQrPayloads \? shareQrPayloads\.debugHomeUri : ''/)
})

test('mobile advanced Home QR copy is marked as debug live-room entry', async () => {
  const peopleComponents = await readMobilePeopleComponentsSource()

  assert.match(peopleComponents, /title='Debug Home QR'/)
  assert.match(
    peopleComponents,
    /description='Debug home descriptor for explicit live-room entry; it does not create friendship\.'/
  )
  assert.doesNotMatch(
    peopleComponents,
    /description='Connection details for trusted friends; trust still controls entry\.'/
  )
})

test('mobile local avatar uri can be edited and restored before sharing Profile QR', async () => {
  const source = await readMobileSource()
  const pkg = await readFile(new URL('../package.json', import.meta.url), 'utf8')
  const bootstrap = await readMobileProfileBootstrapSource()
  const setupComponents = await readMobileSetupComponentsSource()
  const lobbyComponents = await readMobileLobbyComponentsSource()
  const quickStart = setupComponents.slice(
    setupComponents.indexOf('export function QuickStartPanel')
  )

  assert.match(pkg, /"expo-image-picker"/)
  assert.match(source, /import \* as ImagePicker from 'expo-image-picker'/)
  assert.match(source, /importMobileProfileAvatarMedia/)
  assert.match(source, /async function chooseLocalAvatarImage\(\)/)
  assert.match(source, /ImagePicker\.launchImageLibraryAsync/)
  assert.match(source, /setLocalAvatarMedia\(avatar\.avatarMedia\)/)
  assert.match(source, /setLocalAvatarUri\(avatar\.avatarUri\)/)
  assert.match(bootstrap, /loadMobileProfileDocument/)
  assert.match(source, /saveMobileProfileDocument/)
  assert.match(source, /loadMobileRuntimeProfile\(/)
  assert.match(
    source,
    /loadDmSessionMessagesFromFileSystem\(\{[\s\S]*ownerProfileId: profile\.profileId/
  )
  assert.match(source, /restoreDirectMessageSession\(\{[\s\S]*localProfileId: profile\.profileId/)
  assert.match(source, /setDmSession\(nextDmSession\)/)
  assert.doesNotMatch(source, /async function loadMobileProfile\(/)
  assert.match(source, /async function updateLocalAvatarUri\(value: string\)/)
  assert.match(source, /setLocalAvatarMedia\(null\)/)
  assert.match(source, /setLocalAvatarUri\(cleanAvatarUri\)/)
  assert.match(source, /saveMobileProfileDocument\(\{[\s\S]*avatarUri: cleanAvatarUri/)
  assert.match(source, /localAvatarUri=\{localAvatarUri\}/)
  assert.match(source, /onChooseLocalAvatarImage=\{chooseLocalAvatarImage\}/)
  assert.match(source, /onLocalAvatarUriChange=\{updateLocalAvatarUri\}/)
  assert.match(source, /import \{ ChatRoom \} from '\.\/room-components\.tsx'/)
  assert.doesNotMatch(source, /function HomeStartupPane\(/)
  assert.match(lobbyComponents, /export type HomeStartupPaneProps = \{/)
  assert.match(lobbyComponents, /<QuickStartPanel[\s\S]*localAvatarUri=\{localAvatarUri\}/)
  assert.match(quickStart, /localAvatarUri/)
  assert.match(quickStart, /onChooseLocalAvatarImage/)
  assert.match(quickStart, /onLocalAvatarUriChange/)
  assert.match(quickStart, /label='Avatar image'/)
  assert.match(quickStart, /label='Choose image'/)
  assert.match(quickStart, /testID='choose-avatar-image-button'/)
  assert.match(quickStart, /value=\{localAvatarUri\}/)
  assert.match(quickStart, /onChangeText=\{onLocalAvatarUriChange\}/)
  assert.match(bootstrap, /const localProfile = await loadMobileProfileDocument\(/)
  assert.match(bootstrap, /avatarMedia: localProfile\.avatarMedia/)
  assert.match(bootstrap, /avatarMedia: profile\.avatarMedia/)
  assert.match(bootstrap, /avatarUri: profile\.avatarUri \|\| ''/)
})

test('mobile Home startup and RPC store avatar media byte controls', async () => {
  const source = await readMobileSource()
  const backendRequestHandler = source.slice(
    source.indexOf('function handleBackendRequest('),
    source.indexOf('function applyProfileRequestDeliveryState')
  )
  const dmThreadHandler = source.slice(
    source.indexOf('if (req.command === RPC_DM_THREAD)'),
    source.indexOf('if (req.command === RPC_PEER_COUNT)')
  )
  const applyProfileRequestDeliveryState = source.slice(
    source.indexOf('function applyProfileRequestDeliveryState'),
    source.indexOf('function startBackend(')
  )

  assert.match(
    source,
    /import \{[\s\S]*createMobileLocalAvatarMediaControl,[\s\S]*storeMobileAvatarMediaBytesControl[\s\S]*\} from '\.\.\/src\/mobile-avatar-media-sync\.ts'/
  )
  assert.match(source, /RPC_AVATAR_MEDIA_BYTES/)
  assert.match(source, /RPC_PROFILE_START/)
  assert.match(source, /RPC_PROFILE_REQUEST_SEND/)
  assert.match(source, /RPC_PROFILE_REQUEST_STATE/)
  assert.match(source, /async function createHomeSessionPayload\(/)
  assert.match(source, /localAvatarMediaControl: await createMobileLocalAvatarMediaControl\(/)
  assert.match(source, /function startProfileBackend\(/)
  assert.match(source, /nextRpc\.request\(RPC_PROFILE_START\)\.send\(JSON\.stringify\(payload\)\)/)
  assert.match(backendRequestHandler, /if \(req\.command === RPC_AVATAR_MEDIA_BYTES\)/)
  assert.match(backendRequestHandler, /if \(req\.command === RPC_PROFILE_REQUEST_STATE\)/)
  assert.match(backendRequestHandler, /storeMobileAvatarMediaBytesControl\(/)
  assert.match(backendRequestHandler, /book: contactBookRef\.current/)
  assert.match(backendRequestHandler, /sha256Hex: createMobileSha256Hex/)
  assert.match(backendRequestHandler, /setNotice\('Profile image received\.'\)/)
  assert.match(
    source,
    /import \{[\s\S]*updateOutgoingFriendRequestDeliveryState[\s\S]*\} from '\.\.\/src\/contact-book\.ts'/
  )
  assert.match(
    source,
    /import \{ formatProfileFriendAcceptanceDeliveryNotice \} from '\.\.\/src\/profile-friend-request-delivery\.ts'/
  )
  assert.match(backendRequestHandler, /applyProfileRequestDeliveryState\(payloadRecord/)
  assert.match(applyProfileRequestDeliveryState, /delivery\.phase === 'acceptance'/)
  assert.match(
    applyProfileRequestDeliveryState,
    /setNotice\(formatProfileFriendAcceptanceDeliveryNotice\(delivery\.state\)\)/
  )
  assert.match(applyProfileRequestDeliveryState, /updateOutgoingFriendRequestDeliveryState/)
  assert.match(applyProfileRequestDeliveryState, /deliveryState: delivery\.state \|\| 'queued'/)
  assert.match(applyProfileRequestDeliveryState, /profileId: delivery\.toProfileId \|\| ''/)
  assert.match(applyProfileRequestDeliveryState, /requestId: delivery\.requestId \|\| ''/)
  assert.match(applyProfileRequestDeliveryState, /contactBookRef\.current = nextBook/)
  assert.match(applyProfileRequestDeliveryState, /saveContactBookToFileSystem/)
  assert.match(
    dmThreadHandler,
    /setDmThreads\(\(current\) => upsertDmThread\(current, threadPayload\)\)/
  )
  assert.match(
    dmThreadHandler,
    /current\?\.outgoingRequestsByProfileId\?\.has\(threadPayload\.remoteProfileId\)/
  )
  assert.match(dmThreadHandler, /acceptOutgoingFriendRequest\(current/)
  assert.match(dmThreadHandler, /profileId: threadPayload\.remoteProfileId/)
  assert.match(dmThreadHandler, /createTreeholePolicyFromContactBook\(nextBook\)/)
  assert.match(dmThreadHandler, /contactBookRef\.current = nextBook/)
  assert.match(dmThreadHandler, /syncTreeholePolicy\(nextPolicy\)/)
  assert.match(dmThreadHandler, /saveContactBookToFileSystem/)
})

test('mobile direct contact chips and revoke actions expose trust state', async () => {
  const source = await readMobileSource()
  const lobbyComponents = await readMobileLobbyComponentsSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const directComponents = await readMobileDirectComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const requestComponents = await readMobileRequestComponentsSource()
  const contactManager = peopleComponents.slice(
    peopleComponents.indexOf('function ContactManager('),
    peopleComponents.indexOf('function withMobileProfileRecentPosts(')
  )
  const outgoingRequestManager = requestComponents.slice(
    requestComponents.indexOf('function OutgoingRequestManager('),
    requestComponents.indexOf('export type MessageRequestManagerProps')
  )
  const messageRequestManager = requestComponents.slice(
    requestComponents.indexOf('function MessageRequestManager('),
    requestComponents.length
  )
  const directPane = directComponents.slice(directComponents.indexOf('function DirectPane('))
  const profileComponents = await readMobileProfileComponentsSource()
  const contactChip = profileComponents.slice(
    profileComponents.indexOf('function MobileContactChip('),
    profileComponents.indexOf('export function ProfileRequestTargetCard(')
  )
  const contactProfileDetail = profileComponents.slice(
    profileComponents.indexOf('function ContactProfileDetail('),
    profileComponents.indexOf('function getMobileAvatarToneStyle(')
  )
  const trustedContactRows = contactManager.slice(
    contactManager.indexOf('{(contacts || []).map((contact) => {'),
    contactManager.indexOf('<View style={styles.contactBlockedSection}>')
  )

  assert.match(
    directComponents,
    /import \{[\s\S]*MobileContactChip,[\s\S]*ProfileRequestTargetCard[\s\S]*\} from '\.\/profile-components/
  )
  assert.match(roomComponents, /import \{ DirectPane,[\s\S]*\} from '\.\/direct-components\.tsx'/)
  assert.doesNotMatch(source, /function DirectPane\(/)
  assert.match(directComponents, /export type DirectPaneProps = \{/)
  assert.doesNotMatch(lobbyComponents, /PeopleActions/)
  assert.match(roomComponents, /import \{ PeoplePane,[\s\S]*\} from '\.\/people-components\.tsx'/)
  assert.doesNotMatch(source, /function PeoplePane\(/)
  assert.match(peopleComponents, /export type PeoplePaneProps = \{/)
  assert.doesNotMatch(source, /function MobileContactChip\(/)
  assert.doesNotMatch(source, /function ContactManager\(/)
  assert.match(peopleComponents, /export type ContactManagerProps = \{/)
  assert.match(profileComponents, /export type MobileContactChipProps = \{/)
  assert.match(trustedContactRows, /<Pressable[\s\S]*style=\{styles\.contactRow\}/)
  assert.match(trustedContactRows, /accessibilityRole='button'/)
  assert.match(
    trustedContactRows,
    /accessibilityLabel=\{`Open \$\{profile\.displayName\} profile`\}/
  )
  assert.match(
    trustedContactRows,
    /onPress=\{\(\) => onSelectedProfileChange\(profile\.profileId\)\}/
  )
  assert.match(contactChip, /function MobileContactChip\(/)
  assert.match(contactChip, /const label = formatMobileTrustedContactName\(contact\)/)
  assert.match(contactChip, /const avatar = createProfileAvatarViewModel\(\{/)
  assert.match(contactChip, /avatarMediaSnapshot: contact\.avatarMediaSnapshot/)
  assert.match(contactChip, /avatarUri: contact\.avatarUriSnapshot/)
  assert.match(contactChip, /displayName: label/)
  assert.match(contactChip, /profileId: contact\.profileId/)
  assert.match(contactChip, /resolveAvatarMediaUri/)
  assert.match(
    contactChip,
    /<MobileProfileAvatar avatar=\{avatar\} size='small' styles=\{styles\} \/>/
  )
  assert.match(contactChip, /accessibilityLabel=\{`Message recipient \$\{label\}`\}/)
  assert.doesNotMatch(
    trustedContactRows,
    /accessibilityLabel=\{`Message \$\{profile\.displayName\}`\}/
  )
  assert.doesNotMatch(trustedContactRows, /label=\{profile\.messageLabel\}/)
  assert.doesNotMatch(trustedContactRows, /<MobileSmallActionButton/)
  assert.doesNotMatch(trustedContactRows, /label='Profile'/)
  assert.match(trustedContactRows, /<User color=\{theme\.accentStrong\} size=\{18\} \/>/)
  assert.doesNotMatch(
    trustedContactRows,
    /accessibilityLabel=\{`Enter \$\{profile\.displayName\} home`\}/
  )
  assert.doesNotMatch(trustedContactRows, /disabled=\{!profile\.enterHomeEnabled\}/)
  assert.doesNotMatch(trustedContactRows, /label=\{profile\.enterHomeLabel\}/)
  assert.doesNotMatch(
    trustedContactRows,
    /onPress=\{\(\) => onEnterContactHome\(profile\.profileId\)\}/
  )
  assert.doesNotMatch(
    trustedContactRows,
    /accessibilityLabel=\{`Remove \$\{profile\.displayName\} as friend`\}/
  )
  assert.doesNotMatch(trustedContactRows, /label=\{profile\.revokeLabel\}/)
  assert.doesNotMatch(trustedContactRows, /profile\.recentTitle/)
  assert.match(trustedContactRows, /createContactProfileViewModel\(/)
  assert.match(peopleComponents, /createProfileRecentPostsViewModel\(/)
  assert.match(contactManager, /activeHomeOwnerProfileId/)
  assert.match(contactManager, /treeholePosts/)
  assert.match(source, /profileRecentPostCache/)
  assert.match(peopleComponents, /cachedPostsByProfileId: profileRecentPostCache/)
  assert.doesNotMatch(trustedContactRows, /profile\.recentPosts/)
  assert.match(trustedContactRows, /<MobileProfileAvatar avatar=\{profile\.avatar\}/)
  assert.doesNotMatch(trustedContactRows, /profile\.recentCopy/)
  assert.match(contactProfileDetail, /accessibilityLabel=\{`Message \$\{profile\.displayName\}`\}/)
  assert.match(contactProfileDetail, /disabled=\{!profile\.messageEnabled\}/)
  assert.match(contactProfileDetail, /label=\{profile\.messageLabel\}/)
  assert.match(
    contactProfileDetail,
    /accessibilityLabel=\{`Enter \$\{profile\.displayName\} home`\}/
  )
  assert.match(contactProfileDetail, /disabled=\{!profile\.enterHomeEnabled\}/)
  assert.match(contactProfileDetail, /label=\{profile\.enterHomeLabel\}/)
  assert.match(contactProfileDetail, /onPress=\{\(\) => onEnterContactHome\(profile\.profileId\)\}/)
  assert.match(
    contactProfileDetail,
    /accessibilityLabel=\{`Remove \$\{profile\.displayName\} as friend`\}/
  )
  assert.match(contactProfileDetail, /icon=\{UserMinus\}/)
  assert.match(contactProfileDetail, /label='Remove friend'/)
  assert.match(contactProfileDetail, /variant='danger'/)
  assert.match(contactProfileDetail, /profile\.relationshipState === 'incoming_request'/)
  assert.match(
    contactProfileDetail,
    /<MobileRequestActionButton[\s\S]*testID='contact-profile-ignore-request-button'[\s\S]*variant='ignore'/
  )
  assert.match(
    contactProfileDetail,
    /<MobileRequestActionButton[\s\S]*testID='contact-profile-accept-request-button'[\s\S]*variant='accept'/
  )
  assert.match(
    contactProfileDetail,
    /<MobileSmallActionButton[\s\S]*accessibilityLabel=\{`Allow requests from \$\{profile\.displayName\}`\}[\s\S]*icon=\{UserPlus\}[\s\S]*label='Allow requests'[\s\S]*onAllowContactRequests\(profile\.profileId\)/
  )
  assert.match(contactProfileDetail, /\{profile\.enterHomeEnabled \? \(/)
  assert.match(
    contactProfileDetail,
    /accessibilityLabel=\{`Refresh recent posts from \$\{profile\.displayName\}`\}/
  )
  assert.match(contactProfileDetail, /label='Refresh posts'/)
  assert.match(contactProfileDetail, /onPress=\{\(\) => onEnterContactHome\(profile\.profileId\)\}/)
  assert.doesNotMatch(source, /function ContactProfileDetail\(/)
  assert.match(profileComponents, /export type ContactProfileDetailProps = \{/)
  assert.match(contactManager, /<ContactProfileDetail[\s\S]*profile=\{selectedProfile\}/)
  assert.match(
    contactManager,
    /<ContactProfileDetail[\s\S]*onAcceptProfileRequest=\{onAcceptRequest\}/
  )
  assert.match(
    contactManager,
    /<ContactProfileDetail[\s\S]*onAllowContactRequests=\{onAllowContactRequests\}/
  )
  assert.match(contactManager, /<ContactProfileDetail[\s\S]*onIgnoreProfileRequest=/)
  assert.match(contactManager, /<ContactProfileDetail[\s\S]*styles=\{styles\}/)
  assert.match(contactManager, /<ContactProfileDetail[\s\S]*theme=\{theme\}/)
  assert.match(contactProfileDetail, /testID='contact-profile-detail'/)
  assert.match(contactProfileDetail, /Advanced identity/)
  assert.match(contactProfileDetail, /testID='contact-advanced-identity-toggle'/)
  assert.match(contactProfileDetail, /accessibilityState=\{\{ expanded: showAdvancedIdentity \}\}/)
  assert.match(contactProfileDetail, /showAdvancedIdentity \? \(/)
  assert.equal(
    contactProfileDetail.indexOf('Profile fingerprint') >
      contactProfileDetail.indexOf('showAdvancedIdentity ? ('),
    true
  )
  assert.match(contactManager, /onSelectedProfileChange\(null\)/)
  assert.doesNotMatch(source, /function OutgoingRequestManager\(/)
  assert.doesNotMatch(source, /function MessageRequestManager\(/)
  assert.match(requestComponents, /export type OutgoingRequestManagerProps = \{/)
  assert.match(requestComponents, /onOpenProfile\?\(profileId: string\): void/)
  assert.match(requestComponents, /profile-friend-request-delivery/)
  assert.doesNotMatch(requestComponents, /profile-friend-request-transport/)
  assert.match(outgoingRequestManager, /title='Sent requests'/)
  assert.match(outgoingRequestManager, /formatProfileFriendRequestDeliveryState/)
  assert.match(outgoingRequestManager, /formatOutgoingRequestTitle\(request\)/)
  assert.match(
    outgoingRequestManager,
    /<MobileSmallActionButton[\s\S]*testID='people-outgoing-request-profile-button'/
  )
  assert.match(outgoingRequestManager, /onPress=\{\(\) => onOpenProfile\(request\.profileId\)\}/)
  assert.match(
    messageRequestManager,
    /<MobileSmallActionButton[\s\S]*testID='people-message-request-profile-button'/
  )
  assert.match(messageRequestManager, /onPress=\{\(\) => onOpenProfile\(request\.profileId\)\}/)
  assert.match(contactChip, /accessibilityRole='button'/)
  assert.match(contactChip, /accessibilityState=\{\{ selected \}\}/)
  assert.match(directPane, /<MobileContactChip[\s\S]*contact=\{contact\}/)
  assert.match(directPane, /selected=\{recipient === contact\.profileId\}/)
})

test('mobile contact Home entry validates the saved signed descriptor before joining', async () => {
  const source = await readMobileSource()
  const enterContactHome = source.slice(
    source.indexOf('async function enterContactHome('),
    source.indexOf('function buildShareQrOutputs(')
  )

  assert.match(source, /readTrustedContactHomeDescriptor/)
  assert.match(
    enterContactHome,
    /const homeDescriptor = readTrustedContactHomeDescriptor\(\{[\s\S]*book: contactBook,[\s\S]*profileId: profileIdToEnter/
  )
  assert.match(enterContactHome, /address: homeDescriptor\.address/)
  assert.match(enterContactHome, /ownerProfileId: homeDescriptor\.ownerProfileId/)
  assert.match(enterContactHome, /policy: homeDescriptor\.policy/)
  assert.match(enterContactHome, /roomKey: homeDescriptor\.roomKey/)
})

test('mobile Chat focuses the selected direct thread message list', async () => {
  const source = await readMobileSource()
  const directComponents = await readMobileDirectComponentsSource()
  const directPane = directComponents.slice(directComponents.indexOf('function DirectPane('))

  assert.match(directComponents, /filterDirectMessagesForProfile/)
  assert.match(
    directPane,
    /const visibleMessages = filterDirectMessagesForProfile\(\s*messages,\s*recipient\s*\)/
  )
  assert.match(directPane, /data=\{visibleMessages\}/)
})

test('mobile messages can show thread rows and scanned profile request targets', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const directComponents = await readMobileDirectComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const profileComponents = await readMobileProfileComponentsSource()
  const threadComponents = await readMobileThreadComponentsSource()
  const directPane = directComponents.slice(directComponents.indexOf('function DirectPane('))
  const requestTarget = profileComponents.slice(
    profileComponents.indexOf('export function ProfileRequestTargetCard('),
    profileComponents.indexOf('function getMobileAvatarToneStyle(')
  )
  const chooseProfileRequestTarget = source.slice(
    source.indexOf('function chooseProfileRequestTarget(uri: string'),
    source.indexOf('async function revokeTrustedContact(')
  )
  const checkedThreadList = threadComponents.slice(
    threadComponents.indexOf('function MessageThreadList('),
    threadComponents.indexOf('function ThreadRow(')
  )
  const checkedThreadRow = threadComponents.slice(
    threadComponents.indexOf('function ThreadRow('),
    threadComponents.indexOf('export type DirectThreadHeaderProps')
  )
  const checkedThreadHeader = threadComponents.slice(
    threadComponents.indexOf('function DirectThreadHeader(')
  )

  assert.match(
    directComponents,
    /import \{[\s\S]*DirectThreadHeader,[\s\S]*MessageThreadList[\s\S]*\} from '\.\/thread-components\.tsx'/
  )
  assert.match(source, /readMobileProfileRequestTarget/)
  assert.doesNotMatch(source, /applyMobileProfileQrScan/)
  assert.doesNotMatch(source, /await trustProfileQr\(data\)/)
  assert.match(source, /createFriendRequestTargetViewModel/)
  assert.match(
    source,
    /const \[profileRequestTarget, setProfileRequestTarget\] =\s+useState<FriendRequestTargetViewModel \| null>\(null\)/
  )
  assert.match(
    source,
    /function chooseProfileRequestTarget\(uri: string, displayNameOverride = ''\)/
  )
  assert.match(source, /chooseProfileRequestTarget\(uri, trustAlias\)/)
  assert.match(source, /setDmRecipient\(target\.profileId\)/)
  assert.match(source, /setActiveTab\('dm'\)/)
  assert.match(source, /setNotice\(targetView\.copy\)/)
  assert.match(source, /contactBook,[\s\S]*shortenProfileId,[\s\S]*target/)
  assert.match(chooseProfileRequestTarget, /readMobileProfileRequestTarget\(\{ uri \}\)/)
  assert.match(chooseProfileRequestTarget, /setProfileRequestTarget\(targetView\)/)
  assert.match(chooseProfileRequestTarget, /setDmRecipient\(target\.profileId\)/)
  assert.match(chooseProfileRequestTarget, /setActiveTab\('dm'\)/)
  assert.doesNotMatch(chooseProfileRequestTarget, /applyMobileHomeQrScan/)
  assert.doesNotMatch(chooseProfileRequestTarget, /enterContactHome/)
  assert.doesNotMatch(chooseProfileRequestTarget, /startBackend/)
  assert.doesNotMatch(chooseProfileRequestTarget, /saveContactBookToFileSystem/)
  assert.doesNotMatch(chooseProfileRequestTarget, /trustContact/)
  assert.match(directPane, /<ProfileRequestTargetCard[\s\S]*requestTarget=\{requestTarget\}/)
  assert.match(directPane, /<ProfileRequestTargetCard[\s\S]*onOpenProfile=\{onOpenProfile\}/)
  assert.doesNotMatch(source, /function ProfileRequestTargetCard\(/)
  assert.match(profileComponents, /export type ProfileRequestTargetCardProps = \{/)
  assert.match(
    requestTarget,
    /<MobileProfileAvatar avatar=\{requestTarget\.avatar\} styles=\{styles\}/
  )
  assert.match(directPane, /<MessageThreadList[\s\S]*threads=\{threads\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*onOpenProfile=\{onOpenProfile\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*onOpenPeople=\{onOpenPeople\}/)
  assert.match(
    directPane,
    /const acceptRequest = \(message: unknown\) =>[\s\S]*Promise\.resolve\(onAcceptRequest\(message as DirectPaneMessage\)\)/
  )
  assert.match(
    directPane,
    /const ignoreRequest = \(message: unknown\) =>[\s\S]*Promise\.resolve\(onIgnoreRequest\(message as DirectPaneMessage\)\)/
  )
  assert.match(directPane, /<MessageThreadList[\s\S]*onAcceptRequest=\{acceptRequest\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*onIgnoreRequest=\{ignoreRequest\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*onMarkThreadRead=\{onMarkThreadRead\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*messages=\{messages\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*contacts=\{threadContacts\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*styles=\{styles\}/)
  assert.match(directPane, /<DirectBubble[\s\S]*contacts=\{contactOptions\}/)
  assert.match(directPane, /const selectedThread = findSelectedDmThreadView\(/)
  assert.match(directPane, /selectedProfileId: recipient/)
  assert.match(directPane, /<DirectThreadHeader[\s\S]*thread=\{selectedThread\}/)
  assert.match(directPane, /<DirectThreadHeader[\s\S]*styles=\{styles\}/)
  assert.match(
    directPane,
    /placeholder=\{\s*selectedThread\?\.label \? `Message \$\{selectedThread\.label\}` : 'Write a message'\s*\}/
  )
  assert.doesNotMatch(source, /function DirectThreadHeader\(/)
  assert.doesNotMatch(source, /function MessageThreadList\(/)
  assert.match(threadComponents, /export type MessageThreadListProps = \{/)
  assert.match(threadComponents, /export type DirectThreadHeaderProps = \{/)
  assert.match(source, /findSelectedDmThreadView/)
  assert.doesNotMatch(source, /function findSelectedDirectThread\(/)
  assert.match(requestTarget, /testID='profile-request-target-card'/)
  assert.match(requestTarget, /requestTarget\.statusLabel/)
  assert.match(requestTarget, /requestTarget\.copy/)
  assert.match(requestTarget, /const displayName = requestTarget\.displayName \|\| 'Profile'/)
  assert.match(requestTarget, /accessibilityLabel=\{`Open \$\{displayName\} profile`\}/)
  assert.match(requestTarget, /onPress=\{\(\) => onOpenProfile\(requestTarget\.profileId\)\}/)
  assert.match(checkedThreadList, /testID='message-thread-list'/)
  assert.match(checkedThreadList, /testID='message-thread-empty'/)
  assert.match(checkedThreadList, /Open Contacts to scan a profile or accept a friend request\./)
  assert.match(checkedThreadList, /testID='message-thread-open-contacts-button'/)
  assert.match(checkedThreadList, /onPress=\{onOpenPeople\}/)
  assert.match(checkedThreadList, /createDmThreadListView\(\{[\s\S]*messages,[\s\S]*threads/)
  assert.match(checkedThreadRow, /<MobileProfileAvatar avatar=\{thread\.avatar\}/)
  assert.match(checkedThreadRow, /thread\.preview/)
  assert.match(checkedThreadRow, /thread\.timeLabel/)
  assert.match(checkedThreadRow, /thread\.unreadCount/)
  assert.match(checkedThreadRow, /threadUnreadBadge/)
  assert.match(checkedThreadRow, /thread\.unreadLabel/)
  assert.match(
    checkedThreadRow,
    /onPress=\{\(\) => \{[\s\S]*onSelectThread\(thread\.profileId\)[\s\S]*onMarkThreadRead\(thread\.profileId\)[\s\S]*\}\}/
  )
  assert.match(directPane, /<MessageThreadList[\s\S]*onSelectThread=\{onRecipientChange\}/)
  assert.match(checkedThreadHeader, /accessibilityLabel=\{`Open \$\{thread\.label\} profile`\}/)
  assert.match(checkedThreadHeader, /onPress=\{\(\) => onOpenProfile\(thread\.profileId\)\}/)
  assert.match(checkedThreadRow, /const requestActions = thread\.requestActions/)
  assert.match(
    checkedThreadRow,
    /<MobileRequestActionButton[\s\S]*testID='thread-message-request-ignore-button'[\s\S]*variant='ignore'/
  )
  assert.match(
    checkedThreadRow,
    /<MobileRequestActionButton[\s\S]*testID='thread-message-request-accept-button'[\s\S]*variant='accept'/
  )
  assert.match(
    source,
    /const \[contactProfileTargetId, setContactProfileTargetId\] = useState<string \| null>\(null\)/
  )
  assert.match(source, /onContactProfileTargetChange=\{setContactProfileTargetId\}/)
  assert.match(
    roomComponents,
    /onOpenProfile=\{\(contactProfileId\) => \{[\s\S]*onContactProfileTargetChange\(contactProfileId\)[\s\S]*onTabChange\('people'\)/
  )
  assert.match(peopleComponents, /createRequestTargetProfileViewModel\(/)
})

test('mobile Chat and Contacts share one profile detail route', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const directComponents = await readMobileDirectComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const profileComponents = await readMobileProfileComponentsSource()
  const threadComponents = await readMobileThreadComponentsSource()
  const directPane = directComponents.slice(directComponents.indexOf('function DirectPane('))
  const messageThreadList = threadComponents.slice(
    threadComponents.indexOf('function MessageThreadList('),
    threadComponents.indexOf('function ThreadRow(')
  )
  const threadRow = threadComponents.slice(
    threadComponents.indexOf('function ThreadRow('),
    threadComponents.indexOf('export type DirectThreadHeaderProps')
  )
  const threadHeader = threadComponents.slice(
    threadComponents.indexOf('function DirectThreadHeader('),
    threadComponents.indexOf('export function formatMobileThreadTime')
  )
  const peoplePane = peopleComponents.slice(
    peopleComponents.indexOf('export function PeoplePane('),
    peopleComponents.indexOf('export type PeopleActionsProps')
  )
  const peopleActions = peopleComponents.slice(
    peopleComponents.indexOf('export function PeopleActions('),
    peopleComponents.indexOf('export type ContactManagerProps')
  )
  const contactManager = peopleComponents.slice(
    peopleComponents.indexOf('function ContactManager('),
    peopleComponents.indexOf('function createMobileRequestProfile(')
  )
  const contactProfileDetail = profileComponents.slice(
    profileComponents.indexOf('function ContactProfileDetail('),
    profileComponents.indexOf('function getMobileAvatarToneStyle(')
  )

  assert.match(
    source,
    /const \[contactProfileTargetId, setContactProfileTargetId\] = useState<string \| null>\(null\)/
  )
  assert.match(source, /onContactProfileTargetChange=\{setContactProfileTargetId\}/)
  assert.match(directPane, /<DirectThreadHeader[\s\S]*onOpenProfile=\{onOpenProfile\}/)
  assert.match(directPane, /<MessageThreadList[\s\S]*onOpenProfile=\{onOpenProfile\}/)
  assert.match(messageThreadList, /<ThreadRow[\s\S]*onOpenProfile=\{onOpenProfile\}/)
  assert.match(threadRow, /onPress=\{\(\) => onOpenProfile\(thread\.profileId\)\}/)
  assert.match(threadHeader, /onPress=\{\(\) => onOpenProfile\(thread\.profileId\)\}/)
  assert.match(
    roomComponents,
    /onOpenProfile=\{\(contactProfileId\) => \{[\s\S]*onContactProfileTargetChange\(contactProfileId\)[\s\S]*onTabChange\('people'\)/
  )
  assert.match(peoplePane, /<PeopleActions[\s\S]*selectedProfileId=\{selectedProfileId\}/)
  assert.match(
    peoplePane,
    /<PeopleActions[\s\S]*onSelectedProfileChange=\{onSelectedProfileChange\}/
  )
  assert.match(peopleActions, /<ContactManager[\s\S]*selectedProfileId=\{selectedProfileId\}/)
  assert.match(
    peopleActions,
    /<ContactManager[\s\S]*onSelectedProfileChange=\{onSelectedProfileChange\}/
  )
  assert.match(contactManager, /const selectedContact = \(contacts \|\| \[\]\)\.find/)
  assert.match(contactManager, /const selectedPendingRequest = \(pendingRequests \|\| \[\]\)\.find/)
  assert.match(
    contactManager,
    /const selectedOutgoingRequest = \(outgoingRequests \|\| \[\]\)\.find/
  )
  assert.match(contactManager, /const selectedBlockedContact = \(blockedContacts \|\| \[\]\)\.find/)
  assert.match(contactManager, /<ContactProfileDetail[\s\S]*profile=\{selectedProfile\}/)
  assert.match(contactProfileDetail, /label=\{profile\.messageLabel\}/)
  assert.match(contactProfileDetail, /label=\{profile\.enterHomeLabel\}/)
  assert.match(contactProfileDetail, /profile\.recentTitle/)
  assert.match(contactProfileDetail, /label='Remove friend'/)
})

test('mobile small trust and treehole actions share one icon button component', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const treeholeComponents = await readMobileTreeholeComponentsSource()
  const profileComponents = await readMobileProfileComponentsSource()
  const contactManager = peopleComponents.slice(
    peopleComponents.indexOf('function ContactManager('),
    peopleComponents.indexOf('function withMobileProfileRecentPosts(')
  )
  const contactProfileDetail = profileComponents.slice(
    profileComponents.indexOf('function ContactProfileDetail('),
    profileComponents.indexOf('function getMobileAvatarToneStyle(')
  )
  const treeholePost = treeholeComponents.slice(
    treeholeComponents.indexOf('function TreeholePost('),
    treeholeComponents.indexOf('export type TreeholePostInput')
  )
  const actionComponents = await readMobileActionComponentsSource()
  const smallActionButton = actionComponents.slice(
    actionComponents.indexOf('function MobileSmallActionButton('),
    actionComponents.indexOf('export type MobileAdvancedToggleStyles')
  )

  assert.match(
    peopleComponents,
    /import \{[\s\S]*MobileSmallActionButton[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.match(
    treeholeComponents,
    /import \{[\s\S]*MobileSmallActionButton[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.doesNotMatch(source, /function MobileSmallActionButton\(/)
  assert.match(actionComponents, /export type MobileSmallActionButtonProps = \{/)
  assert.match(smallActionButton, /function MobileSmallActionButton\(/)
  assert.match(smallActionButton, /const isDanger = variant === 'danger'/)
  assert.match(smallActionButton, /accessibilityRole='button'/)
  assert.match(smallActionButton, /accessibilityState=\{\{ disabled \}\}/)
  assert.match(smallActionButton, /isDanger \? styles\.revokeButton : styles\.smallActionButton/)
  assert.match(smallActionButton, /disabled && styles\.disabledSmallActionButton/)
  assert.doesNotMatch(contactManager, /<MobileSmallActionButton[\s\S]*variant='danger'/)
  assert.match(contactProfileDetail, /<MobileSmallActionButton[\s\S]*variant='danger'/)
  assert.doesNotMatch(source, /function TreeholePost\(/)
  assert.match(
    roomComponents,
    /import \{ TreeholePane,[\s\S]*\} from '\.\/treehole-components\.tsx'/
  )
  assert.match(treeholeComponents, /export function TreeholePost\(/)
  assert.doesNotMatch(source, /function TreeholePane\(/)
  assert.match(treeholeComponents, /export type TreeholePaneProps = \{/)
  assert.match(treeholeComponents, /export type TreeholePostProps = \{/)
  assert.match(treeholePost, /<MobileSmallActionButton[\s\S]*icon=\{Heart\}/)
  assert.match(treeholePost, /<MobileSmallActionButton[\s\S]*label='Like'/)
})

test('mobile treehole author rows show generated avatars', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const treeholeComponents = await readMobileTreeholeComponentsSource()
  const avatarViewModel = await readMobileAvatarViewModelSource()
  const treeholePost = treeholeComponents.slice(
    treeholeComponents.indexOf('function TreeholePost('),
    treeholeComponents.indexOf('export type TreeholePostInput')
  )

  assert.doesNotMatch(source, /function TreeholePost\(/)
  assert.match(roomComponents, /<TreeholePane[\s\S]*styles=\{styles\}[\s\S]*theme=\{theme\}/)
  assert.match(treeholeComponents, /<TreeholePost[\s\S]*styles=\{styles\}[\s\S]*theme=\{theme\}/)
  assert.match(avatarViewModel, /createProfileAvatarViewModel/)
  assert.match(treeholePost, /const postAvatar = createMobileTreeholeAuthorAvatar\(post\)/)
  assert.match(treeholePost, /const commentAvatar = createMobileTreeholeAuthorAvatar\(comment\)/)
  assert.match(treeholePost, /<MobileProfileAvatar avatar=\{postAvatar\} styles=\{styles\} \/>/)
  assert.match(
    treeholePost,
    /<MobileProfileAvatar avatar=\{commentAvatar\} size='small' styles=\{styles\} \/>/
  )
  assert.match(treeholePost, /styles\.treeholeAuthorRow/)
  assert.match(treeholePost, /styles\.commentAuthorRow/)
})

test('mobile collapsible controls expose expanded state', async () => {
  const source = await readMobileSource()
  const directComponents = await readMobileDirectComponentsSource()
  const lobbyComponents = await readMobileLobbyComponentsSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const setupComponents = await readMobileSetupComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const startupPane = lobbyComponents.slice(lobbyComponents.indexOf('function HomeStartupPane('))
  const quickStart = setupComponents.slice(
    setupComponents.indexOf('export function QuickStartPanel')
  )
  const room = roomComponents.slice(roomComponents.indexOf('function ChatRoom('))
  const peopleActions = peopleComponents.slice(
    peopleComponents.indexOf('function PeopleActions('),
    peopleComponents.indexOf('export type ContactManagerProps')
  )
  const directPane = directComponents.slice(directComponents.indexOf('function DirectPane('))

  assert.match(
    startupPane,
    /accessibilityState=\{\{ expanded: showAdvancedJoin \}\}[\s\S]*testID='advanced-join-toggle'/
  )
  assert.doesNotMatch(startupPane, /people-setup-toggle/)
  assert.match(quickStart, /accessibilityState=\{\{ expanded: showQuickProfileQr \}\}/)
  assert.match(room, /expanded=\{showRoomAdvanced\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showHomeQr \}\}/)
  assert.match(peopleActions, /accessibilityState=\{\{ expanded: showAdvancedShare \}\}/)
  assert.match(
    directPane,
    /expanded=\{showAdvancedDmRecipient\}[\s\S]*testID='advanced-dm-recipient-toggle'/
  )
})

test('mobile Contacts hides QR transport controls behind Advanced', async () => {
  const peopleComponents = await readMobilePeopleComponentsSource()
  const peopleActions = peopleComponents.slice(
    peopleComponents.indexOf('function PeopleActions('),
    peopleComponents.indexOf('export type ContactManagerProps')
  )
  const advancedToggleIndex = peopleActions.indexOf("testID='advanced-share-toggle'")
  const advancedPanelIndex = peopleActions.indexOf('showAdvancedShare ? (')
  const homeQrIndex = peopleActions.indexOf("title='Debug Home QR'")
  const addFriendIndex = peopleActions.indexOf("title='Add friend'")
  const rawQrIndex = peopleActions.indexOf("title='QR details'")

  assert.ok(advancedToggleIndex > -1)
  assert.ok(advancedPanelIndex > advancedToggleIndex)
  assert.ok(homeQrIndex > advancedPanelIndex)
  assert.ok(addFriendIndex < advancedToggleIndex)
  assert.ok(rawQrIndex > advancedPanelIndex)
  assert.equal(peopleActions.includes("title='Home QR'"), false)
  assert.match(
    peopleActions,
    /description='Scan a Profile QR, then write a request in Chat\.'[\s\S]*title='Add friend'/
  )
  assert.equal(peopleActions.includes('trust-only setup'), false)
  assert.match(peopleActions, /showAdvancedShare \? \([\s\S]*testID='show-home-qr-button'/)
  assert.doesNotMatch(
    peopleActions,
    /showAdvancedShare \? \([\s\S]*testID='show-profile-qr-button'/
  )
})

test('mobile Home bar shows the current Home owner context', async () => {
  const source = await readMobileSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const chatRoom = roomComponents.slice(roomComponents.indexOf('function ChatRoom('))

  assert.match(roomComponents, /createHomeOwnerViewModel/)
  assert.match(chatRoom, /const homeOwner = createHomeOwnerViewModel\(/)
  assert.match(chatRoom, /ownerProfileId: activeHomeOwnerProfileId/)
  assert.match(chatRoom, /localProfileId: profileId/)
  assert.match(chatRoom, /contacts: dmContactOptions/)
  assert.match(chatRoom, /session \? homeOwner\.title : 'This device'/)
  assert.match(chatRoom, /session \? homeOwner\.subtitle : 'Home is offline'/)
  assert.match(chatRoom, /homeOwner\.canOpenProfile/)
  assert.match(chatRoom, /onContactProfileTargetChange\(homeOwner\.ownerProfileId\)/)
})

test('mobile contacts expose removed and ignored profiles', async () => {
  const source = await readMobileSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const contactManager = peopleComponents.slice(
    peopleComponents.indexOf('function ContactManager('),
    peopleComponents.indexOf('function withMobileProfileRecentPosts(')
  )

  assert.match(peopleComponents, /from '\.\.\/src\/request-target-profile-view-model\.ts'/)
  assert.doesNotMatch(source, /function createRequestTargetProfileViewModel\(/)
  assert.match(source, /allowContactRequests/)
  assert.match(source, /listBlockedContacts/)
  assert.match(source, /const blockedContactOptions = useMemo\(/)
  assert.match(source, /blockedContacts=\{blockedContactOptions\}/)
  assert.match(source, /onAllowContactRequests=\{allowRequestsFromContact\}/)
  assert.match(peopleComponents, /from '\.\.\/src\/blocked-contact-copy\.ts'/)
  assert.match(contactManager, /blockedContacts/)
  assert.match(contactManager, /eyebrow='Manage'/)
  assert.doesNotMatch(contactManager, /eyebrow='Blocked'/)
  assert.match(contactManager, /title='Removed \/ ignored'/)
  assert.match(contactManager, /Profiles you remove or ignore will appear here\./)
  assert.match(contactManager, /getBlockedContactCopy\(contact\)/)
  assert.match(contactManager, /blockedCopy\.copy/)
  assert.match(contactManager, /blockedCopy\.statusLabel/)
  assert.equal(contactManager.includes('Trust them again'), false)
  assert.match(contactManager, /icon=\{ShieldOff\}/)
  assert.match(contactManager, /label='Allow requests'/)
  assert.match(contactManager, /onAllowContactRequests\(contact\.profileId\)/)
  assert.match(contactManager, /canAllowRequests: true/)
})

test('mobile request sent state is derived from restored contact book', async () => {
  const source = await readMobileSource()
  const bootstrap = await readMobileProfileBootstrapSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const peoplePane = peopleComponents.slice(
    peopleComponents.indexOf('function PeoplePane('),
    peopleComponents.indexOf('export type PeopleActionsProps')
  )
  const peopleActions = peopleComponents.slice(
    peopleComponents.indexOf('function PeopleActions('),
    peopleComponents.indexOf('export type ContactManagerProps')
  )
  const requestComponents = await readMobileRequestComponentsSource()
  const outgoingRequestManager = requestComponents.slice(
    requestComponents.indexOf('function OutgoingRequestManager('),
    requestComponents.indexOf('export type MessageRequestManagerProps')
  )
  const retryOutgoingMessageRequest = source.slice(
    source.indexOf('function retryOutgoingMessageRequest('),
    source.indexOf('function sendTreeholePost()')
  )

  assert.match(bootstrap, /loadContactBookFromFileSystem\(/)
  assert.match(
    bootstrap,
    /return \{[\s\S]*contactBook,[\s\S]*treeholePolicy: createTreeholePolicyFromContactBook\(contactBook\)/
  )
  assert.match(source, /const outgoingMessageRequests = useMemo\(/)
  assert.match(
    source,
    /\(\) => \(contactBook \? Array\.from\(contactBook\.outgoingRequestsByProfileId\.values\(\)\) : \[\]\)/
  )
  assert.match(source, /outgoingRequests=\{outgoingMessageRequests\}/)
  assert.match(source, /onRetryOutgoingRequest=\{retryOutgoingMessageRequest\}/)
  assert.match(
    peoplePane,
    /<MessageRequestManager[\s\S]*onOpenProfile=\{\(requestProfileId\) => onSelectedProfileChange\(requestProfileId\)\}/
  )
  assert.match(
    peoplePane,
    /<OutgoingRequestManager[\s\S]*onOpenProfile=\{\(requestProfileId\) => onSelectedProfileChange\(requestProfileId\)\}/
  )
  assert.match(
    peoplePane,
    /<OutgoingRequestManager[\s\S]*onRetryRequest=\{onRetryOutgoingRequest\}/
  )
  assert.match(
    peopleActions,
    /<ContactManager[\s\S]*onSelectedProfileChange=\{onSelectedProfileChange\}/
  )
  assert.match(
    roomComponents,
    /onRetryOutgoingRequest: PeoplePaneProps\['onRetryOutgoingRequest'\]/
  )
  assert.match(roomComponents, /onRetryOutgoingRequest=\{onRetryOutgoingRequest\}/)
  assert.match(peoplePane, /<OutgoingRequestManager[\s\S]*outgoingRequests=\{outgoingRequests\}/)
  assert.match(peoplePane, /<OutgoingRequestManager[\s\S]*styles=\{styles\}/)
  assert.match(peoplePane, /<OutgoingRequestManager[\s\S]*theme=\{theme\}/)
  assert.match(outgoingRequestManager, /title='Sent requests'/)
  assert.match(outgoingRequestManager, /formatProfileFriendRequestDeliveryState/)
  assert.match(
    outgoingRequestManager,
    /const canRetry = Boolean\(request\.requestId && request\.text\)/
  )
  assert.match(outgoingRequestManager, /icon=\{RefreshCw\}/)
  assert.match(outgoingRequestManager, /label='Retry'/)
  assert.match(outgoingRequestManager, /onPress=\{\(\) => onRetryRequest\(request\)\}/)
  assert.match(outgoingRequestManager, /testID='people-outgoing-request-retry-button'/)
  assert.match(
    retryOutgoingMessageRequest,
    /const cleanProfileId = requestInput\.profileId\?\.trim\(\) \|\| ''/
  )
  assert.match(
    retryOutgoingMessageRequest,
    /const cleanRequestId = requestInput\.requestId\?\.trim\(\) \|\| ''/
  )
  assert.match(
    retryOutgoingMessageRequest,
    /const cleanText = normalizeComposerText\(requestInput\.text \|\| ''\)/
  )
  assert.match(retryOutgoingMessageRequest, /updateOutgoingFriendRequestDeliveryState\(contactBook/)
  assert.match(retryOutgoingMessageRequest, /deliveryState: 'queued'/)
  assert.match(retryOutgoingMessageRequest, /activeRpc\.request\(RPC_PROFILE_REQUEST_SEND\)\.send/)
  assert.match(retryOutgoingMessageRequest, /id: cleanRequestId/)
  assert.match(retryOutgoingMessageRequest, /toProfileId: cleanProfileId/)
  assert.doesNotMatch(retryOutgoingMessageRequest, /RPC_DM_SEND|RPC_SEND|enterRequestTargetHome/)
})

test('mobile recent profile posts cache is durable across app restart', async () => {
  const source = await readMobileSource()
  const bootstrap = await readMobileProfileBootstrapSource()
  const treeholeStateHandler = source.slice(
    source.indexOf('if (req.command === RPC_TREEHOLE_STATE)'),
    source.indexOf('if (req.command === RPC_ERROR)')
  )

  assert.match(bootstrap, /loadProfileRecentPostCacheFromFileSystem/)
  assert.match(source, /saveProfileRecentPostCacheToFileSystem/)
  assert.match(source, /updateProfileRecentPostCache/)
  assert.match(
    bootstrap,
    /const profileRecentPostCache = await loadProfileRecentPostCacheFromFileSystem/
  )
  assert.match(bootstrap, /profileRecentPostCache,/)
  assert.match(source, /setProfileRecentPostCache\(profile\.profileRecentPostCache\)/)
  assert.match(treeholeStateHandler, /updateProfileRecentPostCache\(current,/)
  assert.match(treeholeStateHandler, /saveProfileRecentPostCacheToFileSystem\(/)
})

test('mobile room and direct advanced toggles share one component', async () => {
  const source = await readMobileSource()
  const directComponents = await readMobileDirectComponentsSource()
  const roomComponents = await readMobileRoomComponentsSource()
  const actionComponents = await readMobileActionComponentsSource()
  const room = roomComponents.slice(roomComponents.indexOf('function ChatRoom('))
  const directPane = directComponents.slice(directComponents.indexOf('function DirectPane('))
  const advancedToggle = actionComponents.slice(
    actionComponents.indexOf('function MobileAdvancedToggle('),
    actionComponents.indexOf('export type MobileSendButtonStyles')
  )

  assert.match(
    roomComponents,
    /import \{[\s\S]*MobileAdvancedToggle[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.match(
    directComponents,
    /import \{[\s\S]*MobileAdvancedToggle,[\s\S]*MobileSendButton[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.doesNotMatch(source, /function MobileAdvancedToggle\(/)
  assert.match(actionComponents, /export type MobileAdvancedToggleProps = \{/)
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
  const roomComponents = await readMobileRoomComponentsSource()
  const chatRoom = roomComponents.slice(roomComponents.indexOf('function ChatRoom('))
  const actionComponents = await readMobileActionComponentsSource()
  const iconButton = actionComponents.slice(
    actionComponents.indexOf('function MobileIconButton('),
    actionComponents.indexOf('export type MobileSmallActionButtonStyles')
  )

  assert.match(
    roomComponents,
    /import \{[\s\S]*MobileIconButton[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.doesNotMatch(source, /function MobileIconButton\(/)
  assert.match(actionComponents, /export type MobileIconButtonProps = \{/)
  assert.match(iconButton, /function MobileIconButton\(/)
  assert.match(iconButton, /accessibilityLabel=\{accessibilityLabel\}/)
  assert.match(iconButton, /accessibilityRole='button'/)
  assert.match(iconButton, /style=\{styles\.iconButton\}/)
  assert.match(iconButton, /<Icon color=\{accentColor\} size=\{18\} \/>/)
  assert.match(chatRoom, /<MobileIconButton[\s\S]*accessibilityLabel='Leave home'/)
  assert.match(chatRoom, /<MobileIconButton[\s\S]*icon=\{LogOut\}/)
  assert.match(chatRoom, /<MobileIconButton[\s\S]*testID='leave-home-button'/)
})

test('mobile QR scanner cancel uses a focused scanner action component', async () => {
  const source = await readMobileSource()
  const chromeComponents = await readMobileChromeComponentsSource()
  const qrScanner = chromeComponents.slice(chromeComponents.indexOf('function QrScanner('))
  const actionComponents = await readMobileActionComponentsSource()
  const scannerCancelButton = actionComponents.slice(
    actionComponents.indexOf('function MobileScannerCancelButton('),
    actionComponents.indexOf('export type MobileIconButtonStyles')
  )

  assert.match(
    chromeComponents,
    /import \{[\s\S]*MobileScannerCancelButton[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.match(source, /import \{[\s\S]*QrScanner[\s\S]*\} from '\.\/chrome-components\.tsx'/)
  assert.doesNotMatch(source, /function QrScanner\(/)
  assert.doesNotMatch(source, /function MobileScannerCancelButton\(/)
  assert.match(chromeComponents, /export type QrScannerProps = \{/)
  assert.match(qrScanner, /<CameraView[\s\S]*testID='qr-scanner-camera'/)
  assert.match(actionComponents, /export type MobileScannerCancelButtonProps = \{/)
  assert.match(qrScanner, /<MobileScannerCancelButton[\s\S]*onPress=\{onCancel\}/)
  assert.match(qrScanner, /<MobileScannerCancelButton[\s\S]*styles=\{styles\}/)
  assert.match(scannerCancelButton, /function MobileScannerCancelButton\(\{/)
  assert.match(scannerCancelButton, /}: MobileScannerCancelButtonProps\)/)
  assert.match(scannerCancelButton, /accessibilityLabel='Cancel QR scan'/)
  assert.match(scannerCancelButton, /accessibilityRole='button'/)
  assert.match(scannerCancelButton, /style=\{styles\.scannerCancel\}/)
  assert.match(scannerCancelButton, /testID='qr-scanner-cancel'/)
  assert.match(scannerCancelButton, /<Text style=\{styles\.scannerCancelText\}>Cancel<\/Text>/)
})

test('mobile setup actions share one icon button component', async () => {
  const source = await readMobileSource()
  const lobbyComponents = await readMobileLobbyComponentsSource()
  const setupComponents = await readMobileSetupComponentsSource()
  const peopleComponents = await readMobilePeopleComponentsSource()
  const startupPane = lobbyComponents.slice(lobbyComponents.indexOf('function HomeStartupPane('))
  const quickStart = setupComponents.slice(
    setupComponents.indexOf('export function QuickStartPanel'),
    setupComponents.length
  )
  const peopleActions = peopleComponents.slice(
    peopleComponents.indexOf('function PeopleActions('),
    peopleComponents.indexOf('export type ContactManagerProps')
  )
  const actionComponents = await readMobileActionComponentsSource()
  const actionButton = actionComponents.slice(
    actionComponents.indexOf('function MobileActionButton('),
    actionComponents.indexOf('export type MobileScannerCancelButtonStyles')
  )

  assert.match(
    lobbyComponents,
    /import \{[\s\S]*MobileActionButton,[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.match(
    lobbyComponents,
    /import \{ QuickStartPanel,[\s\S]*\} from '\.\/setup-components\.tsx'/
  )
  assert.doesNotMatch(source, /function MobileActionButton\(/)
  assert.doesNotMatch(source, /function QuickStartPanel\(/)
  assert.match(actionComponents, /export type MobileActionButtonProps = \{/)
  assert.match(setupComponents, /export type QuickStartPanelProps = \{/)
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
  assert.match(startupPane, /<MobileActionButton[\s\S]*testID='advanced-join-toggle'/)
  assert.match(startupPane, /<MobileActionButton[\s\S]*testID='manual-home-join-button'/)
  assert.doesNotMatch(startupPane, /people-setup-toggle/)
  assert.match(quickStart, /<MobileActionButton[\s\S]*variant='primary'/)
  assert.match(quickStart, /<MobileActionButton[\s\S]*testID='quick-show-my-qr-button'/)
  assert.match(quickStart, /Show My QR or add a friend\./)
  assert.doesNotMatch(quickStart, /Show My QR or open your home\./)
  assert.doesNotMatch(quickStart, /quick-open-contacts-button/)
  assert.match(peopleActions, /<MobileActionButton[\s\S]*testID='scan-profile-qr-button'/)
  assert.match(peopleActions, /<MobileActionButton[\s\S]*testID='advanced-share-toggle'/)
})

test('mobile composers share one send button component', async () => {
  const source = await readMobileSource()
  const actionComponents = await readMobileActionComponentsSource()
  const directComponents = await readMobileDirectComponentsSource()
  const treeholeComponents = await readMobileTreeholeComponentsSource()
  const directPane = directComponents.slice(directComponents.indexOf('function DirectPane('))
  const messageComponents = await readMobileMessageComponentsSource()
  const homeChatPane = messageComponents.slice(
    messageComponents.indexOf('function HomeChatPane('),
    messageComponents.indexOf('export type DirectBubbleContact')
  )
  const treeholePane = treeholeComponents.slice(
    treeholeComponents.indexOf('function TreeholePane('),
    treeholeComponents.indexOf('export type TreeholePostInput')
  )
  const treeholePost = treeholeComponents.slice(
    treeholeComponents.indexOf('function TreeholePost('),
    treeholeComponents.indexOf('export type TreeholePostInput')
  )
  const sendButton = actionComponents.slice(
    actionComponents.indexOf('function MobileSendButton('),
    actionComponents.indexOf('export type MobileRequestActionButtonStyles')
  )

  assert.match(
    directComponents,
    /import \{[\s\S]*MobileSendButton[\s\S]*\} from '\.\/action-components\.tsx'/
  )
  assert.doesNotMatch(source, /function MobileSendButton\(/)
  assert.match(actionComponents, /export type MobileSendButtonProps = \{/)
  assert.match(sendButton, /function MobileSendButton\(/)
  assert.match(sendButton, /accessibilityRole='button'/)
  assert.match(sendButton, /accessibilityState=\{\{ disabled \}\}/)
  assert.match(sendButton, /isSmall \? styles\.smallSendButton : styles\.sendButton/)
  assert.match(sendButton, /disabled && styles\.disabledSendButton/)
  assert.match(directPane, /<MobileSendButton[\s\S]*testID='dm-send-button'/)
  assert.match(homeChatPane, /<MobileSendButton[\s\S]*testID='chat-send-button'/)
  assert.match(treeholePane, /<MobileSendButton[\s\S]*testID='treehole-post-button'/)
  assert.match(treeholePost, /<MobileSendButton[\s\S]*size='small'/)
})

test('mobile composer sends trimmed text payloads', async () => {
  const source = await readMobileSource()
  const sendMessage = source.slice(
    source.indexOf('function sendMessage()'),
    source.indexOf('function sendMessageRequest()')
  )
  const sendMessageRequest = source.slice(
    source.indexOf('function sendMessageRequest()'),
    source.indexOf('function sendTreeholePost()')
  )
  const sendTreeholePost = source.slice(
    source.indexOf('function sendTreeholePost()'),
    source.indexOf('function sendTreeholeComment(')
  )
  const sendTreeholeComment = source.slice(
    source.indexOf('function sendTreeholeComment('),
    source.indexOf('function sendTreeholeLike(')
  )

  assert.match(source, /import \{ normalizeComposerText \} from '\.\.\/src\/composer-text\.ts'/)
  assert.match(sendMessage, /const cleanText = normalizeComposerText\(draft\)/)
  assert.match(sendMessage, /text: cleanText/)
  assert.doesNotMatch(sendMessage, /text: draft/)
  assert.match(sendMessageRequest, /const cleanText = normalizeComposerText\(dmDraft\)/)
  assert.match(
    sendMessageRequest,
    /if \(thread\) \{[\s\S]*rpcRef\.current\?\.request\(RPC_DM_BODY_SEND\)/
  )
  assert.match(
    sendMessageRequest,
    /if \(thread\) \{[\s\S]*messageId: message\.requestId,[\s\S]*text: message\.text,[\s\S]*threadId: thread\.threadId/
  )
  assert.match(sendMessageRequest, /if \(thread\) \{[\s\S]*return\s*\}/)
  const acceptedThreadBranch = sendMessageRequest.slice(
    sendMessageRequest.indexOf('if (thread)'),
    sendMessageRequest.indexOf('const requestTargetView')
  )
  assert.doesNotMatch(acceptedThreadBranch, /RPC_SEND/)
  assert.doesNotMatch(acceptedThreadBranch, /RPC_DM_SEND/)
  assert.doesNotMatch(acceptedThreadBranch, /RPC_PROFILE_REQUEST_SEND/)
  assert.match(sendMessageRequest, /createFriendRequestTargetViewModel\(/)
  assert.match(sendMessageRequest, /if \(!requestTargetView\.canSendRequest\)/)
  assert.doesNotMatch(sendMessageRequest, /enterRequestTargetHome\(/)
  assert.doesNotMatch(sendMessageRequest, /requestRpc/)
  assert.doesNotMatch(sendMessageRequest, /RPC_DM_SEND/)
  assert.doesNotMatch(sendMessageRequest, /homeDescriptor/)
  assert.match(sendMessageRequest, /rpcRef\.current\?\.request\(RPC_PROFILE_REQUEST_SEND\)/)
  assert.match(sendMessageRequest, /avatarMediaSnapshot: requestTargetView\.avatarMediaSnapshot/)
  assert.match(sendMessageRequest, /avatarUriSnapshot: requestTargetView\.avatarUri/)
  assert.match(sendMessageRequest, /displayNameSnapshot: requestTargetView\.displayName/)
  assert.match(sendMessageRequest, /deliveryState: 'queued'/)
  assert.match(sendMessageRequest, /toProfileId: cleanRecipient/)
  assert.match(sendMessageRequest, /text: cleanText/)
  assert.doesNotMatch(sendMessageRequest, /text: dmDraft/)
  assert.match(sendTreeholePost, /const cleanText = normalizeComposerText\(treeholeDraft\)/)
  assert.match(sendTreeholePost, /text: cleanText/)
  assert.doesNotMatch(sendTreeholePost, /text: treeholeDraft/)
  assert.match(sendTreeholeComment, /const cleanText = normalizeComposerText\(text\)/)
  assert.match(sendTreeholeComment, /text: cleanText/)
})

test('mobile product notices are announced as polite status updates', async () => {
  const source = await readMobileSource()
  const chromeComponents = await readMobileChromeComponentsSource()
  const header = chromeComponents.slice(
    chromeComponents.indexOf('function Header('),
    chromeComponents.indexOf('export type QrCardProps')
  )

  assert.match(source, /import \{[\s\S]*Header[\s\S]*\} from '\.\/chrome-components\.tsx'/)
  assert.doesNotMatch(source, /function Header\(/)
  assert.match(chromeComponents, /export type HeaderProps = \{/)
  assert.match(header, /accessibilityLabel='Current status'/)
  assert.match(header, /accessibilityLiveRegion='polite'/)
  assert.match(header, /testID='app-notice'/)
})
