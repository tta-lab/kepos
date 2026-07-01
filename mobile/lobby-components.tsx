import { useState } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { ScrollView, TextInput, View } from 'react-native'
import { ArrowRight, Settings, Users } from 'lucide-react-native'
import { MobileActionButton, type MobileActionButtonStyles } from './action-components.js'
import { PeopleActions, type PeopleActionsProps } from './people-components.js'
import { TaskHeader, type TaskHeaderProps } from './panel-components.js'
import { QuickStartPanel, type QuickStartPanelProps } from './setup-components.js'

type LobbyStyles = MobileActionButtonStyles &
  QuickStartPanelProps['styles'] &
  PeopleActionsProps['styles'] &
  TaskHeaderProps['styles'] & {
    keyInput: StyleProp<ViewStyle>
    lobby: StyleProp<ViewStyle>
    lobbyScroll: StyleProp<ViewStyle>
    panel: StyleProp<ViewStyle>
  }

type LobbyTheme = QuickStartPanelProps['theme'] &
  PeopleActionsProps['theme'] & {
    accentStrong: string
    placeholder: string
    surface: string
  }

export type LobbyProps = {
  blockedContacts?: PeopleActionsProps['blockedContacts']
  canJoin: boolean
  directRoomEndpoint: string
  homeQrUri: string
  localAvatarUri?: string
  myHomeQrUri: string
  nick?: string
  onAllowContactRequests: PeopleActionsProps['onAllowContactRequests']
  onChooseLocalAvatarImage: QuickStartPanelProps['onChooseLocalAvatarImage']
  onCreateRoom(): void
  onDirectRoomEndpointChange(value: string): void
  onEnterContactHome: PeopleActionsProps['onEnterContactHome']
  onHomeQrChange: PeopleActionsProps['onHomeQrChange']
  onJoinHomeQr: PeopleActionsProps['onJoinHomeQr']
  onJoinRoom(): void
  onLocalAvatarUriChange: QuickStartPanelProps['onLocalAvatarUriChange']
  onNickChange: QuickStartPanelProps['onNickChange']
  onRevokeContact: PeopleActionsProps['onRevokeContact']
  onRoomKeyChange(value: string): void
  onScanHomeQr: PeopleActionsProps['onScanHomeQr']
  onScanProfileQr: PeopleActionsProps['onScanProfileQr']
  onToggleAdvancedJoin(): void
  onTrustAliasChange: PeopleActionsProps['onTrustAliasChange']
  onTrustProfile: PeopleActionsProps['onTrustProfile']
  onTrustQrChange: PeopleActionsProps['onTrustQrChange']
  profileQrUri: string
  profileReady: boolean
  roomKey: string
  showAdvancedJoin: boolean
  styles: LobbyStyles
  theme: LobbyTheme
  trustAlias?: string
  trustedContacts?: PeopleActionsProps['trustedContacts']
  trustQrUri: string
}

export function Lobby({
  blockedContacts,
  canJoin,
  directRoomEndpoint,
  homeQrUri,
  myHomeQrUri,
  nick,
  localAvatarUri,
  onCreateRoom,
  onAllowContactRequests,
  onChooseLocalAvatarImage,
  onDirectRoomEndpointChange,
  onHomeQrChange,
  onEnterContactHome,
  onJoinRoom,
  onJoinHomeQr,
  onLocalAvatarUriChange,
  onNickChange,
  onRoomKeyChange,
  onRevokeContact,
  onScanHomeQr,
  onScanProfileQr,
  onToggleAdvancedJoin,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  profileReady,
  profileQrUri,
  roomKey,
  showAdvancedJoin,
  styles,
  theme,
  trustAlias,
  trustQrUri,
  trustedContacts
}: LobbyProps) {
  const [showPeopleSetup, setShowPeopleSetup] = useState(false)

  return (
    <ScrollView
      contentContainerStyle={styles.lobby}
      keyboardShouldPersistTaps='handled'
      style={styles.lobbyScroll}
      testID='lobby-scroll'
    >
      <QuickStartPanel
        localAvatarUri={localAvatarUri}
        nick={nick}
        onCreateRoom={onCreateRoom}
        onChooseLocalAvatarImage={onChooseLocalAvatarImage}
        onLocalAvatarUriChange={onLocalAvatarUriChange}
        onOpenPeopleSetup={() => setShowPeopleSetup(true)}
        onNickChange={onNickChange}
        profileQrUri={profileQrUri}
        profileReady={profileReady}
        styles={styles}
        theme={theme}
      />

      <MobileActionButton
        accentColor={theme.accentStrong}
        disabledContentColor={theme.placeholder}
        primaryContentColor={theme.surface}
        styles={styles}
        accessibilityState={{ expanded: showAdvancedJoin }}
        icon={Settings}
        label='Advanced'
        onPress={onToggleAdvancedJoin}
        testID='advanced-join-toggle'
      />
      {showAdvancedJoin ? (
        <View style={styles.panel}>
          <TaskHeader
            description='Use only when QR joining is unavailable.'
            eyebrow='Advanced'
            styles={styles}
            title='Manual home key'
          />
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            multiline
            onChangeText={onRoomKeyChange}
            placeholder='64-character manual key'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='manual-home-key-input'
            value={roomKey}
          />
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={onDirectRoomEndpointChange}
            placeholder='Optional direct host:port'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='manual-home-endpoint-input'
            value={directRoomEndpoint}
          />
          <MobileActionButton
            accentColor={theme.accentStrong}
            disabledContentColor={theme.placeholder}
            primaryContentColor={theme.surface}
            styles={styles}
            disabled={!canJoin}
            icon={ArrowRight}
            label='Join home'
            onPress={onJoinRoom}
            testID='manual-home-join-button'
          />
        </View>
      ) : null}

      <MobileActionButton
        accentColor={theme.accentStrong}
        disabledContentColor={theme.placeholder}
        primaryContentColor={theme.surface}
        styles={styles}
        accessibilityState={{ expanded: showPeopleSetup }}
        icon={Users}
        label='Contacts'
        onPress={() => setShowPeopleSetup((value) => !value)}
        testID='people-setup-toggle'
      />
      {showPeopleSetup ? (
        <PeopleActions
          canJoinHome={true}
          homeQrUri={homeQrUri}
          myHomeQrUri={myHomeQrUri}
          onHomeQrChange={onHomeQrChange}
          onAllowContactRequests={onAllowContactRequests}
          onEnterContactHome={onEnterContactHome}
          onJoinHomeQr={onJoinHomeQr}
          onRevokeContact={onRevokeContact}
          onScanHomeQr={onScanHomeQr}
          onScanProfileQr={onScanProfileQr}
          onSelectedProfileChange={() => {}}
          onTrustAliasChange={onTrustAliasChange}
          onTrustProfile={onTrustProfile}
          onTrustQrChange={onTrustQrChange}
          profileReady={profileReady}
          profileQrUri={profileQrUri}
          trustAlias={trustAlias}
          blockedContacts={blockedContacts}
          trustedContacts={trustedContacts}
          trustQrUri={trustQrUri}
          styles={styles}
          theme={theme}
        />
      ) : null}
    </ScrollView>
  )
}
