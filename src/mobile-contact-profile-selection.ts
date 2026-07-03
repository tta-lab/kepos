import type { ContactBookContact } from './contact-book.ts'
import {
  createContactProfileViewModel,
  type ContactProfileViewModel
} from './contact-profile-view-model.ts'
import {
  createProfileRecentPostsViewModel,
  type ProfileRecentPostCache,
  type ProfileRecentPostsViewModel,
  type ProfileRecentTreeholePost
} from './profile-recent-posts-view-model.ts'
import { selectProfileSelectionSource } from './profile-selection-source.ts'
import {
  createRequestTargetProfileViewModel,
  type RequestTargetProfileInput,
  type RequestTargetProfileViewModel
} from './request-target-profile-view-model.ts'

type FormatDate = (value: number) => string
type FormatTime = (value: number | string | undefined) => string
type ShortenProfileId = (profileId: string) => string

export type MobileContactProfileRequest = {
  alias?: string | null
  avatarUriSnapshot?: string | null
  deliveryState?: string | null
  displayNameSnapshot?: string | null
  profileId: string
  requestedAt?: number
  requestId?: string | null
  senderEncryptionPublicKey?: string | null
  text?: string | null
}

export type MobileProfileRequestTarget = RequestTargetProfileInput | null
type MobileProfileSelectionKind =
  | 'blocked'
  | 'incoming_request'
  | 'outgoing_request'
  | 'request_target'
  | 'trusted'
type MobileProfileSelectionValue =
  | ContactBookContact
  | MobileContactProfileRequest
  | RequestTargetProfileInput

export type MobileSelectedContactProfileView = (
  | ContactProfileViewModel
  | RequestTargetProfileViewModel
) &
  ProfileRecentPostsViewModel & {
    acceptRequest?: {
      createdAt?: number
      fromProfileId: string
      requestId: string
      senderEncryptionPublicKey: string
      text?: string | null
      toProfileId: string
      type: 'kepos.message.request.v1'
    }
    canAllowRequests?: boolean
    canRemove?: boolean
    ignoreRequest?: {
      profileId: string
    }
  }

export function createMobileSelectedContactProfileViewModel({
  activeHomeOwnerProfileId,
  blockedContacts = [],
  contacts = [],
  formatDate,
  formatTime,
  localProfileId,
  outgoingRequests = [],
  pendingRequests = [],
  profileRecentPostCache,
  profileRequestTarget = null,
  selectedProfileId,
  shortenProfileId,
  treeholePosts = []
}: {
  activeHomeOwnerProfileId?: string
  blockedContacts?: ContactBookContact[]
  contacts?: ContactBookContact[]
  formatDate: FormatDate
  formatTime: FormatTime
  localProfileId?: string | null
  outgoingRequests?: MobileContactProfileRequest[]
  pendingRequests?: MobileContactProfileRequest[]
  profileRecentPostCache?: ProfileRecentPostCache
  profileRequestTarget?: MobileProfileRequestTarget
  selectedProfileId?: string | null
  shortenProfileId: ShortenProfileId
  treeholePosts?: ProfileRecentTreeholePost[]
}): MobileSelectedContactProfileView | null {
  const selectedSource = selectProfileSelectionSource<
    MobileProfileSelectionKind,
    MobileProfileSelectionValue
  >({
    groups: [
      { kind: 'trusted', values: contacts },
      { kind: 'incoming_request', values: pendingRequests },
      { kind: 'outgoing_request', values: outgoingRequests },
      { kind: 'blocked', values: blockedContacts },
      { kind: 'request_target', values: profileRequestTarget ? [profileRequestTarget] : [] }
    ],
    selectedProfileId
  })
  if (!selectedSource) return null

  if (selectedSource.kind === 'trusted') {
    const selectedContact = selectedSource.value as ContactBookContact
    return withMobileProfileRecentPosts({
      activeHomeOwnerProfileId,
      formatTime,
      profile: createContactProfileViewModel({
        contact: selectedContact,
        formatDate,
        shortenProfileId
      }),
      profileRecentPostCache,
      treeholePosts
    })
  }

  if (selectedSource.kind === 'incoming_request') {
    return createMobileRequestProfile({
      formatDate,
      localProfileId,
      relationshipState: 'incoming_request',
      request: selectedSource.value as MobileContactProfileRequest,
      shortenProfileId
    })
  }

  if (selectedSource.kind === 'outgoing_request') {
    return createMobileRequestProfile({
      formatDate,
      relationshipState: 'outgoing_request',
      request: selectedSource.value as MobileContactProfileRequest,
      shortenProfileId
    })
  }

  if (selectedSource.kind === 'blocked') {
    const selectedBlockedContact = selectedSource.value as ContactBookContact
    return {
      ...createContactProfileViewModel({
        contact: selectedBlockedContact,
        formatDate,
        shortenProfileId
      }),
      canAllowRequests: true,
      canRemove: false,
      recentPosts: []
    }
  }

  const requestTargetProfile = createRequestTargetProfileViewModel({
    requestTarget: selectedSource.value as RequestTargetProfileInput,
    selectedProfileId,
    shortenProfileId
  })
  if (!requestTargetProfile) return null

  return {
    ...requestTargetProfile,
    recentPosts: []
  }
}

