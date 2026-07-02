import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Pressable, Text, View } from 'react-native'
import { Plus, User, Users } from 'lucide-react-native'
import { createDmThreadListView, type DmThreadListViewItem } from '../src/dm-thread-list.ts'
import type { ResolveAvatarMediaUri } from '../src/profile-avatar-view-model.ts'
import {
  MobileActionButton,
  MobileRequestActionButton,
  MobileSmallActionButton,
  type MobileActionButtonStyles,
  type MobileRequestActionButtonStyles,
  type MobileSmallActionButtonStyles
} from './action-components.tsx'
import { PanelEmptyState, type PanelEmptyStateStyles } from './panel-components.tsx'
import { MobileProfileAvatar, type MobileProfileAvatarStyles } from './profile-components.tsx'

export type MessageThreadContact = {
  alias?: string
  avatarUriSnapshot?: string
  displayNameSnapshot?: string
  profileId: string
}

export type MessageThreadMessage = {
  at?: unknown
  direction?: unknown
  fromProfileId?: unknown
  id?: unknown
  text?: unknown
  toProfileId?: unknown
  type?: unknown
}

export type MessageThreadSnapshot = {
  acceptedAt?: unknown
  createdAt?: unknown
  lastReadAt?: unknown
  remoteProfileId?: unknown
  requestedAt?: unknown
  revokedAt?: unknown
  state?: unknown
  threadId?: unknown
}

export type MessageThreadStyles = MobileActionButtonStyles &
  MobileProfileAvatarStyles &
  MobileRequestActionButtonStyles &
  MobileSmallActionButtonStyles &
  PanelEmptyStateStyles & {
    activeThreadRow: StyleProp<ViewStyle>
    activeThreadText: StyleProp<TextStyle>
    directThreadEyebrow: StyleProp<TextStyle>
    directThreadHeader: StyleProp<ViewStyle>
    directThreadHeaderText: StyleProp<ViewStyle>
    directThreadMeta: StyleProp<TextStyle>
    directThreadTitle: StyleProp<TextStyle>
    threadList: StyleProp<ViewStyle>
    threadListTitle: StyleProp<TextStyle>
    threadMeta: StyleProp<TextStyle>
    threadMetaCluster: StyleProp<ViewStyle>
    threadName: StyleProp<TextStyle>
    threadRequestActions: StyleProp<ViewStyle>
    threadRow: StyleProp<ViewStyle>
    threadRowHeader: StyleProp<ViewStyle>
    threadStatus: StyleProp<TextStyle>
    threadText: StyleProp<ViewStyle>
    threadTime: StyleProp<TextStyle>
    threadUnreadBadge: StyleProp<TextStyle>
  }

export type MessageThreadTheme = {
  accentStrong: string
  danger: string
  iconMuted: string
  inkSoft: string
  placeholder: string
  surface: string
}

export type MessageThreadListProps = {
  contacts: MessageThreadContact[]
  messages: MessageThreadMessage[]
  onAcceptRequest(message: MessageThreadMessage): Promise<unknown>
  onIgnoreRequest(message: MessageThreadMessage): Promise<unknown>
  onMarkThreadRead(profileId: string): void
  onOpenPeople(): void
  onOpenProfile(profileId: string): void
  onSelectThread(profileId: string): void
  outgoingRequests?: {
    alias?: string | null
    deliveryState?: string | null
    profileId: string
    requestedAt?: number
    requestId?: string | null
    text?: string | null
  }[]
  ownerProfileId?: string | null
  pendingRequests?: {
    alias?: string | null
    deliveryState?: string | null
    profileId: string
    requestedAt?: number
    requestId?: string | null
    senderEncryptionPublicKey?: string | null
    text?: string | null
  }[]
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  selectedProfileId?: string
  shortenProfileId(profileId: string): string
  styles: MessageThreadStyles
  theme: MessageThreadTheme
  threads: MessageThreadSnapshot[]
}

export function MessageThreadList({
  contacts,
  messages,
  onAcceptRequest,
  onIgnoreRequest,
  onMarkThreadRead,
  onOpenPeople,
  onOpenProfile,
  onSelectThread,
  outgoingRequests,
  ownerProfileId,
  pendingRequests,
  resolveAvatarMediaUri = null,
  selectedProfileId,
  shortenProfileId,
  styles,
  theme,
  threads
}: MessageThreadListProps) {
  const activeThreads = createDmThreadListView({
    contacts,
    formatTime: formatMobileThreadTime,
    messages,
    outgoingRequests,
    ownerProfileId: ownerProfileId || '',
    pendingRequests,
    resolveAvatarMediaUri,
    shortenProfileId,
    threads
  })

  if (activeThreads.length === 0) {
    return (
      <View style={styles.threadList} testID='message-thread-empty'>
        <PanelEmptyState
          copy='Open Contacts to scan a profile or accept a friend request.'
          icon={Users}
          iconColor={theme.iconMuted}
          styles={styles}
          title='No message threads yet'
        />
        <MobileActionButton
          accentColor={theme.accentStrong}
          disabledContentColor={theme.placeholder}
          primaryContentColor={theme.surface}
          styles={styles}
          icon={Plus}
          label='Open Contacts'
          onPress={onOpenPeople}
          testID='message-thread-open-contacts-button'
        />
      </View>
    )
  }

  return (
    <View style={styles.threadList} testID='message-thread-list'>
      <Text style={styles.threadListTitle}>Threads</Text>
      {activeThreads.map((thread) => (
        <ThreadRow
          key={String(thread.threadId)}
          onAcceptRequest={onAcceptRequest}
          onIgnoreRequest={onIgnoreRequest}
          onMarkThreadRead={onMarkThreadRead}
          onOpenProfile={onOpenProfile}
          onSelectThread={onSelectThread}
          selected={thread.profileId === selectedProfileId}
          styles={styles}
          theme={theme}
          thread={thread}
        />
      ))}
    </View>
  )
}

