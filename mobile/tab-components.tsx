import type { ComponentType } from 'react'
import type { GestureResponderEvent, StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Pressable, Text, View } from 'react-native'
import { formatPendingBadgeCount, getMobileTabButtonLabel } from '../src/mobile-product-copy.ts'

export type TabButtonIconProps = {
  color?: string
  size?: number
  style?: StyleProp<ViewStyle>
}

export type TabButtonStyles = {
  activeTabButton: StyleProp<ViewStyle>
  tabBadge: StyleProp<ViewStyle>
  tabBadgeText: StyleProp<TextStyle>
  tabButton: StyleProp<ViewStyle>
  tabIcon: StyleProp<ViewStyle>
}

export type TabButtonProps = {
  active: boolean
  badgeCount?: number
  icon: ComponentType<TabButtonIconProps>
  iconColor: string
  label: string
  onPress?: (event: GestureResponderEvent) => void
  selectedIconColor: string
  styles: TabButtonStyles
  testID?: string
}

export function TabButton({
  active,
  badgeCount = 0,
  icon: Icon,
  iconColor,
  label,
  onPress,
  selectedIconColor,
  styles,
  testID
}: TabButtonProps) {
  return (
    <Pressable
      accessibilityLabel={getMobileTabButtonLabel(label, badgeCount)}
      accessibilityRole='tab'
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTabButton]}
      testID={testID}
    >
      <Icon color={active ? selectedIconColor : iconColor} size={20} style={styles.tabIcon} />
      {badgeCount > 0 ? (
        <View style={styles.tabBadge} accessibilityLabel={`${label} pending ${badgeCount}`}>
          <Text style={styles.tabBadgeText}>{formatPendingBadgeCount(badgeCount)}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}
