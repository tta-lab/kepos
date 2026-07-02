import { useState } from 'react'
import { Text, View } from 'react-native'
import { House, LogOut, Send, Sprout, User, Users } from 'lucide-react-native'
import { createHomeOwnerViewModel } from '../src/home-owner-view-model.ts'
import { productSurfaceTabs, type ProductSurfaceId } from '../src/product-surfaces.ts'
import {
  getMobileRoomKeyPreview,
  getMobileTabBadges,
  type MobileRoomSessionPreview
} from '../src/mobile-room-view-model.ts'
import { getMobileRoomSurface, shortenProfileId } from '../src/mobile-product-copy.ts'
import {
  formatTransportDebugLabel,
  type TransportDebugLabelState
} from '../src/transport-debug-label.ts'
import {
  MobileAdvancedToggle,
  MobileIconButton,
  type MobileAdvancedToggleStyles,
  type MobileIconButtonStyles
} from './action-components.tsx'
import { DirectPane, type DirectPaneProps } from './direct-components.tsx'
import { HomeStartupPane, type HomeStartupPaneProps } from './lobby-components.tsx'
import { HomeChatPane, type HomeChatPaneProps } from './message-components.tsx'
import { PeoplePane, type PeoplePaneProps } from './people-components.tsx'
import { TabButton, type TabButtonProps } from './tab-components.tsx'
import { TreeholePane, type TreeholePaneProps } from './treehole-components.tsx'

type MobileStyles = MobileAdvancedToggleStyles &
  MobileIconButtonStyles &
  DirectPaneProps['styles'] &
  HomeChatPaneProps['styles'] &
  PeoplePaneProps['styles'] &
  TabButtonProps['styles'] &
  TreeholePaneProps['styles'] & {
    chat: unknown
    roomActions: unknown
    roomAdvancedPanel: unknown
    roomBar: unknown
    roomContent: unknown
    roomKey: unknown
    roomLabel: unknown
    roomName: unknown
    roomOwnerMeta: unknown
    roomOwnerName: unknown
    sessionBadge: unknown
    sessionBadgeText: unknown
    sessionStrip: unknown
    tabs: unknown
  }

type MobileTheme = DirectPaneProps['theme'] &
  HomeChatPaneProps['theme'] &
  PeoplePaneProps['theme'] &
  TreeholePaneProps['theme'] & {
    accentStrong: string
    iconMuted: string
    inkSoft: string
    surface: string
  }

const MOBILE_TAB_ICONS: Record<ProductSurfaceId, TabButtonProps['icon']> = {
  chat: House,
  dm: Send,
  people: Users,
  treehole: Sprout
}

const MOBILE_TAB_TEST_IDS: Record<ProductSurfaceId, string> = {
  chat: 'chat-tab',
  dm: 'dm-tab',
  people: 'people-tab',
  treehole: 'treehole-tab'
}

