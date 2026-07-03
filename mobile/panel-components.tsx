import type { ComponentType } from 'react'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Text, View } from 'react-native'

export type PanelEmptyStateIconProps = {
  color?: string
  size?: number
}

export type PanelEmptyStateStyles = {
  paneEyebrow: StyleProp<TextStyle>
  paneLabel: StyleProp<ViewStyle>
  paneTitle: StyleProp<TextStyle>
  taskDescription: StyleProp<TextStyle>
  taskEyebrow: StyleProp<TextStyle>
  taskHeader: StyleProp<ViewStyle>
  taskTitle: StyleProp<TextStyle>
  panelEmpty: StyleProp<ViewStyle>
  panelEmptyCopy: StyleProp<TextStyle>
  panelEmptyText: StyleProp<ViewStyle>
  panelEmptyTitle: StyleProp<TextStyle>
}

export type PaneLabelProps = {
  eyebrow: string
  styles: Pick<PanelEmptyStateStyles, 'paneEyebrow' | 'paneLabel' | 'paneTitle'>
  title: string
}

export type TaskHeaderProps = {
  description?: string
  eyebrow: string
  styles: Pick<
    PanelEmptyStateStyles,
    'taskDescription' | 'taskEyebrow' | 'taskHeader' | 'taskTitle'
  >
  title: string
}

export type PanelEmptyStateProps = {
  copy: string
  icon: ComponentType<PanelEmptyStateIconProps>
  iconColor: string
  styles: PanelEmptyStateStyles
  title: string
}

export function PanelEmptyState({
  copy,
  icon: Icon,
  iconColor,
  styles,
  title
}: PanelEmptyStateProps) {
  return (
    <View style={styles.panelEmpty}>
      <Icon color={iconColor} size={24} />
      <View style={styles.panelEmptyText}>
        <Text style={styles.panelEmptyTitle}>{title}</Text>
        <Text style={styles.panelEmptyCopy}>{copy}</Text>
      </View>
    </View>
  )
}

export function PaneLabel({ eyebrow, styles, title }: PaneLabelProps) {
  return (
    <View style={styles.paneLabel}>
      <Text style={styles.paneEyebrow}>{eyebrow}</Text>
      <Text style={styles.paneTitle}>{title}</Text>
    </View>
  )
}

export function TaskHeader({ description, eyebrow, styles, title }: TaskHeaderProps) {
  return (
    <View style={styles.taskHeader}>
      <Text style={styles.taskEyebrow}>{eyebrow}</Text>
      <Text style={styles.taskTitle}>{title}</Text>
      {description ? <Text style={styles.taskDescription}>{description}</Text> : null}
    </View>
  )
}
