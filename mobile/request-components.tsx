import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Text, View } from 'react-native'
import { MessageCircle, Send, User } from 'lucide-react-native'
import {
  formatMessageRequestSubtitle,
  formatMessageRequestTitle,
  formatOutgoingRequestTitle,
  formatRequestPreview
} from '../src/mobile-product-copy.ts'
import { formatProfileFriendRequestDeliveryState } from '../src/profile-friend-request-transport.ts'
import {
  MobileSmallActionButton,
  MobileRequestActionButton,
  type MobileRequestActionButtonStyles,
  type MobileSmallActionButtonStyles
} from './action-components.tsx'
import { PanelEmptyState, TaskHeader, type PanelEmptyStateStyles } from './panel-components.tsx'

export type RequestManagerStyles = MobileRequestActionButtonStyles &
  MobileSmallActionButtonStyles &
  PanelEmptyStateStyles & {
    contactProfile: StyleProp<TextStyle>
    panel: StyleProp<ViewStyle>
    requestActions: StyleProp<ViewStyle>
    requestCard: StyleProp<ViewStyle>
    requestPreview: StyleProp<TextStyle>
    requestText: StyleProp<ViewStyle>
    requestTitle: StyleProp<TextStyle>
    trustMeta: StyleProp<ViewStyle>
    trustStatus: StyleProp<TextStyle>
  }

export type RequestManagerTheme = {
  accentStrong: string
  danger: string
  iconMuted: string
  inkSoft: string
  surface: string
}

export type OutgoingFriendRequest = {
  alias?: string | null
  avatarUriSnapshot?: string | null
  deliveryState?: string | null
  displayNameSnapshot?: string | null
  profileId: string
  requestedAt?: number
  text?: string | null
}

export type IncomingFriendRequest = OutgoingFriendRequest & {
  requestId?: string | null
  requestedAt?: number
  senderEncryptionPublicKey?: string | null
}

export type OutgoingRequestManagerProps = {
  onOpenProfile?(profileId: string): void
  outgoingRequests?: OutgoingFriendRequest[]
  styles: RequestManagerStyles
  theme: RequestManagerTheme
}

export function OutgoingRequestManager({
  onOpenProfile,
  outgoingRequests,
  styles,
  theme
}: OutgoingRequestManagerProps) {
  return (
    <View style={styles.panel}>
      <TaskHeader
        description='Friend requests you send stay here until accepted.'
        eyebrow='Sent'
        styles={styles}
        title='Sent requests'
      />
      {!outgoingRequests?.length ? (
        <PanelEmptyState
          copy='Friend requests you send will stay here until accepted.'
          icon={Send}
          iconColor={theme.iconMuted}
          styles={styles}
          title='No sent requests'
        />
      ) : null}
      {(outgoingRequests || []).map((request) => (
        <View key={request.profileId} style={styles.requestCard}>
          <View style={styles.requestText}>
            <Text style={styles.requestTitle}>{formatOutgoingRequestTitle(request)}</Text>
            <Text style={styles.contactProfile}>{formatMessageRequestSubtitle(request)}</Text>
            <Text style={styles.requestPreview}>{formatRequestPreview(request.text)}</Text>
          </View>
          <View style={styles.trustMeta}>
            <Text style={styles.trustStatus}>
              {formatProfileFriendRequestDeliveryState(request.deliveryState)}
            </Text>
            {onOpenProfile ? (
              <MobileSmallActionButton
                accentColor={theme.accentStrong}
                dangerColor={theme.danger}
                styles={styles}
                accessibilityLabel={`Open ${formatOutgoingRequestTitle(request)} profile`}
                icon={User}
                label='Profile'
                onPress={() => onOpenProfile(request.profileId)}
                testID='people-outgoing-request-profile-button'
              />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

export type MessageRequestManagerProps = {
  onAcceptRequest(request: {
    createdAt?: number
    fromProfileId: string
    requestId: string
    senderEncryptionPublicKey: string
    text?: string | null
    toProfileId: string
    type: 'kepos.message.request.v1'
  }): void
  onIgnoreRequest(request: IncomingFriendRequest): void
  onOpenProfile?(profileId: string): void
  pendingRequests?: IncomingFriendRequest[]
  profileId?: string | null
  styles: RequestManagerStyles
  theme: RequestManagerTheme
}

export function MessageRequestManager({
  onAcceptRequest,
  onIgnoreRequest,
  onOpenProfile,
  pendingRequests,
  profileId,
  styles,
  theme
}: MessageRequestManagerProps) {
  return (
    <View style={styles.panel}>
      <TaskHeader
        description='Accept only contacts you want to message privately.'
        eyebrow='Requests'
        styles={styles}
        title='Friend requests'
      />
      {!pendingRequests?.length ? (
        <PanelEmptyState
          copy='Friend requests you receive will appear here.'
          icon={MessageCircle}
          iconColor={theme.iconMuted}
          styles={styles}
          title='No friend requests'
        />
      ) : null}
      {(pendingRequests || []).map((request) => {
        const canAccept = Boolean(
          profileId && request.requestId && request.senderEncryptionPublicKey
        )

        return (
          <View key={request.profileId} style={styles.requestCard}>
            <View style={styles.requestText}>
              <Text style={styles.requestTitle}>{formatMessageRequestTitle(request)}</Text>
              <Text style={styles.contactProfile}>{formatMessageRequestSubtitle(request)}</Text>
              <Text style={styles.requestPreview}>{formatRequestPreview(request.text)}</Text>
            </View>
            <View style={styles.requestActions}>
              {onOpenProfile ? (
                <MobileSmallActionButton
                  accentColor={theme.accentStrong}
                  dangerColor={theme.danger}
                  styles={styles}
                  accessibilityLabel={`Open ${formatMessageRequestTitle(request)} profile`}
                  icon={User}
                  label='Profile'
                  onPress={() => onOpenProfile(request.profileId)}
                  testID='people-message-request-profile-button'
                />
              ) : null}
              <MobileRequestActionButton
                acceptContentColor={theme.surface}
                ignoreContentColor={theme.inkSoft}
                onPress={() => onIgnoreRequest(request)}
                styles={styles}
                testID='people-message-request-ignore-button'
                variant='ignore'
              />
              <MobileRequestActionButton
                acceptContentColor={theme.surface}
                disabled={!canAccept}
                ignoreContentColor={theme.inkSoft}
                onPress={() =>
                  onAcceptRequest({
                    createdAt: request.requestedAt,
                    fromProfileId: request.profileId,
                    requestId: request.requestId || '',
                    senderEncryptionPublicKey: request.senderEncryptionPublicKey || '',
                    text: request.text,
                    toProfileId: profileId || '',
                    type: 'kepos.message.request.v1'
                  })
                }
                styles={styles}
                testID='people-message-request-accept-button'
                variant='accept'
              />
            </View>
          </View>
        )
      })}
    </View>
  )
}
