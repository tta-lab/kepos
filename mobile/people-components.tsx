import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  ArrowRight,
  House,
  Plus,
  QrCode,
  Settings,
  ShieldOff,
  User,
  UserPlus,
  Users
} from 'lucide-react-native'
import { getBlockedContactCopy } from '../src/blocked-contact-copy.ts'
import type { ContactBookContact } from '../src/contact-book.ts'
import { createContactProfileViewModel } from '../src/contact-profile-view-model.ts'
import type { FriendRequestTargetViewModel } from '../src/friend-request-target-view-model.ts'
import {
  createProfileRecentPostsViewModel,
  type ProfileRecentPostCache,
  type ProfileRecentPostsViewModel,
  type ProfileRecentTreeholePost
} from '../src/profile-recent-posts-view-model.ts'
import {
  createRequestTargetProfileViewModel,
  type RequestTargetProfileInput
} from '../src/request-target-profile-view-model.ts'
import { formatMobileTrustTime, shortenProfileId } from '../src/mobile-product-copy.ts'
import { MobileActionButton, MobileSmallActionButton } from './action-components.tsx'
import { QrCard } from './chrome-components.tsx'
import { Field } from './form-components.tsx'
import { PanelEmptyState, TaskHeader } from './panel-components.tsx'
import {
  ContactProfileDetail,
  MobileProfileAvatar,
  type ContactProfileIgnoreRequest,
  type ContactProfileDetailView
} from './profile-components.tsx'
import {
  MessageRequestManager,
  OutgoingRequestManager,
  type IncomingFriendRequest,
  type MessageRequestManagerProps,
  type OutgoingFriendRequest,
  type RequestManagerStyles,
  type RequestManagerTheme
} from './request-components.tsx'
import type { MobileStyles } from './styles.ts'
import { formatMobileThreadTime } from './thread-components.tsx'

type MobileTheme = {
  accentStrong: string
  danger: string
  iconMuted: string
  ink: string
  placeholder: string
  raised: string
  surface: string
}

type ContactRecord = ContactBookContact
type ProfileRequestTarget = FriendRequestTargetViewModel
type TreeholePost = ProfileRecentTreeholePost

export type PeoplePaneProps = {
  activeHomeOwnerProfileId?: string
  blockedContacts?: ContactRecord[]
  canJoinHome: boolean
  homeQrUri: string
  myHomeQrUri: string
  onAcceptRequest: MessageRequestManagerProps['onAcceptRequest']
  onAllowContactRequests(profileId: string): void
  onEnterContactHome(profileId: string): void
  onHomeQrChange(value: string): void
  onIgnoreRequest: MessageRequestManagerProps['onIgnoreRequest']
  onJoinHomeQr(): void
  onMessageContact(profileId: string): void
  onRevokeContact(profileId: string): void
  onRetryOutgoingRequest(request: OutgoingFriendRequest): void
  onScanHomeQr(): void
  onScanProfileQr(): void
  onSelectedProfileChange(profileId: string | null): void
  onTrustAliasChange(value: string): void
  onTrustProfile(): void
  onTrustQrChange(value: string): void
  outgoingRequests?: OutgoingFriendRequest[]
  pendingRequests?: IncomingFriendRequest[]
  profileId?: string | null
  profileQrUri: string
  profileReady: boolean
  profileRecentPostCache?: ProfileRecentPostCache
  profileRequestTarget?: ProfileRequestTarget | null
  selectedProfileId?: string | null
  styles: MobileStyles & RequestManagerStyles
  theme: MobileTheme & RequestManagerTheme
  treeholePosts?: TreeholePost[]
  trustAlias?: string
  trustedContacts?: ContactRecord[]
  trustQrUri: string
}

