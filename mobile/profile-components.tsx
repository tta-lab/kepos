import { useState } from 'react'
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Image, Pressable, Text, View } from 'react-native'
import {
  ArrowLeft,
  Fingerprint,
  House,
  RefreshCw,
  Send,
  User,
  UserMinus
} from 'lucide-react-native'
import type { MobileContactLike } from '../src/mobile-product-copy.ts'
import { formatMobileTrustedContactName } from '../src/mobile-product-copy.ts'
import { createProfileAvatarViewModel } from '../src/profile-avatar-view-model.ts'
import type {
  ProfileAvatarViewModel,
  ResolveAvatarMediaUri
} from '../src/profile-avatar-view-model.ts'
import { MobileSmallActionButton, type MobileSmallActionButtonStyles } from './action-components.js'

export type MobileProfileAvatarStyles = {
  avatarTone0: StyleProp<ViewStyle>
  avatarTone1: StyleProp<ViewStyle>
  avatarTone2: StyleProp<ViewStyle>
  avatarTone3: StyleProp<ViewStyle>
  avatarTone4: StyleProp<ViewStyle>
  avatarTone5: StyleProp<ViewStyle>
  contactAvatar: StyleProp<ViewStyle>
  contactAvatarImage: StyleProp<ImageStyle>
  contactAvatarLarge: StyleProp<ViewStyle>
  contactAvatarSmall: StyleProp<ViewStyle>
  contactAvatarText: StyleProp<TextStyle>
}

export type MobileProfileAvatarProps = {
  avatar?: ProfileAvatarViewModel
  size?: 'large' | 'normal' | 'small'
  styles: MobileProfileAvatarStyles
}

export type MobileContactChipStyles = MobileProfileAvatarStyles & {
  activeContactChip: StyleProp<ViewStyle>
  activeContactChipText: StyleProp<TextStyle>
  contactChip: StyleProp<ViewStyle>
  contactChipText: StyleProp<TextStyle>
}

export type MobileContactChipProps = {
  contact: MobileContactLike & {
    avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
    avatarUriSnapshot?: string | null
    profileId: string
  }
  onPress(): void
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  selected: boolean
  styles: MobileContactChipStyles
}

export type ProfileRequestTargetCardStyles = MobileProfileAvatarStyles & {
  requestTargetCard: StyleProp<ViewStyle>
  requestTargetCopy: StyleProp<TextStyle>
  requestTargetEyebrow: StyleProp<TextStyle>
  requestTargetIdentity: StyleProp<ViewStyle>
  requestTargetProfile: StyleProp<TextStyle>
  requestTargetText: StyleProp<ViewStyle>
  requestTargetTitle: StyleProp<TextStyle>
  smallActionButton: StyleProp<ViewStyle>
  smallActionText: StyleProp<TextStyle>
}

export type ProfileRequestTargetView = {
  avatar?: ProfileAvatarViewModel
  copy?: string
  displayName?: string
  profileId: string
  shortProfileId?: string
  statusLabel?: string
}

export type ProfileRequestTargetCardProps = {
  accentColor: string
  onOpenProfile(profileId: string): void
  recipient: string
  requestTarget?: ProfileRequestTargetView | null
  styles: ProfileRequestTargetCardStyles
}

export type ContactProfileRecentPost = {
  id: string
  metaLabel?: string
  text?: string
}

export type ContactProfileDetailView = {
  avatar?: ProfileAvatarViewModel
  canRemove?: boolean
  displayName: string
  enterHomeEnabled?: boolean
  enterHomeLabel: string
  messageLabel: string
  profileId: string
  recentCopy?: string
  recentPosts?: ContactProfileRecentPost[]
  recentTitle?: string
  shortProfileId?: string
  sourceLabel?: string
  statusLabel?: string
  trustedAtLabel?: string
}

