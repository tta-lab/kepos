import type { ComponentType } from 'react'
import type {
  AccessibilityState,
  GestureResponderEvent,
  StyleProp,
  TextStyle,
  ViewStyle
} from 'react-native'
import { Pressable, Text } from 'react-native'
import { Check, Send, Settings, X } from 'lucide-react-native'

type MobileSmallActionIcon = ComponentType<{
  color?: string
  size?: number
}>

export type MobileActionButtonStyles = {
  disabledButton: StyleProp<ViewStyle>
  disabledButtonText: StyleProp<TextStyle>
  primaryButton: StyleProp<ViewStyle>
  primaryButtonText: StyleProp<TextStyle>
  secondaryButton: StyleProp<ViewStyle>
  secondaryButtonText: StyleProp<TextStyle>
}

export type MobileActionButtonProps = {
  accessibilityState?: AccessibilityState
  accentColor: string
  disabledContentColor: string
  disabled?: boolean
  icon: MobileSmallActionIcon
  label: string
  onPress?: (event: GestureResponderEvent) => void
  primaryContentColor: string
  styles: MobileActionButtonStyles
  testID?: string
  variant?: 'primary' | 'secondary'
}

export function MobileActionButton({
  accessibilityState,
  accentColor,
  disabled = false,
  disabledContentColor,
  icon: Icon,
  label,
  onPress,
  primaryContentColor,
  styles,
  testID,
  variant = 'secondary'
}: MobileActionButtonProps) {
  const isPrimary = variant === 'primary'
  const iconColor = isPrimary ? primaryContentColor : disabled ? disabledContentColor : accentColor
  const buttonAccessibilityState = { ...accessibilityState, disabled }

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={buttonAccessibilityState}
      disabled={disabled}
      onPress={onPress}
      style={[
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.disabledButton
      ]}
      testID={testID}
    >
      <Icon color={iconColor} size={18} />
      <Text
        style={[
          isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
          disabled && styles.disabledButtonText
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export type MobileScannerCancelButtonStyles = {
  scannerCancel: StyleProp<ViewStyle>
  scannerCancelText: StyleProp<TextStyle>
}

export type MobileScannerCancelButtonProps = {
  onPress?: (event: GestureResponderEvent) => void
  styles: MobileScannerCancelButtonStyles
}

export function MobileScannerCancelButton({ onPress, styles }: MobileScannerCancelButtonProps) {
  return (
    <Pressable
      accessibilityLabel='Cancel QR scan'
      accessibilityRole='button'
      onPress={onPress}
      style={styles.scannerCancel}
      testID='qr-scanner-cancel'
    >
      <Text style={styles.scannerCancelText}>Cancel</Text>
    </Pressable>
  )
}

export type MobileIconButtonStyles = {
  iconButton: StyleProp<ViewStyle>
}

export type MobileIconButtonProps = {
  accessibilityLabel: string
  accentColor: string
  icon: MobileSmallActionIcon
  onPress?: (event: GestureResponderEvent) => void
  styles: MobileIconButtonStyles
  testID?: string
}

export function MobileIconButton({
  accessibilityLabel,
  accentColor,
  icon: Icon,
  onPress,
  styles,
  testID
}: MobileIconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole='button'
      onPress={onPress}
      style={styles.iconButton}
      testID={testID}
    >
      <Icon color={accentColor} size={18} />
    </Pressable>
  )
}

export type MobileSmallActionButtonStyles = {
  disabledSmallActionButton: StyleProp<ViewStyle>
  revokeButton: StyleProp<ViewStyle>
  revokeButtonText: StyleProp<TextStyle>
  smallActionButton: StyleProp<ViewStyle>
  smallActionText: StyleProp<TextStyle>
}

export type MobileSmallActionButtonProps = {
  accessibilityLabel: string
  accentColor: string
  dangerColor: string
  disabled?: boolean
  icon: MobileSmallActionIcon
  label: string
  onPress?: (event: GestureResponderEvent) => void
  styles: MobileSmallActionButtonStyles
  testID?: string
  variant?: 'danger' | 'normal'
}

export function MobileSmallActionButton({
  accessibilityLabel,
  accentColor,
  dangerColor,
  disabled = false,
  icon: Icon,
  label,
  onPress,
  styles,
  testID,
  variant = 'normal'
}: MobileSmallActionButtonProps) {
  const isDanger = variant === 'danger'
  const iconColor = isDanger ? dangerColor : accentColor

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        isDanger ? styles.revokeButton : styles.smallActionButton,
        disabled && styles.disabledSmallActionButton
      ]}
      testID={testID}
    >
      <Icon color={iconColor} size={isDanger ? 18 : 15} />
      <Text style={isDanger ? styles.revokeButtonText : styles.smallActionText}>{label}</Text>
    </Pressable>
  )
}

