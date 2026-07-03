const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

export type AdvancedSocialActionStateInput = {
  canJoinHome?: boolean
  canUseHomeQrJoin?: boolean
  canUseManualHomeJoin?: boolean
  canUseTrustProfile?: boolean
  homeQrUri?: string | null
  homeReady?: boolean
  roomKey?: string | null
  trustQrUri?: string | null
}

export type AdvancedSocialActionState = {
  canJoinHomeQr: boolean
  canJoinManualHome: boolean
  canScanHomeQr: boolean
  canShowHomeQr: boolean
  canTrustProfile: boolean
  homeQrUri: string
  roomKey: string
  trustQrUri: string
}

export function createAdvancedSocialActionState({
  canJoinHome = true,
  canUseHomeQrJoin,
  canUseManualHomeJoin = true,
  canUseTrustProfile = true,
  homeQrUri,
  homeReady = true,
  roomKey,
  trustQrUri
}: AdvancedSocialActionStateInput = {}): AdvancedSocialActionState {
  const cleanHomeQrUri = typeof homeQrUri === 'string' ? homeQrUri.trim() : ''
  const cleanRoomKey = typeof roomKey === 'string' ? roomKey.trim() : ''
  const cleanTrustQrUri = typeof trustQrUri === 'string' ? trustQrUri.trim() : ''
  const canUseHomeJoin = homeReady && canJoinHome && (canUseHomeQrJoin ?? true)

  return {
    canJoinHomeQr: canUseHomeJoin && Boolean(cleanHomeQrUri),
    canJoinManualHome: canUseManualHomeJoin && ROOM_KEY_PATTERN.test(cleanRoomKey),
    canScanHomeQr: canUseHomeJoin,
    canShowHomeQr: homeReady,
    canTrustProfile: canUseTrustProfile && Boolean(cleanTrustQrUri),
    homeQrUri: cleanHomeQrUri,
    roomKey: cleanRoomKey,
    trustQrUri: cleanTrustQrUri
  }
}
