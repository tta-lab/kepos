import { Platform, StatusBar, StyleSheet } from 'react-native'
import type { MobileThemeTokens } from '../src/mobile-theme-tokens.ts'

export function createMobileStyles(theme: MobileThemeTokens) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
    },
    screen: {
      flex: 1,
      backgroundColor: theme.surface
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    brandRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12
    },
    mark: {
      alignItems: 'center',
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      height: 34,
      justifyContent: 'center',
      width: 34
    },
    kicker: {
      color: theme.inkMuted,
      fontSize: 12,
      letterSpacing: 0,
      textTransform: 'uppercase'
    },
    title: {
      color: theme.ink,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 0
    },
    mobileStatusStrip: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8
    },
    homeStatusPill: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.quickPanel,
      borderColor: theme.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 7,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    treeholeStatusPill: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.raised,
      borderColor: theme.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 32,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    statusDot: {
      backgroundColor: theme.statusDot,
      borderRadius: 4,
      height: 8,
      width: 8
    },
    statusText: {
      color: theme.statusText,
      fontSize: 13,
      fontWeight: '700'
    },
    treeholeStatusText: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '700'
    },
    notice: {
      color: theme.inkMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 8
    },
    lobby: {
      gap: 14,
      padding: 18
    },
    lobbyScroll: {
      flex: 1
    },
    peoplePane: {
      gap: 14,
      padding: 18
    },
    panel: {
      backgroundColor: theme.panel,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 16
    },
    panelTitle: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: 0
    },
    panelCopy: {
      color: theme.inkSoft,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6
    },
    taskHeader: {
      gap: 4
    },
    taskEyebrow: {
      color: theme.accentStrong,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0,
      textTransform: 'uppercase'
    },
    taskTitle: {
      color: theme.ink,
      fontSize: 21,
      fontWeight: '900',
      letterSpacing: 0
    },
    taskDescription: {
      color: theme.inkSoft,
      fontSize: 14,
      lineHeight: 20
    },
    panelEmpty: {
      alignItems: 'flex-start',
      backgroundColor: theme.quickPanel,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      padding: 12
    },
    panelEmptyText: {
      flex: 1
    },
    panelEmptyTitle: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: '800'
    },
    panelEmptyCopy: {
      color: theme.inkMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4
    },
    quickStartPanel: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      padding: 16
    },
    quickActions: {
      gap: 10,
      marginTop: 16
    },
    field: {
      marginTop: 16
    },
    label: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 7,
      textTransform: 'uppercase'
    },
    input: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 17,
      minHeight: 48,
      paddingHorizontal: 13
    },
    keyInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 14,
      minHeight: 96,
      padding: 13
    },
    qrCard: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 14,
      padding: 10
    },
    scannerOverlay: {
      backgroundColor: theme.scanner,
      flex: 1
    },
    scannerCamera: {
      flex: 1,
      minHeight: 0
    },
    scannerPermission: {
      alignItems: 'center',
      flex: 1,
      gap: 10,
      justifyContent: 'center',
      padding: 28
    },
    scannerPermissionTitle: {
      color: theme.ink,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center'
    },
    scannerPermissionCopy: {
      color: theme.inkMuted,
      fontSize: 15,
      lineHeight: 21,
      maxWidth: 280,
      textAlign: 'center'
    },
    scannerControls: {
      alignItems: 'center',
      bottom: 0,
      left: 0,
      paddingBottom: 28,
      paddingTop: 16,
      position: 'absolute',
      right: 0
    },
    scannerCancel: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: theme.surface,
      borderRadius: 8,
      minHeight: 46,
      paddingHorizontal: 22,
      justifyContent: 'center'
    },
    scannerCancelText: {
      color: theme.accentStrong,
      fontSize: 15,
      fontWeight: '900'
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      marginTop: 16,
      minHeight: 50
    },
    primaryButtonText: {
      color: theme.surface,
      fontSize: 16,
      fontWeight: '800'
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: theme.accentStrong,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      marginTop: 14,
      minHeight: 50
    },
    secondaryButtonText: {
      color: theme.accentStrong,
      fontSize: 16,
      fontWeight: '800'
    },
    disabledButton: {
      borderColor: theme.disabledBorder
    },
    disabledButtonText: {
      color: theme.placeholder
    },
    chat: {
      flex: 1
    },
    roomContent: {
      flex: 1,
      minHeight: 0
    },
    tabs: {
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    tabButton: {
      alignItems: 'center',
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      justifyContent: 'center',
      minHeight: 40,
      position: 'relative'
    },
    activeTabButton: {
      backgroundColor: theme.accentStrong,
      borderColor: theme.accentStrong
    },
    tabIcon: {
      marginBottom: 1
    },
    tabBadge: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderColor: theme.surface,
      borderRadius: 999,
      borderWidth: 1,
      height: 20,
      justifyContent: 'center',
      minWidth: 20,
      paddingHorizontal: 5,
      position: 'absolute',
      right: 8,
      top: 5
    },
    tabBadgeText: {
      color: theme.surface,
      fontSize: 10,
      fontWeight: '900',
      lineHeight: 12
    },
    roomBar: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8
    },
    sessionStrip: {
      flex: 1,
      gap: 6,
      paddingRight: 12
    },
    sessionBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 7,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    sessionBadgeText: {
      color: theme.inkSoft,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    roomActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10
    },
    roomAdvancedButton: {
      alignItems: 'center',
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      height: 36,
      justifyContent: 'center',
      paddingHorizontal: 12
    },
    roomAdvancedPanel: {
      backgroundColor: theme.panel,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    roomLabel: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase'
    },
    roomName: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: '800',
      marginTop: 2
    },
    roomOwnerName: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900'
    },
    roomOwnerMeta: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '700'
    },
    roomKey: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 2
    },
    iconButton: {
      alignItems: 'center',
      backgroundColor: theme.quickPanel,
      borderRadius: 8,
      height: 36,
      justifyContent: 'center',
      width: 36
    },
    messageList: {
      flexGrow: 1,
      gap: 10,
      padding: 18
    },
    paneLabel: {
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      gap: 2,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    paneEyebrow: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    paneTitle: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: '800'
    },
    empty: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: 280
    },
    emptyTitle: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 12
    },
    emptyCopy: {
      color: theme.inkMuted,
      fontSize: 14,
      marginTop: 5
    },
    bubble: {
      borderRadius: 8,
      maxWidth: '82%',
      paddingHorizontal: 13,
      paddingVertical: 10
    },
    directBubbleRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 8,
      width: '100%'
    },
    outDirectBubbleRow: {
      flexDirection: 'row-reverse'
    },
    directBubble: {
      maxWidth: '72%'
    },
    outBubble: {
      alignSelf: 'flex-end',
      backgroundColor: theme.accentStrong
    },
    inBubble: {
      alignSelf: 'flex-start',
      backgroundColor: theme.quickPanel
    },
    bubbleMeta: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    bubbleMetaRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 16
    },
    inBubbleMeta: {
      color: theme.inkSoft
    },
    bubbleTextBlock: {
      borderRadius: 7,
      marginTop: 6,
      paddingHorizontal: 1,
      paddingVertical: 1
    },
    inBubbleTextBlock: {
      backgroundColor: theme.quickPanel
    },
    outBubbleTextBlock: {
      backgroundColor: theme.accentStrong
    },
    bubbleText: {
      color: theme.surface,
      fontSize: 16,
      lineHeight: 22
    },
    inBubbleText: {
      color: theme.ink
    },
    requestButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.accent,
      borderRadius: 7,
      flexDirection: 'row',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 7
    },
    requestButtonText: {
      color: theme.surface,
      fontSize: 12,
      fontWeight: '900'
    },
    requestActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8
    },
    requestIgnoreButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderColor: theme.borderStrong,
      borderRadius: 7,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 7
    },
    requestIgnoreButtonText: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '900'
    },
    composer: {
      alignItems: 'center',
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
      padding: 14
    },
    directComposer: {
      borderTopColor: theme.border,
      borderTopWidth: 1
    },
    directThreadHeader: {
      alignItems: 'center',
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 12,
      marginTop: 10,
      padding: 12
    },
    directThreadHeaderText: {
      flex: 1,
      minWidth: 0
    },
    directThreadEyebrow: {
      color: theme.inkMuted,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    directThreadTitle: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 2
    },
    directThreadMeta: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2
    },
    requestTargetCard: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 10,
      borderWidth: 1,
      marginHorizontal: 12,
      marginTop: 10,
      padding: 12
    },
    requestTargetEyebrow: {
      color: theme.accentStrong,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    requestTargetIdentity: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      marginTop: 6
    },
    requestTargetText: {
      flex: 1,
      minWidth: 0
    },
    requestTargetTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900'
    },
    requestTargetProfile: {
      color: theme.inkMuted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2
    },
    requestTargetCopy: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6
    },
    threadList: {
      gap: 6,
      paddingHorizontal: 12,
      paddingTop: 10
    },
    threadListTitle: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    threadRow: {
      alignItems: 'center',
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    threadText: {
      flex: 1,
      gap: 3,
      minWidth: 0
    },
    activeThreadRow: {
      backgroundColor: theme.accentStrong,
      borderColor: theme.accentStrong
    },
    threadRowHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'space-between'
    },
    threadName: {
      color: theme.ink,
      flex: 1,
      fontSize: 13,
      fontWeight: '900'
    },
    threadTime: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '800'
    },
    threadMetaCluster: {
      alignItems: 'center',
      flexDirection: 'row',
      flexShrink: 0,
      gap: 6
    },
    threadUnreadBadge: {
      backgroundColor: theme.accentStrong,
      borderRadius: 999,
      color: theme.surface,
      fontSize: 10,
      fontWeight: '900',
      overflow: 'hidden',
      paddingHorizontal: 6,
      paddingVertical: 3
    },
    threadMeta: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2
    },
    threadStatus: {
      color: theme.inkSoft,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase'
    },
    threadRequestActions: {
      flexDirection: 'row',
      gap: 5
    },
    activeThreadText: {
      color: theme.surface
    },
    directEmptyContacts: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      marginHorizontal: 14,
      marginTop: 14,
      padding: 12
    },
    directAdvancedToggle: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      marginHorizontal: 14,
      marginTop: 12,
      minHeight: 30
    },
    advancedSummary: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    contactScroller: {
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 14
    },
    contactChip: {
      alignItems: 'center',
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 7,
      minHeight: 34,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    activeContactChip: {
      backgroundColor: theme.accentStrong,
      borderColor: theme.accentStrong
    },
    contactChipText: {
      color: theme.accentStrong,
      fontSize: 12,
      fontWeight: '900'
    },
    activeContactChipText: {
      color: theme.surface
    },
    contactRow: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      paddingVertical: 10
    },
    contactRowText: {
      flex: 1,
      minWidth: 0
    },
    contactBlockedSection: {
      marginTop: 16
    },
    contactName: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '800'
    },
    contactProfile: {
      color: theme.inkMuted,
      fontSize: 12,
      marginTop: 2
    },
    trustMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 7
    },
    trustStatus: {
      backgroundColor: theme.treeComment,
      borderColor: theme.treeCommentBorder,
      borderRadius: 999,
      borderWidth: 1,
      color: theme.accentStrong,
      fontSize: 11,
      fontWeight: '900',
      paddingHorizontal: 7,
      paddingVertical: 2
    },
    trustMetaText: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '700'
    },
    contactRecent: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 8,
      padding: 8
    },
    contactRecentTitle: {
      color: theme.ink,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    contactRecentCopy: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 15,
      marginTop: 3
    },
    contactRecentPost: {
      backgroundColor: theme.surface,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 7,
      padding: 8
    },
    contactRecentPostText: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18
    },
    contactRecentPostMeta: {
      color: theme.inkMuted,
      fontSize: 10,
      fontWeight: '700',
      marginTop: 3
    },
    contactActions: {
      alignItems: 'center',
      gap: 6
    },
    contactProfileDetail: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
      marginTop: 14,
      padding: 12
    },
    contactProfileHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 10
    },
    contactAvatar: {
      alignItems: 'center',
      borderRadius: 8,
      height: 44,
      justifyContent: 'center',
      width: 44
    },
    contactAvatarSmall: {
      alignItems: 'center',
      borderRadius: 7,
      height: 28,
      justifyContent: 'center',
      width: 28
    },
    contactAvatarLarge: {
      alignItems: 'center',
      borderRadius: 8,
      height: 48,
      justifyContent: 'center',
      width: 48
    },
    contactAvatarText: {
      color: theme.surface,
      fontSize: 13,
      fontWeight: '900'
    },
    contactAvatarImage: {
      borderRadius: 8,
      height: '100%',
      width: '100%'
    },
    avatarTone0: {
      backgroundColor: theme.accentStrong
    },
    avatarTone1: {
      backgroundColor: theme.success
    },
    avatarTone2: {
      backgroundColor: theme.warning
    },
    avatarTone3: {
      backgroundColor: theme.info
    },
    avatarTone4: {
      backgroundColor: theme.danger
    },
    avatarTone5: {
      backgroundColor: theme.ink
    },
    contactProfileHeaderText: {
      flex: 1,
      minWidth: 0
    },
    contactProfileName: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: '900'
    },
    contactProfileActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
    },
    contactIdentity: {
      backgroundColor: theme.raised,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 10
    },
    contactIdentityTitle: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6
    },
    contactIdentityValue: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 16,
      marginTop: 4
    },
    requestCard: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      paddingVertical: 10
    },
    requestText: {
      flex: 1
    },
    requestTitle: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '800'
    },
    requestPreview: {
      color: theme.inkSoft,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 5
    },
    revokeButton: {
      alignItems: 'center',
      borderColor: theme.dangerBorder,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 38,
      paddingHorizontal: 10
    },
    revokeButtonText: {
      color: theme.danger,
      fontSize: 13,
      fontWeight: '800'
    },
    recipientInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 13,
      marginHorizontal: 14,
      marginTop: 14,
      minHeight: 42,
      paddingHorizontal: 12
    },
    messageInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      flex: 1,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: 13
    },
    sendButton: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 8,
      height: 48,
      justifyContent: 'center',
      width: 48
    },
    disabledSendButton: {
      backgroundColor: theme.disabled
    },
    treeholeList: {
      flexGrow: 1,
      gap: 12,
      padding: 18
    },
    post: {
      backgroundColor: theme.raised,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 14
    },
    postHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    treeholeAuthorRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexShrink: 1,
      gap: 8
    },
    postAuthor: {
      color: theme.accentStrong,
      fontSize: 13,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    postTime: {
      color: theme.inkMuted,
      fontSize: 12,
      fontWeight: '700'
    },
    postText: {
      color: theme.ink,
      fontSize: 17,
      lineHeight: 24,
      marginTop: 10
    },
    commentList: {
      gap: 8,
      marginTop: 12
    },
    comment: {
      backgroundColor: theme.treeComment,
      borderLeftColor: theme.treeCommentBorder,
      borderLeftWidth: 3,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    commentAuthor: {
      color: theme.inkSoft,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    commentAuthorRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 7
    },
    commentText: {
      color: theme.ink,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 3
    },
    postStats: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 12
    },
    postStat: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5
    },
    postStatText: {
      color: theme.inkSoft,
      fontSize: 13,
      fontWeight: '800'
    },
    postActions: {
      gap: 8,
      marginTop: 12
    },
    smallActionButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 10
    },
    disabledSmallActionButton: {
      borderColor: theme.disabledBorder,
      opacity: 0.65
    },
    smallActionText: {
      color: theme.accentStrong,
      fontSize: 13,
      fontWeight: '800'
    },
    commentComposer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8
    },
    commentInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      flex: 1,
      fontSize: 14,
      minHeight: 42,
      paddingHorizontal: 11
    },
    smallSendButton: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 8,
      height: 42,
      justifyContent: 'center',
      width: 42
    },
    treeholeComposer: {
      alignItems: 'flex-end',
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
      padding: 14
    },
    treeholeComposerFields: {
      flex: 1,
      gap: 6
    },
    composerHint: {
      color: theme.inkMuted,
      fontSize: 12,
      lineHeight: 16
    },
    treeholeInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 16,
      lineHeight: 22,
      maxHeight: 118,
      minHeight: 64,
      paddingHorizontal: 13,
      paddingVertical: 10
    },
    disabledTreeholeInput: {
      backgroundColor: theme.field,
      borderColor: theme.disabledBorder,
      color: theme.inkMuted
    }
  })
}

export type MobileStyles = ReturnType<typeof createMobileStyles>