export type ChatRoomProps = {
  activeHomeOwnerProfileId?: string
  activeTab: string
  blockedContacts?: PeoplePaneProps['blockedContacts']
  canJoin: HomeStartupPaneProps['canJoin']
  contactProfileTargetId?: string | null
  directRoomEndpoint: HomeStartupPaneProps['directRoomEndpoint']
  draft: string
  dmContactOptions: DirectPaneProps['contactOptions']
  dmDraft: string
  dmMessages: DirectPaneProps['messages']
  dmRecipient: string
  dmThreads: DirectPaneProps['threads']
  homeQrUri: string
  lastError?: string
  localAvatarUri?: HomeStartupPaneProps['localAvatarUri']
  myHomeQrUri: string
  nick?: HomeStartupPaneProps['nick']
  onAcceptRequest: PeoplePaneProps['onAcceptRequest'] & DirectPaneProps['onAcceptRequest']
  onAllowContactRequests: PeoplePaneProps['onAllowContactRequests']
  onChooseLocalAvatarImage: HomeStartupPaneProps['onChooseLocalAvatarImage']
  onContactProfileTargetChange(profileId: string | null): void
  onCreateRoom: HomeStartupPaneProps['onCreateRoom']
  onDirectRoomEndpointChange: HomeStartupPaneProps['onDirectRoomEndpointChange']
  onDmDraftChange(value: string): void
  onDmRecipientChange(profileId: string): void
  onDraftChange(value: string): void
  onEnterContactHome: PeoplePaneProps['onEnterContactHome']
  onHomeQrChange(value: string): void
  onIgnoreRequest: PeoplePaneProps['onIgnoreRequest'] & DirectPaneProps['onIgnoreRequest']
  onJoinHomeQr(): void
  onJoinRoom: HomeStartupPaneProps['onJoinRoom']
  onLeave(): void
  onLocalAvatarUriChange: HomeStartupPaneProps['onLocalAvatarUriChange']
  onMarkThreadRead(profileId: string): void
  onNickChange: HomeStartupPaneProps['onNickChange']
  onRevokeContact: PeoplePaneProps['onRevokeContact']
  onRetryOutgoingRequest: PeoplePaneProps['onRetryOutgoingRequest']
  onRoomKeyChange: HomeStartupPaneProps['onRoomKeyChange']
  onScanHomeQr(): void
  onScanProfileQr(): void
  onSend(): void
  onSendDm(): void
  onTabChange(tab: string): void
  onToggleAdvancedJoin: HomeStartupPaneProps['onToggleAdvancedJoin']
  onTreeholeComment: TreeholePaneProps['onComment']
  onTreeholeDraftChange: TreeholePaneProps['onDraftChange']
  onTreeholeLike: TreeholePaneProps['onLike']
  onTreeholePost: TreeholePaneProps['onPost']
  onTrustAliasChange(value: string): void
  onTrustProfile(): void
  onTrustQrChange(value: string): void
  outgoingRequests?: PeoplePaneProps['outgoingRequests']
  pendingRequests?: PeoplePaneProps['pendingRequests']
  profileId?: string | null
  profileQrUri: string
  profileReady: boolean
  profileRecentPostCache?: PeoplePaneProps['profileRecentPostCache']
  profileRequestTarget?: PeoplePaneProps['profileRequestTarget'] & DirectPaneProps['requestTarget']
  roomKey: HomeStartupPaneProps['roomKey']
  session?: (MobileRoomSessionPreview & { messages: HomeChatPaneProps['messages'] }) | null
  showAdvancedJoin: HomeStartupPaneProps['showAdvancedJoin']
  styles: MobileStyles
  theme: MobileTheme
  transportDebug?: TransportDebugLabelState | null
  treeholeCanInteract: boolean
  treeholeCanPost: boolean
  treeholeDraft: string
  treeholePosts: TreeholePaneProps['posts'] & PeoplePaneProps['treeholePosts']
  treeholeStatus: TreeholePaneProps['status']
  trustAlias?: string
  trustQrUri: string
}