export function findPendingProfileRequest<TRequest extends { profileId: string }>(
  pendingRequests: TRequest[] | undefined,
  request: { profileId: string }
): TRequest | null {
  return pendingRequests?.find((candidate) => candidate.profileId === request.profileId) || null
}

function createMobileRequestProfile({
  formatDate,
  localProfileId,
  relationshipState,
  request,
  shortenProfileId
}: {
  formatDate: FormatDate
  localProfileId?: string | null
  relationshipState: 'incoming_request' | 'outgoing_request'
  request: MobileContactProfileRequest
  shortenProfileId: ShortenProfileId
}): MobileSelectedContactProfileView {
  const canAccept = Boolean(
    relationshipState === 'incoming_request' &&
    localProfileId &&
    request.requestId &&
    request.senderEncryptionPublicKey
  )

  return {
    ...createContactProfileViewModel({
      contact: {
        alias: request.alias || undefined,
        avatarUriSnapshot: request.avatarUriSnapshot || undefined,
        displayNameSnapshot: request.displayNameSnapshot || undefined,
        profileId: request.profileId,
        source: 'profile_qr'
      },
      deliveryState: request.deliveryState,
      formatDate,
      relationshipState,
      shortenProfileId
    }),
    acceptRequest: canAccept
      ? {
          createdAt: request.requestedAt,
          fromProfileId: request.profileId,
          requestId: request.requestId || '',
          senderEncryptionPublicKey: request.senderEncryptionPublicKey || '',
          text: request.text,
          toProfileId: localProfileId || '',
          type: 'kepos.message.request.v1'
        }
      : undefined,
    canRemove: false,
    ignoreRequest:
      relationshipState === 'incoming_request' ? { profileId: request.profileId } : undefined,
    recentPosts: []
  }
}

function withMobileProfileRecentPosts<
  TProfile extends ContactProfileViewModel & { profileId: string }
>({
  activeHomeOwnerProfileId,
  formatTime,
  profile,
  profileRecentPostCache,
  treeholePosts
}: {
  activeHomeOwnerProfileId?: string
  formatTime: FormatTime
  profile: TProfile
  profileRecentPostCache?: ProfileRecentPostCache
  treeholePosts?: ProfileRecentTreeholePost[]
}): MobileSelectedContactProfileView {
  return {
    ...profile,
    ...createProfileRecentPostsViewModel({
      activeHomeOwnerProfileId,
      cachedPostsByProfileId: profileRecentPostCache,
      formatTime,
      posts: treeholePosts,
      selectedProfileId: profile.profileId
    })
  }
}
