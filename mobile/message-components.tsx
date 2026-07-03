import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { FlatList, Text, TextInput, View } from 'react-native'
import { createMobileDirectMessageAvatar } from '../src/mobile-avatar-view-model.ts'
import {
  formatMobileDirectMessageMeta,
  formatMobileHomeMessageMeta
} from '../src/mobile-product-copy.ts'
import type { ResolveAvatarMediaUri } from '../src/profile-avatar-view-model.ts'
import { createTextComposerState } from '../src/text-composer-state.ts'
import {
  MobileSendButton,
  MobileRequestActionButton,
  type MobileRequestActionButtonStyles,
  type MobileSendButtonStyles
} from './action-components.tsx'
import { EmptyMessages, type EmptyStateStyles, type EmptyStateTheme } from './empty-components.tsx'
import { PaneLabel, type PaneLabelProps } from './panel-components.tsx'
import { MobileProfileAvatar, type MobileProfileAvatarStyles } from './profile-components.tsx'

export type MobileBubbleMessage = {
  direction?: string
  id?: string
  nick?: string
  text?: string
  type?: string
}

export type HomeChatPaneMessage = MobileBubbleMessage & {
  id: string
}

export type HomeChatPaneStyles = EmptyStateStyles &
  MessageBubbleStyles &
  MobileSendButtonStyles &
  PaneLabelProps['styles'] & {
    composer: StyleProp<ViewStyle>
    messageInput: StyleProp<TextStyle>
    messageList: StyleProp<ViewStyle>
  }

export type HomeChatPaneTheme = EmptyStateTheme & {
  placeholder: string
  surface: string
}

export type HomeChatPaneProps = {
  draft: string
  messages: HomeChatPaneMessage[]
  onDraftChange(value: string): void
  onSend(): void
  styles: HomeChatPaneStyles
  theme: HomeChatPaneTheme
}

export function HomeChatPane({
  draft,
  messages,
  onDraftChange,
  onSend,
  styles,
  theme
}: HomeChatPaneProps) {
  const composerState = createTextComposerState({ draft })

  return (
    <>
      <PaneLabel eyebrow='live' styles={styles} title='Live home chat' />
      <FlatList
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyMessages styles={styles} theme={theme} />}
        renderItem={({ item }) => <MessageBubble message={item} styles={styles} />}
      />

      <View style={styles.composer}>
        <TextInput
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          placeholder='Write to the home'
          placeholderTextColor={theme.placeholder}
          returnKeyType='send'
          style={styles.messageInput}
          testID='chat-message-input'
          value={draft}
        />
        <MobileSendButton
          accessibilityLabel='Send home message'
          disabled={!composerState.canSubmit}
          onPress={onSend}
          styles={styles}
          surfaceColor={theme.surface}
          testID='chat-send-button'
        />
      </View>
    </>
  )
}

export type DirectBubbleContact = {
  alias?: string
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
  avatarUriSnapshot?: string | null
  displayNameSnapshot?: string | null
  profileId: string
}

export type DirectBubbleStyles = MobileProfileAvatarStyles &
  MobileRequestActionButtonStyles & {
    bubble: StyleProp<ViewStyle>
    bubbleMeta: StyleProp<TextStyle>
    bubbleMetaRow: StyleProp<ViewStyle>
    bubbleText: StyleProp<TextStyle>
    bubbleTextBlock: StyleProp<ViewStyle>
    directBubble: StyleProp<ViewStyle>
    directBubbleRow: StyleProp<ViewStyle>
    inBubble: StyleProp<ViewStyle>
    inBubbleMeta: StyleProp<TextStyle>
    inBubbleText: StyleProp<TextStyle>
    inBubbleTextBlock: StyleProp<ViewStyle>
    outBubble: StyleProp<ViewStyle>
    outBubbleTextBlock: StyleProp<ViewStyle>
    outDirectBubbleRow: StyleProp<ViewStyle>
    requestActions: StyleProp<ViewStyle>
  }

