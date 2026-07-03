import { useState } from 'react'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { FlatList, ScrollView, TextInput, View } from 'react-native'
import { Plus, Users } from 'lucide-react-native'
import { getDirectChatEmptyCopy } from '../src/direct-chat-empty-copy.ts'
import { getDirectChatComposerCopy } from '../src/direct-chat-composer-copy.ts'
import {
  createDmThreadListView,
  filterDirectMessagesForProfile,
  findSelectedDmThreadView
} from '../src/dm-thread-list.ts'
import { shortenProfileId } from '../src/mobile-product-copy.ts'
import type { ResolveAvatarMediaUri } from '../src/profile-avatar-view-model.ts'
import {
  MobileActionButton,
  MobileAdvancedToggle,
  MobileSendButton,
  type MobileActionButtonStyles,
  type MobileAdvancedToggleStyles,
  type MobileSendButtonStyles
} from './action-components.tsx'
import {
  EmptyDirectMessages,
  type EmptyStateStyles,
  type EmptyStateTheme
} from './empty-components.tsx'
import {
  DirectBubble,
  type DirectBubbleContact,
  type DirectBubbleStyles
} from './message-components.tsx'
import { PaneLabel, PanelEmptyState, type PaneLabelProps } from './panel-components.tsx'
import {
  MobileContactChip,
  ProfileRequestTargetCard,
  type MobileContactChipStyles,
  type ProfileRequestTargetCardProps
} from './profile-components.tsx'
import {
  DirectThreadHeader,
  formatMobileThreadTime,
  MessageThreadList,
  type DirectThreadHeaderProps,
  type MessageThreadListProps
} from './thread-components.tsx'

export type DirectPaneContact = DirectBubbleContact & { profileId: string }

type DirectPaneThreadContact = DirectPaneContact & {
  avatarUriSnapshot?: string
  displayNameSnapshot?: string
}

export type DirectPaneMessage = {
  direction?: string
  fromProfileId?: string
  id: string
  text?: string
  type?: string
}

export type DirectPaneThread = {
  remoteProfileId: string
  [key: string]: unknown
}

export type DirectPaneRequestTarget = ProfileRequestTargetCardProps['requestTarget']

export type DirectPaneStyles = DirectBubbleStyles &
  EmptyStateStyles &
  MobileActionButtonStyles &
  MobileAdvancedToggleStyles &
  MobileContactChipStyles &
  MobileSendButtonStyles &
  PaneLabelProps['styles'] &
  DirectThreadHeaderProps['styles'] &
  MessageThreadListProps['styles'] &
  ProfileRequestTargetCardProps['styles'] & {
    composer: StyleProp<ViewStyle>
    contactScroller: StyleProp<ViewStyle>
    directComposer: StyleProp<ViewStyle>
    directEmptyContacts: StyleProp<ViewStyle>
    directMessageList: StyleProp<ViewStyle>
    directPane: StyleProp<ViewStyle>
    messageInput: StyleProp<TextStyle>
    messageList: StyleProp<ViewStyle>
    recipientInput: StyleProp<TextStyle>
  }

export type DirectPaneTheme = EmptyStateTheme &
  DirectThreadHeaderProps['theme'] &
  MessageThreadListProps['theme'] & {
    accentStrong: string
    iconMuted: string
    inkSoft: string
    placeholder: string
    surface: string
  }

export type DirectPaneProps = {
  contactOptions: DirectPaneContact[]
  draft: string
  messages: DirectPaneMessage[]
  onAcceptRequest(message: DirectPaneMessage): Promise<unknown> | void
  onDraftChange(value: string): void
  onIgnoreRequest(message: DirectPaneMessage): Promise<unknown> | void
  onMarkThreadRead(profileId: string): void
  onOpenPeople(): void
  onOpenProfile(profileId: string): void
  onRecipientChange(profileId: string): void
  onSend(): void
  outgoingRequests?: MessageThreadListProps['outgoingRequests']
  ownerProfileId?: string | null
  pendingRequests?: MessageThreadListProps['pendingRequests']
  recipient: string
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  requestTarget?: DirectPaneRequestTarget
  styles: DirectPaneStyles
  theme: DirectPaneTheme
  threads: DirectPaneThread[]
}