export function ChatRoom({
  activeTab,
  activeHomeOwnerProfileId,
  blockedContacts,
  canJoin,
  contactProfileTargetId,
  directRoomEndpoint,
  draft,
  dmDraft,
  dmContactOptions,
  dmMessages,
  dmRecipient,
  dmThreads,
  homeQrUri,
  localAvatarUri,
  myHomeQrUri,
  nick,
  onAcceptRequest,
  onAllowContactRequests,
  onChooseLocalAvatarImage,
  onContactProfileTargetChange,
  onCreateRoom,
  onDraftChange,
  onDirectRoomEndpointChange,
  onDmDraftChange,
  onDmRecipientChange,
  onHomeQrChange,
  onIgnoreRequest,
  onJoinHomeQr,
  onJoinRoom,
  onEnterContactHome,
  onLocalAvatarUriChange,
  onMarkThreadRead,
  onNickChange,
  onLeave,
  onRevokeContact,
  onRetryOutgoingRequest,
  onRoomKeyChange,
  onScanHomeQr,
  onScanProfileQr,
  onSend,
  onSendDm,
  onTabChange,
  onToggleAdvancedJoin,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  onTreeholeComment,
  onTreeholeDraftChange,
  onTreeholeLike,
  onTreeholePost,
  outgoingRequests,
  pendingRequests,
  profileId,
  profileReady,
  profileQrUri,
  profileRequestTarget,
  profileRecentPostCache,
  lastError,
  roomKey,
  session,
  showAdvancedJoin,
  styles,
  theme,
  transportDebug,
  treeholeCanInteract,
  treeholeCanPost,
  treeholeDraft,
  treeholePosts,
  treeholeStatus,
  trustAlias,
  trustQrUri
}: ChatRoomProps) {
  const [showRoomAdvanced, setShowRoomAdvanced] = useState(false)
  const roomShort = getMobileRoomKeyPreview(session)
  const roomSurface = getMobileRoomSurface(activeTab)
  const tabBadges = getMobileTabBadges({ dmMessages, outgoingRequests, pendingRequests })
  const homeOwner = createHomeOwnerViewModel({
    contacts: dmContactOptions,
    localProfileId: profileId,
    ownerProfileId: activeHomeOwnerProfileId,
    shortenProfileId
  })

  return (
    <View style={styles.chat}>
      <View style={styles.roomBar}>
        <View style={styles.sessionStrip}>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>Current space</Text>
          </View>
          <Text style={styles.roomName}>{roomSurface}</Text>
          <Text style={styles.roomOwnerName}>{session ? homeOwner.title : 'This device'}</Text>
          <Text style={styles.roomOwnerMeta}>
            {session ? homeOwner.subtitle : 'Home is offline'}
          </Text>
        </View>
        <View style={styles.roomActions}>
          {session && homeOwner.canOpenProfile ? (
            <MobileIconButton
              accentColor={theme.accentStrong}
              accessibilityLabel={`Open ${homeOwner.title} owner profile`}
              icon={User}
              onPress={() => {
                onContactProfileTargetChange(homeOwner.ownerProfileId)
                onTabChange('people')
              }}
              styles={styles}
              testID='home-owner-profile-button'
            />
          ) : null}
          <MobileAdvancedToggle
            expanded={showRoomAdvanced}
            iconColor={theme.inkSoft}
            onPress={() => setShowRoomAdvanced((value) => !value)}
            styles={styles}
            testID='room-advanced-toggle'
          />
          {session ? (
            <MobileIconButton
              accentColor={theme.accentStrong}
              accessibilityLabel='Leave home'
              icon={LogOut}
              onPress={onLeave}
              styles={styles}
              testID='leave-home-button'
            />
          ) : null}
        </View>
      </View>
      {showRoomAdvanced ? (
        <View style={styles.roomAdvancedPanel}>
          <Text style={styles.roomLabel}>Home key</Text>
          <Text style={styles.roomKey} testID='room-home-address'>
            {roomShort}
          </Text>
          <Text style={styles.roomLabel}>Error detail</Text>
          <Text style={styles.roomKey} testID='room-error-detail'>
            {lastError || 'none'}
          </Text>
          <Text style={styles.roomLabel}>Transport</Text>
          <Text style={styles.roomKey} testID='room-transport-debug'>
            {formatTransportDebugLabel(transportDebug, { includeDirectReady: true })}
          </Text>
        </View>
      ) : null}

      <View style={styles.roomContent}>
        {activeTab === 'chat' ? (
          !session ? (
            <HomeStartupPane
              canJoin={canJoin}
              directRoomEndpoint={directRoomEndpoint}
              localAvatarUri={localAvatarUri}
              nick={nick}
              onChooseLocalAvatarImage={onChooseLocalAvatarImage}
              onCreateRoom={onCreateRoom}
              onDirectRoomEndpointChange={onDirectRoomEndpointChange}
              onJoinRoom={onJoinRoom}
              onLocalAvatarUriChange={onLocalAvatarUriChange}
              onNickChange={onNickChange}
              onOpenContacts={() => onTabChange('people')}
              onRoomKeyChange={onRoomKeyChange}
              onToggleAdvancedJoin={onToggleAdvancedJoin}
              profileQrUri={profileQrUri}
              profileReady={profileReady}
              roomKey={roomKey}
              showAdvancedJoin={showAdvancedJoin}
              styles={styles}
              theme={theme}
            />
          ) : (
            <HomeChatPane
              draft={draft}
              messages={session.messages}
              onDraftChange={onDraftChange}
              onSend={onSend}
              styles={styles}
              theme={theme}
            />
          )
        ) : activeTab === 'dm' ? (
          <DirectPane
            draft={dmDraft}
            contactOptions={dmContactOptions}
            messages={dmMessages}
            onAcceptRequest={onAcceptRequest}
            onDraftChange={onDmDraftChange}
            onIgnoreRequest={onIgnoreRequest}
            onMarkThreadRead={onMarkThreadRead}
            onOpenPeople={() => onTabChange('people')}
            onOpenProfile={(contactProfileId) => {
              onContactProfileTargetChange(contactProfileId)
              onTabChange('people')
            }}
            onRecipientChange={onDmRecipientChange}
            onSend={onSendDm}
            outgoingRequests={outgoingRequests}
            ownerProfileId={profileId}
            pendingRequests={pendingRequests}
            requestTarget={profileRequestTarget}
            recipient={dmRecipient}
            styles={styles}
            theme={theme}
            threads={dmThreads}
          />
        ) : activeTab === 'treehole' ? (
          <TreeholePane
            canInteract={treeholeCanInteract}
            canPost={treeholeCanPost}
            draft={treeholeDraft}
            onComment={onTreeholeComment}
            onDraftChange={onTreeholeDraftChange}
            onLike={onTreeholeLike}
            onPost={onTreeholePost}
            posts={treeholePosts}
            status={treeholeStatus}
            styles={styles}
            theme={theme}
          />
        ) : (
          <PeoplePane
            canJoinHome={!session}
            homeQrUri={homeQrUri}
            myHomeQrUri={myHomeQrUri}
            onAcceptRequest={onAcceptRequest}
            onHomeQrChange={onHomeQrChange}
            onAllowContactRequests={onAllowContactRequests}
            onIgnoreRequest={onIgnoreRequest}
            onJoinHomeQr={onJoinHomeQr}
            onEnterContactHome={onEnterContactHome}
            onMessageContact={(profileId) => {
              onDmRecipientChange(profileId)
              onTabChange('dm')
            }}
            onRevokeContact={onRevokeContact}
            onRetryOutgoingRequest={onRetryOutgoingRequest}
            onScanHomeQr={onScanHomeQr}
            onScanProfileQr={onScanProfileQr}
            onTrustAliasChange={onTrustAliasChange}
            onTrustProfile={onTrustProfile}
            onTrustQrChange={onTrustQrChange}
            outgoingRequests={outgoingRequests}
            pendingRequests={pendingRequests}
            profileRequestTarget={profileRequestTarget}
            profileId={profileId}
            profileReady={profileReady}
            profileQrUri={profileQrUri}
            activeHomeOwnerProfileId={activeHomeOwnerProfileId}
            selectedProfileId={contactProfileTargetId}
            onSelectedProfileChange={onContactProfileTargetChange}
            treeholePosts={treeholePosts}
            profileRecentPostCache={profileRecentPostCache}
            styles={styles}
            theme={theme}
            trustAlias={trustAlias}
            blockedContacts={blockedContacts}
            trustedContacts={dmContactOptions.map(toPeopleContact)}
            trustQrUri={trustQrUri}
          />
        )}
      </View>

      <View style={styles.tabs}>
        {productSurfaceTabs.map((surface) => (
          <TabButton
            key={surface.id}
            active={activeTab === surface.id}
            badgeCount={getMobileSurfaceBadgeCount(surface.id, tabBadges)}
            icon={MOBILE_TAB_ICONS[surface.id]}
            iconColor={theme.iconMuted}
            label={surface.label}
            onPress={() => onTabChange(surface.id)}
            selectedIconColor={theme.surface}
            styles={styles}
            testID={MOBILE_TAB_TEST_IDS[surface.id]}
          />
        ))}
      </View>
    </View>
  )
}

function getMobileSurfaceBadgeCount(
  surfaceId: ProductSurfaceId,
  tabBadges: ReturnType<typeof getMobileTabBadges>
): number {
  if (surfaceId === 'dm') return tabBadges.direct
  if (surfaceId === 'people') return tabBadges.people
  return 0
}

function toPeopleContact(contact: DirectPaneProps['contactOptions'][number]) {
  return {
    ...contact,
    avatarUriSnapshot: contact.avatarUriSnapshot || undefined,
    displayNameSnapshot: contact.displayNameSnapshot || undefined
  }
}