export type DirectBubbleProps = {
  acceptContentColor: string
  contacts: DirectBubbleContact[]
  ignoreContentColor: string
  message: MobileBubbleMessage
  onAcceptRequest(message: MobileBubbleMessage): Promise<unknown>
  onIgnoreRequest(message: MobileBubbleMessage): Promise<unknown>
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  styles: DirectBubbleStyles
}

export function DirectBubble({
  acceptContentColor,
  contacts,
  ignoreContentColor,
  message,
  onAcceptRequest,
  onIgnoreRequest,
  resolveAvatarMediaUri = null,
  styles
}: DirectBubbleProps) {
  const outgoing = message.direction === 'out'
  const isRequest = message.type === 'kepos.message.request.v1'
  const avatar = createMobileDirectMessageAvatar(message, contacts, resolveAvatarMediaUri)

  return (
    <View style={[styles.directBubbleRow, outgoing && styles.outDirectBubbleRow]}>
      <MobileProfileAvatar avatar={avatar} styles={styles} />
      <View
        style={[styles.bubble, styles.directBubble, outgoing ? styles.outBubble : styles.inBubble]}
      >
        <View style={styles.bubbleMetaRow}>
          <Text style={[styles.bubbleMeta, !outgoing && styles.inBubbleMeta]}>
            {formatMobileDirectMessageMeta(message, contacts)}
          </Text>
        </View>
        <View
          style={[
            styles.bubbleTextBlock,
            outgoing ? styles.outBubbleTextBlock : styles.inBubbleTextBlock
          ]}
        >
          <Text style={[styles.bubbleText, !outgoing && styles.inBubbleText]}>{message.text}</Text>
        </View>
        {isRequest && !outgoing ? (
          <View style={styles.requestActions}>
            <MobileRequestActionButton
              acceptContentColor={acceptContentColor}
              ignoreContentColor={ignoreContentColor}
              onPress={() => {
                onIgnoreRequest(message).catch(() => {})
              }}
              styles={styles}
              testID='message-request-ignore-button'
              variant='ignore'
            />
            <MobileRequestActionButton
              acceptContentColor={acceptContentColor}
              ignoreContentColor={ignoreContentColor}
              onPress={() => {
                onAcceptRequest(message).catch(() => {})
              }}
              styles={styles}
              testID='message-request-accept-button'
              variant='accept'
            />
          </View>
        ) : null}
      </View>
    </View>
  )
}

export type MessageBubbleStyles = {
  bubble: StyleProp<ViewStyle>
  bubbleMeta: StyleProp<TextStyle>
  bubbleMetaRow: StyleProp<ViewStyle>
  bubbleText: StyleProp<TextStyle>
  bubbleTextBlock: StyleProp<ViewStyle>
  inBubble: StyleProp<ViewStyle>
  inBubbleMeta: StyleProp<TextStyle>
  inBubbleText: StyleProp<TextStyle>
  inBubbleTextBlock: StyleProp<ViewStyle>
  outBubble: StyleProp<ViewStyle>
  outBubbleTextBlock: StyleProp<ViewStyle>
}

export type MessageBubbleProps = {
  message: MobileBubbleMessage
  styles: MessageBubbleStyles
}

export function MessageBubble({ message, styles }: MessageBubbleProps) {
  const outgoing = message.direction === 'out'

  return (
    <View style={[styles.bubble, outgoing ? styles.outBubble : styles.inBubble]}>
      <View style={styles.bubbleMetaRow}>
        <Text style={[styles.bubbleMeta, !outgoing && styles.inBubbleMeta]}>
          {formatMobileHomeMessageMeta(message)}
        </Text>
      </View>
      <View
        style={[
          styles.bubbleTextBlock,
          outgoing ? styles.outBubbleTextBlock : styles.inBubbleTextBlock
        ]}
      >
        <Text style={[styles.bubbleText, !outgoing && styles.inBubbleText]}>{message.text}</Text>
      </View>
    </View>
  )
}