function ThreadRow({
  onAcceptRequest,
  onIgnoreRequest,
  onMarkThreadRead,
  onOpenProfile,
  onSelectThread,
  selected,
  styles,
  theme,
  thread
}: {
  onAcceptRequest(message: MessageThreadMessage): Promise<unknown>
  onIgnoreRequest(message: MessageThreadMessage): Promise<unknown>
  onMarkThreadRead(profileId: string): void
  onOpenProfile(profileId: string): void
  onSelectThread(profileId: string): void
  selected: boolean
  styles: MessageThreadStyles
  theme: MessageThreadTheme
  thread: DmThreadListViewItem
}) {
  const requestActions = thread.requestActions
  const unreadCount = Number.isSafeInteger(thread.unreadCount) ? thread.unreadCount : 0

  return (
    <Pressable
      accessibilityLabel={`Open message thread ${thread.label}`}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      onPress={() => {
        onSelectThread(thread.profileId)
        onMarkThreadRead(thread.profileId)
      }}
      style={[styles.threadRow, selected && styles.activeThreadRow]}
      testID='message-thread-row'
    >
      <MobileProfileAvatar avatar={thread.avatar} styles={styles} />
      <View style={styles.threadText}>
        <View style={styles.threadRowHeader}>
          <Text numberOfLines={1} style={[styles.threadName, selected && styles.activeThreadText]}>
            {thread.label}
          </Text>
          <View style={styles.threadMetaCluster}>
            {unreadCount > 0 ? (
              <Text
                accessibilityLabel={`${thread.label} ${thread.unreadLabel}`}
                style={styles.threadUnreadBadge}
              >
                {thread.unreadLabel}
              </Text>
            ) : null}
            <Text style={[styles.threadTime, selected && styles.activeThreadText]}>
              {thread.timeLabel}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.threadMeta, selected && styles.activeThreadText]}>
          {thread.preview}
        </Text>
        <Text style={[styles.threadStatus, selected && styles.activeThreadText]}>
          {thread.statusLabel}
        </Text>
      </View>
      <MobileSmallActionButton
        accentColor={theme.accentStrong}
        dangerColor={theme.danger}
        styles={styles}
        accessibilityLabel={`Open ${thread.label} profile`}
        icon={User}
        label='Profile'
        onPress={() => onOpenProfile(thread.profileId)}
      />
      {requestActions ? (
        <View style={styles.threadRequestActions}>
          <MobileRequestActionButton
            acceptContentColor={theme.surface}
            ignoreContentColor={theme.inkSoft}
            onPress={() => {
              onIgnoreRequest(requestActions.ignoreMessage).catch(() => {})
            }}
            styles={styles}
            testID='thread-message-request-ignore-button'
            variant='ignore'
          />
          <MobileRequestActionButton
            acceptContentColor={theme.surface}
            ignoreContentColor={theme.inkSoft}
            onPress={() => {
              onAcceptRequest(requestActions.acceptMessage).catch(() => {})
            }}
            styles={styles}
            testID='thread-message-request-accept-button'
            variant='accept'
          />
        </View>
      ) : null}
    </Pressable>
  )
}

export type DirectThreadHeaderProps = {
  onOpenProfile(profileId: string): void
  styles: MessageThreadStyles
  theme: MessageThreadTheme
  thread?: DmThreadListViewItem | null
}

export function DirectThreadHeader({
  onOpenProfile,
  styles,
  theme,
  thread
}: DirectThreadHeaderProps) {
  if (!thread) return null

  return (
    <View
      accessibilityLabel={`Current message thread ${thread.label}`}
      style={styles.directThreadHeader}
      testID='direct-thread-header'
    >
      <MobileProfileAvatar avatar={thread.avatar} styles={styles} />
      <View style={styles.directThreadHeaderText}>
        <Text style={styles.directThreadEyebrow}>Current thread</Text>
        <Text numberOfLines={1} style={styles.directThreadTitle}>
          {thread.label}
        </Text>
        <Text style={styles.directThreadMeta}>{thread.statusLabel}</Text>
      </View>
      <MobileSmallActionButton
        accentColor={theme.accentStrong}
        dangerColor={theme.danger}
        styles={styles}
        accessibilityLabel={`Open ${thread.label} profile`}
        icon={User}
        label='Profile'
        onPress={() => onOpenProfile(thread.profileId)}
      />
    </View>
  )
}

export function formatMobileThreadTime(value: number) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}