export function DirectPane({
  contactOptions,
  draft,
  messages,
  onAcceptRequest,
  onDraftChange,
  onIgnoreRequest,
  onMarkThreadRead,
  onOpenPeople,
  onOpenProfile,
  onRecipientChange,
  onSend,
  outgoingRequests,
  ownerProfileId,
  pendingRequests,
  recipient,
  resolveAvatarMediaUri = null,
  requestTarget,
  styles,
  theme,
  threads
}: DirectPaneProps) {
  const [showAdvancedDmRecipient, setShowAdvancedDmRecipient] = useState(false)
  const threadContacts = contactOptions.map(toThreadContact)
  const acceptRequest = (message: unknown) =>
    Promise.resolve(onAcceptRequest(message as DirectPaneMessage))
  const ignoreRequest = (message: unknown) =>
    Promise.resolve(onIgnoreRequest(message as DirectPaneMessage))
  const selectedThread = findSelectedDmThreadView({
    selectedProfileId: recipient,
    threads: createDmThreadListView({
      contacts: threadContacts,
      formatTime: formatMobileThreadTime,
      messages,
      outgoingRequests,
      ownerProfileId: ownerProfileId || '',
      pendingRequests,
      resolveAvatarMediaUri,
      shortenProfileId,
      threads
    })
  })
  const visibleMessages = filterDirectMessagesForProfile(messages, recipient)
  const hasRequestTarget = Boolean(
    requestTarget?.profileId && requestTarget.profileId === recipient
  )
  const emptyMessageCopy = getDirectChatEmptyCopy({
    relationshipState: requestTarget?.relationshipState
  })
  const composerCopy = getDirectChatComposerCopy({
    relationshipState: requestTarget?.relationshipState,
    threadLabel: selectedThread?.label
  })

  return (
    <View style={styles.directPane}>
      <PaneLabel eyebrow='durable' styles={styles} title='Chat' />
      <DirectThreadHeader
        onOpenProfile={onOpenProfile}
        styles={styles}
        theme={theme}
        thread={selectedThread}
      />
      <ProfileRequestTargetCard
        accentColor={theme.accentStrong}
        onOpenProfile={onOpenProfile}
        recipient={recipient}
        requestTarget={requestTarget}
        styles={styles}
      />
      {hasRequestTarget ? null : (
        <MessageThreadList
          contacts={threadContacts}
          messages={messages}
          onAcceptRequest={acceptRequest}
          onIgnoreRequest={ignoreRequest}
          onMarkThreadRead={onMarkThreadRead}
          onOpenProfile={onOpenProfile}
          onOpenPeople={onOpenPeople}
          onSelectThread={onRecipientChange}
          outgoingRequests={outgoingRequests}
          ownerProfileId={ownerProfileId}
          pendingRequests={pendingRequests}
          resolveAvatarMediaUri={resolveAvatarMediaUri}
          selectedProfileId={recipient}
          shortenProfileId={shortenProfileId}
          styles={styles}
          theme={theme}
          threads={threads}
        />
      )}
      <FlatList
        contentContainerStyle={styles.messageList}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyDirectMessages copy={emptyMessageCopy} styles={styles} theme={theme} />
        }
        renderItem={({ item }) => (
          <DirectBubble
            acceptContentColor={theme.surface}
            contacts={contactOptions}
            ignoreContentColor={theme.inkSoft}
            message={item}
            onAcceptRequest={acceptRequest}
            onIgnoreRequest={ignoreRequest}
            resolveAvatarMediaUri={resolveAvatarMediaUri}
            styles={styles}
          />
        )}
        style={styles.directMessageList}
      />

      <View style={styles.directComposer}>
        {contactOptions.length > 0 ? (
          <ScrollView
            horizontal
            contentContainerStyle={styles.contactScroller}
            showsHorizontalScrollIndicator={false}
          >
            {contactOptions.map((contact) => (
              <MobileContactChip
                contact={contact}
                key={contact.profileId}
                onPress={() => onRecipientChange(contact.profileId)}
                resolveAvatarMediaUri={resolveAvatarMediaUri}
                selected={recipient === contact.profileId}
                styles={styles}
              />
            ))}
          </ScrollView>
        ) : hasRequestTarget ? null : (
          <View style={styles.directEmptyContacts}>
            <PanelEmptyState
              copy='Trust a friend first, then come back here to write privately.'
              icon={Users}
              iconColor={theme.iconMuted}
              styles={styles}
              title='No contacts yet'
            />
            <MobileActionButton
              accentColor={theme.accentStrong}
              disabledContentColor={theme.placeholder}
              primaryContentColor={theme.surface}
              styles={styles}
              icon={Plus}
              label='Open Contacts'
              onPress={onOpenPeople}
              testID='dm-open-people-button'
            />
          </View>
        )}
        <MobileAdvancedToggle
          expanded={showAdvancedDmRecipient}
          iconColor={theme.inkSoft}
          onPress={() => setShowAdvancedDmRecipient((value) => !value)}
          styles={styles}
          testID='advanced-dm-recipient-toggle'
          variant='compact'
        />
        {showAdvancedDmRecipient ? (
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={onRecipientChange}
            placeholder='Manual recipient profile id'
            placeholderTextColor={theme.placeholder}
            style={styles.recipientInput}
            testID='dm-recipient-input'
            value={recipient}
          />
        ) : null}
        <View style={styles.composer}>
          <TextInput
            onChangeText={onDraftChange}
            onSubmitEditing={onSend}
            placeholder={composerCopy.placeholder}
            placeholderTextColor={theme.placeholder}
            returnKeyType='send'
            style={styles.messageInput}
            testID='dm-message-input'
            value={draft}
          />
          <MobileSendButton
            accessibilityLabel={composerCopy.sendLabel}
            disabled={!draft.trim() || !recipient.trim()}
            onPress={onSend}
            styles={styles}
            surfaceColor={theme.surface}
            testID='dm-send-button'
          />
        </View>
      </View>
    </View>
  )
}

function toThreadContact(contact: DirectPaneContact): DirectPaneThreadContact {
  return {
    ...contact,
    avatarUriSnapshot: contact.avatarUriSnapshot || undefined,
    displayNameSnapshot: contact.displayNameSnapshot || undefined
  }
}
