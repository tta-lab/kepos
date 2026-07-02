import type { StyleProp, ViewStyle } from 'react-native'
import { ScrollView, TextInput, View } from 'react-native'
import { ArrowRight, Settings } from 'lucide-react-native'
import { MobileActionButton, type MobileActionButtonStyles } from './action-components.tsx'
import { TaskHeader, type TaskHeaderProps } from './panel-components.tsx'
import { QuickStartPanel, type QuickStartPanelProps } from './setup-components.tsx'

type LobbyStyles = MobileActionButtonStyles &
  QuickStartPanelProps['styles'] &
  TaskHeaderProps['styles'] & {
    keyInput: StyleProp<ViewStyle>
    lobby: StyleProp<ViewStyle>
    lobbyScroll: StyleProp<ViewStyle>
    panel: StyleProp<ViewStyle>
  }

type LobbyTheme = QuickStartPanelProps['theme'] & {
  accentStrong: string
  placeholder: string
  surface: string
}

export type HomeStartupPaneProps = {
  canJoin: boolean
  directRoomEndpoint: string
  localAvatarUri?: string
  nick?: string
  onChooseLocalAvatarImage: QuickStartPanelProps['onChooseLocalAvatarImage']
  onCreateRoom(): void
  onDirectRoomEndpointChange(value: string): void
  onJoinRoom(): void
  onLocalAvatarUriChange: QuickStartPanelProps['onLocalAvatarUriChange']
  onNickChange: QuickStartPanelProps['onNickChange']
  onOpenContacts: QuickStartPanelProps['onOpenContacts']
  onRoomKeyChange(value: string): void
  onToggleAdvancedJoin(): void
  profileQrUri: string
  profileReady: boolean
  roomKey: string
  showAdvancedJoin: boolean
  styles: LobbyStyles
  theme: LobbyTheme
}

export function HomeStartupPane({
  canJoin,
  directRoomEndpoint,
  nick,
  localAvatarUri,
  onCreateRoom,
  onChooseLocalAvatarImage,
  onDirectRoomEndpointChange,
  onJoinRoom,
  onLocalAvatarUriChange,
  onNickChange,
  onOpenContacts,
  onRoomKeyChange,
  onToggleAdvancedJoin,
  profileReady,
  profileQrUri,
  roomKey,
  showAdvancedJoin,
  styles,
  theme
}: HomeStartupPaneProps) {
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
        onNickChange={onNickChange}
        onOpenContacts={onOpenContacts}
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
            placeholder='Debug direct host:port'
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
    </ScrollView>
  )
}