export type MobileAdvancedToggleStyles = {
  advancedSummary: StyleProp<TextStyle>
  directAdvancedToggle: StyleProp<ViewStyle>
  roomAdvancedButton: StyleProp<ViewStyle>
}

export type MobileAdvancedToggleProps = {
  expanded: boolean
  iconColor: string
  onPress?: (event: GestureResponderEvent) => void
  styles: MobileAdvancedToggleStyles
  testID?: string
  variant?: 'compact' | 'room'
}

export function MobileAdvancedToggle({
  expanded,
  iconColor,
  onPress,
  styles,
  testID,
  variant = 'room'
}: MobileAdvancedToggleProps) {
  const isCompact = variant === 'compact'

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={isCompact ? styles.directAdvancedToggle : styles.roomAdvancedButton}
      testID={testID}
    >
      <Settings color={iconColor} size={15} />
      <Text style={styles.advancedSummary}>Advanced</Text>
    </Pressable>
  )
}

export type MobileSendButtonStyles = {
  disabledSendButton: StyleProp<ViewStyle>
  sendButton: StyleProp<ViewStyle>
  smallSendButton: StyleProp<ViewStyle>
}

export type MobileSendButtonProps = {
  accessibilityLabel: string
  disabled?: boolean
  onPress?: (event: GestureResponderEvent) => void
  size?: 'normal' | 'small'
  styles: MobileSendButtonStyles
  surfaceColor: string
  testID?: string
}

export function MobileSendButton({
  accessibilityLabel,
  disabled = false,
  onPress,
  size = 'normal',
  styles,
  surfaceColor,
  testID
}: MobileSendButtonProps) {
  const isSmall = size === 'small'

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        isSmall ? styles.smallSendButton : styles.sendButton,
        disabled && styles.disabledSendButton
      ]}
      testID={testID}
    >
      <Send color={surfaceColor} size={isSmall ? 15 : 18} />
    </Pressable>
  )
}

export type MobileRequestActionButtonStyles = {
  disabledButton: StyleProp<ViewStyle>
  requestButton: StyleProp<ViewStyle>
  requestButtonText: StyleProp<TextStyle>
  requestIgnoreButton: StyleProp<ViewStyle>
  requestIgnoreButtonText: StyleProp<TextStyle>
}

export type MobileRequestActionButtonProps = {
  acceptContentColor: string
  disabled?: boolean
  ignoreContentColor: string
  onPress?: (event: GestureResponderEvent) => void
  styles: MobileRequestActionButtonStyles
  testID?: string
  variant: 'accept' | 'ignore'
}

export function MobileRequestActionButton({
  acceptContentColor,
  disabled = false,
  ignoreContentColor,
  onPress,
  styles,
  testID,
  variant
}: MobileRequestActionButtonProps) {
  const isAccept = variant === 'accept'
  const Icon = isAccept ? Check : X
  const label = isAccept ? 'Accept' : 'Ignore'
  const accessibilityLabel = isAccept ? 'Accept friend request' : 'Ignore friend request'

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        isAccept ? styles.requestButton : styles.requestIgnoreButton,
        disabled && styles.disabledButton
      ]}
      testID={testID}
    >
      <Icon color={isAccept ? acceptContentColor : ignoreContentColor} size={14} />
      <Text style={isAccept ? styles.requestButtonText : styles.requestIgnoreButtonText}>
        {label}
      </Text>
    </Pressable>
  )
}