export type ContactProfileDetailStyles = MobileProfileAvatarStyles &
  MobileSmallActionButtonStyles & {
    contactIdentity: StyleProp<ViewStyle>
    contactIdentityTitle: StyleProp<ViewStyle>
    contactIdentityValue: StyleProp<TextStyle>
    contactProfile: StyleProp<TextStyle>
    contactProfileActions: StyleProp<ViewStyle>
    contactProfileDetail: StyleProp<ViewStyle>
    contactProfileHeader: StyleProp<ViewStyle>
    contactProfileHeaderText: StyleProp<ViewStyle>
    contactProfileName: StyleProp<TextStyle>
    contactRecent: StyleProp<ViewStyle>
    contactRecentCopy: StyleProp<TextStyle>
    contactRecentPost: StyleProp<ViewStyle>
    contactRecentPostMeta: StyleProp<TextStyle>
    contactRecentPostText: StyleProp<TextStyle>
    contactRecentTitle: StyleProp<TextStyle>
    trustMeta: StyleProp<ViewStyle>
    trustMetaText: StyleProp<TextStyle>
    trustStatus: StyleProp<TextStyle>
  }

export type ContactProfileDetailTheme = {
  accentStrong: string
  danger: string
  ink: string
}

export type ContactProfileDetailProps = {
  onBack(): void
  onEnterContactHome(profileId: string): void
  onMessageContact(profileId: string): void
  onRevokeContact(profileId: string): void
  profile?: ContactProfileDetailView | null
  styles: ContactProfileDetailStyles
  theme: ContactProfileDetailTheme
}

export function MobileProfileAvatar({ avatar, size = 'normal', styles }: MobileProfileAvatarProps) {
  return (
    <View
      accessibilityLabel={avatar?.label || 'Profile avatar'}
      accessibilityRole='image'
      style={[
        size === 'large'
          ? styles.contactAvatarLarge
          : size === 'small'
            ? styles.contactAvatarSmall
            : styles.contactAvatar,
        getMobileAvatarToneStyle(styles, avatar?.tone)
      ]}
    >
      {avatar?.imageUri ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: avatar.imageUri }}
          style={styles.contactAvatarImage}
        />
      ) : (
        <Text style={styles.contactAvatarText}>{avatar?.initials || '?'}</Text>
      )}
    </View>
  )
}

export function MobileContactChip({
  contact,
  onPress,
  resolveAvatarMediaUri = null,
  selected,
  styles
}: MobileContactChipProps) {
  const label = formatMobileTrustedContactName(contact)
  const avatar = createProfileAvatarViewModel({
    avatarMediaSnapshot: contact.avatarMediaSnapshot,
    avatarUri: contact.avatarUriSnapshot,
    displayName: label,
    profileId: contact.profileId,
    resolveAvatarMediaUri
  })

  return (
    <Pressable
      accessibilityLabel={`Message recipient ${label}`}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.contactChip, selected && styles.activeContactChip]}
    >
      <MobileProfileAvatar avatar={avatar} size='small' styles={styles} />
      <Text style={[styles.contactChipText, selected && styles.activeContactChipText]}>
        {label}
      </Text>
    </Pressable>
  )
}

export function ProfileRequestTargetCard({
  accentColor,
  onOpenProfile,
  recipient,
  requestTarget,
  styles
}: ProfileRequestTargetCardProps) {
  if (!requestTarget || requestTarget.profileId !== recipient) {
    return null
  }

  const displayName = requestTarget.displayName || 'Profile'

  return (
    <View style={styles.requestTargetCard} testID='profile-request-target-card'>
      <Text style={styles.requestTargetEyebrow}>{requestTarget.statusLabel}</Text>
      <View style={styles.requestTargetIdentity}>
        <MobileProfileAvatar avatar={requestTarget.avatar} styles={styles} />
        <View style={styles.requestTargetText}>
          <Text style={styles.requestTargetTitle}>{displayName}</Text>
          <Text style={styles.requestTargetProfile}>{requestTarget.shortProfileId}</Text>
        </View>
      </View>
      <Text style={styles.requestTargetCopy}>{requestTarget.copy}</Text>
      <Pressable
        accessibilityLabel={`Open ${displayName} profile`}
        accessibilityRole='button'
        onPress={() => onOpenProfile(requestTarget.profileId)}
        style={styles.smallActionButton}
      >
        <User color={accentColor} size={15} />
        <Text style={styles.smallActionText}>Profile</Text>
      </Pressable>
    </View>
  )
}