export function PeoplePane({
  activeHomeOwnerProfileId,
  blockedContacts,
  canJoinHome,
  homeQrUri,
  myHomeQrUri,
  onAcceptRequest,
  onAllowContactRequests,
  onHomeQrChange,
  onIgnoreRequest,
  onJoinHomeQr,
  onEnterContactHome,
  onMessageContact,
  onRevokeContact,
  onRetryOutgoingRequest,
  onScanHomeQr,
  onScanProfileQr,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  outgoingRequests,
  pendingRequests,
  profileRequestTarget,
  profileRecentPostCache,
  profileId,
  profileReady,
  profileQrUri,
  selectedProfileId,
  onSelectedProfileChange,
  treeholePosts,
  trustAlias,
  trustedContacts,
  trustQrUri,
  styles,
  theme
}: PeoplePaneProps) {
  return (
    <ScrollView contentContainerStyle={styles.peoplePane} keyboardShouldPersistTaps='handled'>
      <MessageRequestManager
        onAcceptRequest={onAcceptRequest}
        onIgnoreRequest={onIgnoreRequest}
        onOpenProfile={(requestProfileId) => onSelectedProfileChange(requestProfileId)}
        pendingRequests={pendingRequests}
        profileId={profileId}
        styles={styles}
        theme={theme}
      />
      <OutgoingRequestManager
        onOpenProfile={(requestProfileId) => onSelectedProfileChange(requestProfileId)}
        onRetryRequest={onRetryOutgoingRequest}
        outgoingRequests={outgoingRequests}
        styles={styles}
        theme={theme}
      />
      <PeopleActions
        canJoinHome={canJoinHome}
        homeQrUri={homeQrUri}
        myHomeQrUri={myHomeQrUri}
        onHomeQrChange={onHomeQrChange}
        onAcceptRequest={onAcceptRequest}
        onAllowContactRequests={onAllowContactRequests}
        onEnterContactHome={onEnterContactHome}
        onIgnoreRequest={onIgnoreRequest}
        onJoinHomeQr={onJoinHomeQr}
        onMessageContact={onMessageContact}
        onRevokeContact={onRevokeContact}
        onScanHomeQr={onScanHomeQr}
        onScanProfileQr={onScanProfileQr}
        onTrustAliasChange={onTrustAliasChange}
        onTrustProfile={onTrustProfile}
        onTrustQrChange={onTrustQrChange}
        outgoingRequests={outgoingRequests}
        pendingRequests={pendingRequests}
        profileId={profileId}
        profileRequestTarget={profileRequestTarget}
        profileRecentPostCache={profileRecentPostCache}
        profileReady={profileReady}
        profileQrUri={profileQrUri}
        activeHomeOwnerProfileId={activeHomeOwnerProfileId}
        blockedContacts={blockedContacts}
        selectedProfileId={selectedProfileId}
        onSelectedProfileChange={onSelectedProfileChange}
        treeholePosts={treeholePosts}
        trustAlias={trustAlias}
        trustedContacts={trustedContacts}
        trustQrUri={trustQrUri}
        styles={styles}
        theme={theme}
      />
    </ScrollView>
  )
}

export type PeopleActionsProps = {
  activeHomeOwnerProfileId?: string
  blockedContacts?: ContactRecord[]
  canJoinHome: boolean
  homeQrUri: string
  myHomeQrUri: string
  onAcceptRequest: MessageRequestManagerProps['onAcceptRequest']
  onAllowContactRequests(profileId: string): void
  onEnterContactHome(profileId: string): void
  onHomeQrChange(value: string): void
  onIgnoreRequest: MessageRequestManagerProps['onIgnoreRequest']
  onJoinHomeQr(): void
  onMessageContact?(profileId: string): void
  onRevokeContact(profileId: string): void
  onScanHomeQr(): void
  onScanProfileQr(): void
  onSelectedProfileChange(profileId: string | null): void
  onTrustAliasChange(value: string): void
  onTrustProfile(): void
  onTrustQrChange(value: string): void
  outgoingRequests?: OutgoingFriendRequest[]
  pendingRequests?: IncomingFriendRequest[]
  profileId?: string | null
  profileReady: boolean
  profileQrUri: string
  profileRecentPostCache?: ProfileRecentPostCache
  profileRequestTarget?: ProfileRequestTarget | null
  selectedProfileId?: string | null
  styles: MobileStyles
  theme: MobileTheme
  treeholePosts?: TreeholePost[]
  trustAlias?: string
  trustedContacts?: ContactRecord[]
  trustQrUri: string
}

