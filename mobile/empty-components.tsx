import type { ComponentType } from 'react'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Text, View } from 'react-native'
import { MessageCircle, Send, Sprout } from 'lucide-react-native'
import { getMobileTreeholeEmptyCopy } from '../src/mobile-product-copy.ts'

export type EmptyStateIconProps = {
  color?: string
  size?: number
}

export type EmptyStateStyles = {
  empty: StyleProp<ViewStyle>
  emptyCopy: StyleProp<TextStyle>
  emptyTitle: StyleProp<TextStyle>
}

export type EmptyStateTheme = {
  iconMuted: string
}

export type EmptyStateProps = {
  copy: string
  icon: ComponentType<EmptyStateIconProps>
  styles: EmptyStateStyles
  theme: EmptyStateTheme
  title: string
}

export function EmptyState({ copy, icon: Icon, styles, theme, title }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <Icon color={theme.iconMuted} size={34} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  )
}

export type EmptyMessagesProps = {
  copy?: string
  styles: EmptyStateStyles
  theme: EmptyStateTheme
}

export function EmptyMessages({ styles, theme }: EmptyMessagesProps) {
  return (
    <EmptyState
      copy='Send the first line from this phone.'
      icon={MessageCircle}
      styles={styles}
      theme={theme}
      title='No messages yet'
    />
  )
}

export function EmptyDirectMessages({
  copy = 'Choose a trusted contact and send the first message.',
  styles,
  theme
}: EmptyMessagesProps) {
  return (
    <EmptyState copy={copy} icon={Send} styles={styles} theme={theme} title='No messages yet' />
  )
}

export type EmptyTreeholeProps = {
  canPost?: boolean
  status?: string
  styles: EmptyStateStyles
  theme: EmptyStateTheme
}

export function EmptyTreehole({ canPost = true, status, styles, theme }: EmptyTreeholeProps) {
  return (
    <EmptyState
      copy={getMobileTreeholeEmptyCopy(status, { canPost })}
      icon={Sprout}
      styles={styles}
      theme={theme}
      title='No posts yet'
    />
  )
}
