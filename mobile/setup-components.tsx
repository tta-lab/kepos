import { useState } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'
import { House, Image, QrCode, UserPlus } from 'lucide-react-native'
import { MobileActionButton, type MobileActionButtonStyles } from './action-components.tsx'
import { QrCard } from './chrome-components.tsx'
import { Field, type FieldStyles } from './form-components.tsx'
import { TaskHeader, type TaskHeaderProps } from './panel-components.tsx'

export type QuickStartPanelStyles = FieldStyles &
  MobileActionButtonStyles &
  TaskHeaderProps['styles'] & {
    quickActions: StyleProp<ViewStyle>
    quickStartPanel: StyleProp<ViewStyle>
    qrCard: StyleProp<ViewStyle>
  }

export type QuickStartPanelTheme = {
  accentStrong: string
  placeholder: string
  raised: string
  surface: string
}

export type QuickStartPanelProps = {
  homeReady: boolean
  localAvatarUri?: string
  nick?: string
  onCreateRoom(): void
  onOpenContacts(): void
  onChooseLocalAvatarImage(): void
  onLocalAvatarUriChange(value: string): void
  onNickChange(value: string): void
  profileQrUri: string
  profileReady: boolean
  styles: QuickStartPanelStyles
  theme: QuickStartPanelTheme
}

export function QuickStartPanel({
  homeReady,
  localAvatarUri,
  nick,
  onCreateRoom,
  onOpenContacts,
  onChooseLocalAvatarImage,
  onLocalAvatarUriChange,
  onNickChange,
  profileQrUri,
  profileReady,
  styles,
  theme
}: QuickStartPanelProps) {
  const [showQuickProfileQr, setShowQuickProfileQr] = useState(false)

  return (
    <View style={styles.quickStartPanel}>
      <TaskHeader
        description={profileReady ? 'Show My QR or add a friend.' : 'Setting up your profile...'}
        eyebrow='Start'
        styles={styles}
        title='Start here'
      />
      <Field label='Name' onChangeText={onNickChange} styles={styles} value={nick} />
      <Field
        label='Avatar image'
        onChangeText={onLocalAvatarUriChange}
        styles={styles}
        value={localAvatarUri}
      />
      <MobileActionButton
        accentColor={theme.accentStrong}
        disabledContentColor={theme.placeholder}
        disabled={!profileReady}
        icon={Image}
        label='Choose image'
        onPress={onChooseLocalAvatarImage}
        primaryContentColor={theme.surface}
        styles={styles}
        testID='choose-avatar-image-button'
      />
      <View style={styles.quickActions}>
        <MobileActionButton
          accentColor={theme.accentStrong}
          disabledContentColor={theme.placeholder}
          primaryContentColor={theme.surface}
          styles={styles}
          accessibilityState={{ expanded: showQuickProfileQr }}
          disabled={!profileReady}
          icon={QrCode}
          label='Show My QR'
          onPress={() => setShowQuickProfileQr((value) => !value)}
          testID='quick-show-my-qr-button'
          variant='primary'
        />
        {showQuickProfileQr ? (
          <QrCard backgroundColor={theme.raised} styles={styles} value={profileQrUri} />
        ) : null}
        <MobileActionButton
          accentColor={theme.accentStrong}
          disabledContentColor={theme.placeholder}
          primaryContentColor={theme.surface}
          styles={styles}
          disabled={!profileReady}
          icon={UserPlus}
          label='Add friend'
          onPress={onOpenContacts}
          testID='quick-open-contacts-button'
        />
        <MobileActionButton
          accentColor={theme.accentStrong}
          disabledContentColor={theme.placeholder}
          primaryContentColor={theme.surface}
          styles={styles}
          disabled={!homeReady}
          icon={House}
          label='Open Home'
          onPress={onCreateRoom}
          testID='create-home-button'
        />
      </View>
    </View>
  )
}