export function PeopleActions({
  activeHomeOwnerProfileId,
  blockedContacts,
  canJoinHome,
  homeQrUri,
  myHomeQrUri,
  onAcceptRequest,
  onAllowContactRequests,
  onHomeQrChange,
  onEnterContactHome,
  onIgnoreRequest,
  onJoinHomeQr,
  onMessageContact = () => {},
  onRevokeContact,
  onScanHomeQr,
  onScanProfileQr,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  outgoingRequests,
  pendingRequests,
  profileId,
  profileRequestTarget,
  profileRecentPostCache,
  profileReady,
  profileQrUri,
  selectedProfileId,
  onSelectedProfileChange,
  treeholePosts,
  trustAlias,
  trustedContacts,
  trustQrUri,
  styles,
  theme
}: PeopleActionsProps) {
  const [showAdvancedShare, setShowAdvancedShare] = useState(false)
  const [showHomeQr, setShowHomeQr] = useState(false)
  const canUseHomeJoin = profileReady && canJoinHome

  return (
    <>
      <View style={styles.panel}>
        <TaskHeader
          description='Scan a Profile QR, then write a request in Chat.'
          eyebrow='Contacts'
          styles={styles}
          title='Add friend'
        />
        <MobileActionButton
          accentColor={theme.accentStrong}
          disabledContentColor={theme.placeholder}
          primaryContentColor={theme.surface}
          styles={styles}
          disabled={!profileReady}
          icon={Plus}
          label='Scan QR'
          onPress={onScanProfileQr}
          testID='scan-profile-qr-button'
        />
      </View>
      <MobileActionButton
        accentColor={theme.accentStrong}
        disabledContentColor={theme.placeholder}
        primaryContentColor={theme.surface}
        styles={styles}
        accessibilityState={{ expanded: showAdvancedShare }}
        icon={Settings}
        label='Advanced'
        onPress={() => setShowAdvancedShare((value) => !value)}
        testID='advanced-share-toggle'
      />
      {showAdvancedShare ? (
        <View style={styles.panel}>
          <TaskHeader
            description='Debug home descriptor for explicit live-room entry; it does not create friendship.'
            eyebrow='Advanced'
            styles={styles}
            title='Debug Home QR'
          />
          <MobileActionButton
            accentColor={theme.accentStrong}
            disabledContentColor={theme.placeholder}
            primaryContentColor={theme.surface}
            styles={styles}
            accessibilityState={{ expanded: showHomeQr }}
            disabled={!profileReady}
            icon={QrCode}
            label='Show Debug Home QR'
            onPress={() => setShowHomeQr((value) => !value)}
            testID='show-home-qr-button'
          />
          {showHomeQr ? (
            <QrCard backgroundColor={theme.raised} styles={styles} value={myHomeQrUri} />
          ) : null}
          <MobileActionButton
            accentColor={theme.accentStrong}
            disabledContentColor={theme.placeholder}
            primaryContentColor={theme.surface}
            styles={styles}
            disabled={!canUseHomeJoin}
            icon={ArrowRight}
            label='Scan Debug Home QR'
            onPress={onScanHomeQr}
            testID='scan-home-qr-button'
          />
          {!canJoinHome ? (
            <Text style={styles.panelCopy}>Leave this home before joining another one.</Text>
          ) : null}
          <TaskHeader
            description='Paste or copy raw QR payloads for advanced diagnostics.'
            eyebrow='Advanced'
            styles={styles}
            title='QR details'
          />
          <Text style={styles.panelCopy}>Enter Home</Text>
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            multiline
            onChangeText={onHomeQrChange}
            placeholder='Paste Debug Home QR'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='join-home-uri-input'
            value={homeQrUri}
          />
          <MobileActionButton
            accentColor={theme.accentStrong}
            disabledContentColor={theme.placeholder}
            primaryContentColor={theme.surface}
            styles={styles}
            disabled={!canUseHomeJoin || !homeQrUri.trim()}
            icon={ArrowRight}
            label='Enter Home'
            onPress={onJoinHomeQr}
            testID='join-home-uri-button'
          />
          <Text style={styles.panelCopy}>Profile QR</Text>
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            multiline
            onChangeText={onTrustQrChange}
            placeholder='Paste Profile QR'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='trust-profile-uri-input'
            value={trustQrUri}
          />
          <Field
            label='Friend name'
            onChangeText={onTrustAliasChange}
            styles={styles}
            testID='trust-profile-alias-input'
            value={trustAlias}
          />
          <MobileActionButton
            accentColor={theme.accentStrong}
            disabledContentColor={theme.placeholder}
            primaryContentColor={theme.surface}
            styles={styles}
            disabled={!profileReady || !trustQrUri.trim()}
            icon={Plus}
            label='Start request'
            onPress={onTrustProfile}
            testID='trust-profile-button'
          />
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            editable={false}
            multiline
            placeholder='Debug Home QR details'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='home-address-uri'
            value={myHomeQrUri}
          />
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            editable={false}
            multiline
            placeholder='Profile QR details'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='home-profile-uri'
            value={profileQrUri}
          />
        </View>
      ) : null}

      <ContactManager
        blockedContacts={blockedContacts}
        contacts={trustedContacts}
        onAcceptRequest={onAcceptRequest}
        onAllowContactRequests={onAllowContactRequests}
        onEnterContactHome={onEnterContactHome}
        onIgnoreRequest={onIgnoreRequest}
        onMessageContact={onMessageContact}
        onRevokeContact={onRevokeContact}
        outgoingRequests={outgoingRequests}
        pendingRequests={pendingRequests}
        profileId={profileId}
        profileRequestTarget={profileRequestTarget}
        profileRecentPostCache={profileRecentPostCache}
        activeHomeOwnerProfileId={activeHomeOwnerProfileId}
        selectedProfileId={selectedProfileId}
        styles={styles}
        theme={theme}
        treeholePosts={treeholePosts}
        onSelectedProfileChange={onSelectedProfileChange}
      />
    </>
  )
}

