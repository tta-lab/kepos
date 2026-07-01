import { useState } from 'react'
import { Text, View } from 'react-native'
import { House, LogOut, Send, Sprout, User, Users } from 'lucide-react-native'
import { createHomeOwnerViewModel } from '../src/home-owner-view-model.ts'
import { getProductSurfaceLabel } from '../src/product-surfaces.ts'
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
} from './action-components.js'
import { DirectPane, type DirectPaneProps } from './direct-components.js'
import { HomeChatPane, type HomeChatPaneProps } from './message-components.js'
import { PeoplePane, type PeoplePaneProps } from './people-components.js'
import { TabButton, type TabButtonProps } from './tab-components.js'
import { TreeholePane, type TreeholePaneProps } from './treehole-components.js'

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

export type ChatRoomProps = {
  activeHomeOwnerProfileId?: string
  activeTab: string
  blockedContacts?: PeoplePaneProps['blockedContacts']
  contactProfileTargetId?: string | null
  draft: string
  dmContactOptions: DirectPaneProps['contactOptions']
  dmDraft: string
  dmMessages: DirectPaneProps['messages']
  dmRecipient: string
  dmThreads: DirectPaneProps['threads']
  homeQrUri: string
  lastError?: string
  myHomeQrUri: string
  onAcceptRequest: PeoplePaneProps['onAcceptRequest'] & DirectPaneProps['onAcceptRequest']
  onAllowContactRequests: PeoplePaneProps['onAllowContactRequests']
  onContactProfileTargetChange(profileId: string | null): void
  onDmDraftChange(value: string): void
  onDmRecipientChange(profileId: string): void
  onDraftChange(value: string): void
  onEnterContactHome: PeoplePaneProps['onEnterContactHome']
  onHomeQrChange(value: string): void
  onIgnoreRequest: PeoplePaneProps['onIgnoreRequest'] & DirectPaneProps['onIgnoreRequest']
  onJoinHomeQr(): void
  onLeave(): void
  onMarkThreadRead(profileId: string): void
  onRevokeContact: PeoplePaneProps['onRevokeContact']
  onScanHomeQr(): void
  onScanProfileQr(): void
  onSend(): void
  onSendDm(): void
  onTabChange(tab: string): void
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
  session: MobileRoomSessionPreview & { messages: HomeChatPaneProps['messages'] }
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
  contactProfileTargetId,
  draft,
  dmDraft,
  dmContactOptions,
  dmMessages,
  dmRecipient,
  dmThreads,
  homeQrUri,
  myHomeQrUri,
  onAcceptRequest,
  onAllowContactRequests,
  onContactProfileTargetChange,
  onDraftChange,
  onDmDraftChange,
  onDmRecipientChange,
  onHomeQrChange,
  onIgnoreRequest,
  onJoinHomeQr,
  onEnterContactHome,
  onMarkThreadRead,
  onLeave,
  onRevokeContact,
  onScanHomeQr,
  onScanProfileQr,
  onSend,
  onSendDm,
  onTabChange,
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
  session,
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
          <Text style={styles.roomOwnerName}>{homeOwner.title}</Text>
          <Text style={styles.roomOwnerMeta}>{homeOwner.subtitle}</Text>
        </View>
        <View style={styles.roomActions}>
          {homeOwner.canOpenProfile ? (
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
          <MobileIconButton
            accentColor={theme.accentStrong}
            accessibilityLabel='Leave home'
            icon={LogOut}
            onPress={onLeave}
            styles={styles}
            testID='leave-home-button'
          />
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
          <HomeChatPane
            draft={draft}
            messages={session.messages}
            onDraftChange={onDraftChange}
            onSend={onSend}
            styles={styles}
            theme={theme}
          />
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
        <TabButton
          active={activeTab === 'chat'}
          icon={House}
          iconColor={theme.iconMuted}
          label={getProductSurfaceLabel('chat')}
          onPress={() => onTabChange('chat')}
          selectedIconColor={theme.surface}
          styles={styles}
          testID='chat-tab'
        />
        <TabButton
          active={activeTab === 'dm'}
          badgeCount={tabBadges.direct}
          icon={Send}
          iconColor={theme.iconMuted}
          label={getProductSurfaceLabel('dm')}
          onPress={() => onTabChange('dm')}
          selectedIconColor={theme.surface}
          styles={styles}
          testID='dm-tab'
        />
        <TabButton
          active={activeTab === 'people'}
          badgeCount={tabBadges.people}
          icon={Users}
          iconColor={theme.iconMuted}
          label={getProductSurfaceLabel('people')}
          onPress={() => onTabChange('people')}
          selectedIconColor={theme.surface}
          styles={styles}
          testID='people-tab'
        />
        <TabButton
          active={activeTab === 'treehole'}
          icon={Sprout}
          iconColor={theme.iconMuted}
          label={getProductSurfaceLabel('treehole')}
          onPress={() => onTabChange('treehole')}
          selectedIconColor={theme.surface}
          styles={styles}
          testID='treehole-tab'
        />
      </View>
    </View>
  )
}

function toPeopleContact(contact: DirectPaneProps['contactOptions'][number]) {
  return {
    ...contact,
    avatarUriSnapshot: contact.avatarUriSnapshot || undefined,
    displayNameSnapshot: contact.displayNameSnapshot || undefined
  }
}