export function ContactProfileDetail({
  onBack,
  onEnterContactHome,
  onMessageContact,
  onRevokeContact,
  profile,
  styles,
  theme
}: ContactProfileDetailProps) {
  const [showAdvancedIdentity, setShowAdvancedIdentity] = useState(false)

  if (!profile) return null
  const canRemove = profile.canRemove !== false

  return (
    <View
      accessibilityLabel={`${profile.displayName} profile`}
      style={styles.contactProfileDetail}
      testID='contact-profile-detail'
    >
      <View style={styles.contactProfileHeader}>
        <MobileProfileAvatar avatar={profile.avatar} size='large' styles={styles} />
        <View style={styles.contactProfileHeaderText}>
          <Text style={styles.contactProfileName}>{profile.displayName}</Text>
          <Text style={styles.contactProfile}>{profile.shortProfileId}</Text>
          <View style={styles.trustMeta}>
            <Text style={styles.trustStatus}>{profile.statusLabel}</Text>
            <Text style={styles.trustMetaText}>{profile.sourceLabel}</Text>
            <Text style={styles.trustMetaText}>{profile.trustedAtLabel}</Text>
          </View>
        </View>
        <MobileSmallActionButton
          accentColor={theme.accentStrong}
          dangerColor={theme.danger}
          styles={styles}
          accessibilityLabel={`Back from ${profile.displayName} profile`}
          icon={ArrowLeft}
          label='Back'
          onPress={onBack}
        />
      </View>
      <View style={styles.contactProfileActions}>
        <MobileSmallActionButton
          accentColor={theme.accentStrong}
          dangerColor={theme.danger}
          styles={styles}
          accessibilityLabel={`Message ${profile.displayName}`}
          icon={Send}
          label={profile.messageLabel}
          onPress={() => onMessageContact(profile.profileId)}
        />
        <MobileSmallActionButton
          accentColor={theme.accentStrong}
          dangerColor={theme.danger}
          styles={styles}
          accessibilityLabel={`Enter ${profile.displayName} home`}
          disabled={!profile.enterHomeEnabled}
          icon={House}
          label={profile.enterHomeLabel}
          onPress={() => onEnterContactHome(profile.profileId)}
        />
        {canRemove ? (
          <MobileSmallActionButton
            accentColor={theme.accentStrong}
            dangerColor={theme.danger}
            styles={styles}
            accessibilityLabel={`Remove ${profile.displayName} as friend`}
            icon={UserMinus}
            label='Remove friend'
            onPress={() => onRevokeContact(profile.profileId)}
            variant='danger'
          />
        ) : null}
      </View>
      <View style={styles.contactRecent}>
        <Text style={styles.contactRecentTitle}>{profile.recentTitle}</Text>
        <Text style={styles.contactRecentCopy}>{profile.recentCopy}</Text>
        {profile.enterHomeEnabled ? (
          <MobileSmallActionButton
            accentColor={theme.accentStrong}
            dangerColor={theme.danger}
            styles={styles}
            accessibilityLabel={`Refresh recent posts from ${profile.displayName}`}
            icon={RefreshCw}
            label='Refresh posts'
            onPress={() => onEnterContactHome(profile.profileId)}
          />
        ) : null}
        {profile.recentPosts?.map((post) => (
          <View key={post.id} style={styles.contactRecentPost}>
            <Text style={styles.contactRecentPostText}>{post.text}</Text>
            <Text style={styles.contactRecentPostMeta}>{post.metaLabel}</Text>
          </View>
        ))}
      </View>
      <View style={styles.contactIdentity}>
        <Pressable
          accessibilityLabel='Advanced identity'
          accessibilityRole='button'
          accessibilityState={{ expanded: showAdvancedIdentity }}
          onPress={() => setShowAdvancedIdentity((value) => !value)}
          style={styles.contactIdentityTitle}
          testID='contact-advanced-identity-toggle'
        >
          <Fingerprint color={theme.ink} size={13} />
          <Text style={styles.contactRecentTitle}>Advanced identity</Text>
        </Pressable>
        {showAdvancedIdentity ? (
          <>
            <Text style={styles.contactRecentCopy}>Profile fingerprint</Text>
            <Text style={styles.contactIdentityValue}>{profile.profileId}</Text>
          </>
        ) : null}
      </View>
    </View>
  )
}

function getMobileAvatarToneStyle(styles: MobileProfileAvatarStyles, tone?: string) {
  if (tone === 'avatarTone1') return styles.avatarTone1
  if (tone === 'avatarTone2') return styles.avatarTone2
  if (tone === 'avatarTone3') return styles.avatarTone3
  if (tone === 'avatarTone4') return styles.avatarTone4
  if (tone === 'avatarTone5') return styles.avatarTone5
  return styles.avatarTone0
}