export type ContactManagerProps = {
  activeHomeOwnerProfileId?: string
  blockedContacts?: ContactRecord[]
  contacts?: ContactRecord[]
  onAcceptRequest: MessageRequestManagerProps['onAcceptRequest']
  onAllowContactRequests(profileId: string): void
  onEnterContactHome(profileId: string): void
  onIgnoreRequest: MessageRequestManagerProps['onIgnoreRequest']
  onMessageContact?(profileId: string): void
  onRevokeContact(profileId: string): void
  onSelectedProfileChange(profileId: string | null): void
  outgoingRequests?: OutgoingFriendRequest[]
  pendingRequests?: IncomingFriendRequest[]
  profileId?: string | null
  profileRecentPostCache?: ProfileRecentPostCache
  profileRequestTarget?: ProfileRequestTarget | null
  selectedProfileId?: string | null
  styles: MobileStyles
  theme: MobileTheme
  treeholePosts?: TreeholePost[]
}

export function ContactManager({
  activeHomeOwnerProfileId,
  blockedContacts,
  contacts,
  onAcceptRequest,
  onAllowContactRequests,
  onEnterContactHome,
  onIgnoreRequest,
  onMessageContact = () => {},
  onRevokeContact,
  outgoingRequests,
  pendingRequests,
  profileId,
  profileRequestTarget,
  profileRecentPostCache,
  selectedProfileId,
  styles,
  theme,
  treeholePosts,
  onSelectedProfileChange
}: ContactManagerProps) {
  const selectedContact = (contacts || []).find(
    (contact) => contact.profileId === selectedProfileId
  )
  const selectedPendingRequest = (pendingRequests || []).find(
    (request) => request.profileId === selectedProfileId
  )
  const selectedOutgoingRequest = (outgoingRequests || []).find(
    (request) => request.profileId === selectedProfileId
  )
  const selectedBlockedContact = (blockedContacts || []).find(
    (contact) => contact.profileId === selectedProfileId
  )
  const selectedProfile = selectedContact
    ? withMobileProfileRecentPosts({
        activeHomeOwnerProfileId,
        profileRecentPostCache,
        profile: createContactProfileViewModel({
          contact: selectedContact,
          formatDate: formatMobileTrustTime,
          shortenProfileId
        }),
        treeholePosts
      })
    : selectedPendingRequest
      ? createMobileRequestProfile({
          localProfileId: profileId,
          relationshipState: 'incoming_request',
          request: selectedPendingRequest
        })
      : selectedOutgoingRequest
        ? createMobileRequestProfile({
            relationshipState: 'outgoing_request',
            request: selectedOutgoingRequest
          })
        : selectedBlockedContact
          ? {
              ...createContactProfileViewModel({
                contact: selectedBlockedContact,
                formatDate: formatMobileTrustTime,
                shortenProfileId
              }),
              canAllowRequests: true,
              canRemove: false
            }
          : createRequestTargetProfileViewModel({
              requestTarget: toRequestTargetProfileInput(profileRequestTarget),
              selectedProfileId,
              shortenProfileId
            })

  return (
    <View style={styles.panel}>
      <TaskHeader
        description='Open a profile, message a trusted contact, or enter when Home access is saved.'
        eyebrow='Profiles'
        styles={styles}
        title='Contacts'
      />
      {!contacts?.length ? (
        <PanelEmptyState
          copy='Accepted friends will appear here as contacts.'
          icon={Users}
          iconColor={theme.iconMuted}
          styles={styles}
          title='No contacts yet'
        />
      ) : null}
      <ContactProfileDetail
        onAcceptProfileRequest={onAcceptRequest}
        onAllowContactRequests={onAllowContactRequests}
        onBack={() => onSelectedProfileChange(null)}
        onEnterContactHome={onEnterContactHome}
        onIgnoreProfileRequest={(request) => {
          const pending = findPendingProfileRequest(pendingRequests, request)
          if (pending) onIgnoreRequest(pending)
        }}
        onMessageContact={onMessageContact}
        onRevokeContact={onRevokeContact}
        profile={selectedProfile}
        styles={styles}
        theme={theme}
      />
      {(contacts || []).map((contact) => {
        const profile = withMobileProfileRecentPosts({
          activeHomeOwnerProfileId,
          profileRecentPostCache,
          profile: createContactProfileViewModel({
            contact,
            formatDate: formatMobileTrustTime,
            shortenProfileId
          }),
          treeholePosts
        })

        return (
          <Pressable
            accessibilityLabel={`Open ${profile.displayName} profile`}
            accessibilityRole='button'
            key={profile.profileId}
            onPress={() => onSelectedProfileChange(profile.profileId)}
            style={styles.contactRow}
          >
            <MobileProfileAvatar avatar={profile.avatar} styles={styles} />
            <View style={styles.contactRowText}>
              <Text style={styles.contactName}>{profile.displayName}</Text>
              <Text style={styles.contactProfile}>{profile.shortProfileId}</Text>
              <View style={styles.trustMeta}>
                <Text style={styles.trustStatus}>{profile.statusLabel}</Text>
                <Text style={styles.trustMetaText}>{profile.sourceLabel}</Text>
                <Text style={styles.trustMetaText}>{profile.trustedAtLabel}</Text>
              </View>
            </View>
            <View style={styles.contactActions}>
              <User color={theme.accentStrong} size={18} />
            </View>
          </Pressable>
        )
      })}
      <View style={styles.contactBlockedSection}>
        <TaskHeader
          description='Removed friends and ignored requests stay visible here.'
          eyebrow='Manage'
          styles={styles}
          title='Removed / ignored'
        />
        {!blockedContacts?.length ? (
          <PanelEmptyState
            copy='Profiles you remove or ignore will appear here.'
            icon={ShieldOff}
            iconColor={theme.iconMuted}
            styles={styles}
            title='No removed profiles'
          />
        ) : null}
        {(blockedContacts || []).map((contact) => {
          const blockedCopy = getBlockedContactCopy(contact)
          const profileLabel =
            contact.alias || contact.displayNameSnapshot || shortenProfileId(contact.profileId)

          return (
            <Pressable
              accessibilityLabel={`Open ${profileLabel} profile`}
              accessibilityRole='button'
              key={contact.profileId}
              onPress={() => onSelectedProfileChange(contact.profileId)}
              style={styles.requestCard}
            >
              <View style={styles.requestText}>
                <Text style={styles.requestTitle}>{profileLabel}</Text>
                <Text style={styles.contactProfile}>{shortenProfileId(contact.profileId)}</Text>
                <Text style={styles.requestPreview}>{blockedCopy.copy}</Text>
                <Text style={styles.trustMetaText}>
                  {blockedCopy.statusLabel} {formatMobileTrustTime(blockedCopy.blockedAt)}
                </Text>
              </View>
              <View style={styles.trustMeta}>
                <Text style={styles.trustStatus}>{blockedCopy.statusLabel}</Text>
                <MobileSmallActionButton
                  accentColor={theme.accentStrong}
                  dangerColor={theme.danger}
                  styles={styles}
                  accessibilityLabel={`Allow requests from ${profileLabel}`}
                  icon={UserPlus}
                  label='Allow requests'
                  onPress={() => onAllowContactRequests(contact.profileId)}
                />
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function createMobileRequestProfile({
  localProfileId,
  relationshipState,
  request
}: {
  localProfileId?: string | null
  relationshipState: 'incoming_request' | 'outgoing_request'
  request: IncomingFriendRequest | OutgoingFriendRequest
}): ContactProfileDetailView {
  const canAccept = Boolean(
    relationshipState === 'incoming_request' &&
    localProfileId &&
    'requestId' in request &&
    request.requestId &&
    'senderEncryptionPublicKey' in request &&
    request.senderEncryptionPublicKey
  )

  return {
    ...createContactProfileViewModel({
      contact: {
        alias: request.alias || undefined,
        avatarUriSnapshot: request.avatarUriSnapshot || undefined,
        displayNameSnapshot: request.displayNameSnapshot || undefined,
        profileId: request.profileId,
        source: 'profile_qr'
      },
      deliveryState: request.deliveryState,
      formatDate: formatMobileTrustTime,
      relationshipState,
      shortenProfileId
    }),
    acceptRequest: canAccept
      ? {
          createdAt: request.requestedAt,
          fromProfileId: request.profileId,
          requestId: (request as IncomingFriendRequest).requestId || '',
          senderEncryptionPublicKey:
            (request as IncomingFriendRequest).senderEncryptionPublicKey || '',
          text: request.text,
          toProfileId: localProfileId || '',
          type: 'kepos.message.request.v1'
        }
      : undefined,
    canRemove: false,
    ignoreRequest:
      relationshipState === 'incoming_request' ? { profileId: request.profileId } : undefined
  }
}

function findPendingProfileRequest(
  pendingRequests: IncomingFriendRequest[] | undefined,
  request: ContactProfileIgnoreRequest
): IncomingFriendRequest | null {
  return pendingRequests?.find((candidate) => candidate.profileId === request.profileId) || null
}

function withMobileProfileRecentPosts<
  TProfile extends ContactProfileDetailView & { profileId: string }
>({
  activeHomeOwnerProfileId,
  profile,
  profileRecentPostCache,
  treeholePosts
}: {
  activeHomeOwnerProfileId?: string
  profile: TProfile
  profileRecentPostCache?: ProfileRecentPostCache
  treeholePosts?: TreeholePost[]
}): TProfile & ProfileRecentPostsViewModel {
  return {
    ...profile,
    ...createProfileRecentPostsViewModel({
      activeHomeOwnerProfileId,
      cachedPostsByProfileId: profileRecentPostCache,
      formatTime: formatRecentPostTime,
      posts: treeholePosts,
      selectedProfileId: profile.profileId
    })
  }
}

function toRequestTargetProfileInput(
  requestTarget?: ProfileRequestTarget | null
): RequestTargetProfileInput | null {
  if (!requestTarget) return null

  return {
    avatar: requestTarget.avatar,
    displayName: requestTarget.displayName,
    profileId: requestTarget.profileId,
    shortProfileId: requestTarget.shortProfileId,
    statusLabel: requestTarget.statusLabel
  }
}

function formatRecentPostTime(value: number | string | undefined): string {
  if (typeof value === 'number') return formatMobileThreadTime(value)
  if (typeof value === 'string') {
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? formatMobileThreadTime(timestamp) : value
  }
  return ''
}
