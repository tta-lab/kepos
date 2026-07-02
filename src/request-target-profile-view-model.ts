import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'

export type RequestTargetProfileInput = {
  avatar?: ProfileAvatarViewModel
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
  avatarUri?: string
  displayName?: string
  profileId: string
  shortProfileId?: string
  statusLabel?: string
}

export type RequestTargetProfileViewModel = {
  avatar: ProfileAvatarViewModel
  canRemove: false
  displayName: string
  enterHomeEnabled: false
  enterHomeLabel: string
  messageEnabled: false
  messageLabel: string
  profileId: string
  recentCopy: string
  recentTitle: string
  relationshipState: 'request_target'
  revokeLabel: string
  shortProfileId: string
  sourceLabel: string
  statusLabel: string
  trustedAtLabel: string
}

export function createRequestTargetProfileViewModel({
  requestTarget,
  resolveAvatarMediaUri = null,
  selectedProfileId,
  shortenProfileId = (profileId) => profileId
}: {
  requestTarget?: RequestTargetProfileInput | null
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  selectedProfileId?: string | null
  shortenProfileId?: (profileId: string) => string
}): RequestTargetProfileViewModel | null {
  if (!selectedProfileId || requestTarget?.profileId !== selectedProfileId) return null
  const displayName = requestTarget.displayName || 'Profile'

  return {
    avatar:
      requestTarget.avatar ||
      createProfileAvatarViewModel({
        avatarMediaSnapshot: requestTarget.avatarMediaSnapshot,
        avatarUri: requestTarget.avatarUri,
        displayName,
        profileId: requestTarget.profileId,
        resolveAvatarMediaUri
      }),
    canRemove: false,
    displayName,
    enterHomeEnabled: false,
    enterHomeLabel: 'Enter Home',
    messageEnabled: false,
    messageLabel: 'Message',
    profileId: requestTarget.profileId,
    recentCopy: 'Recent posts will appear after this profile becomes trusted.',
    recentTitle: 'Recent posts',
    relationshipState: 'request_target',
    revokeLabel: 'Request pending',
    shortProfileId: requestTarget.shortProfileId || shortenProfileId(requestTarget.profileId),
    sourceLabel: 'From Profile QR',
    statusLabel: requestTarget.statusLabel || 'Friend request',
    trustedAtLabel: 'Not trusted yet'
  }
}
