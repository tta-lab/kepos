import {
  createProfileRecentPostsViewModel,
  type ProfileRecentPostCache,
  type ProfileRecentPostsViewModel,
  type ProfileRecentTreeholePost
} from './profile-recent-posts-view-model.ts'
import { selectProfileSelectionSource } from './profile-selection-source.ts'
import {
  createRequestTargetProfileViewModel,
  type RequestTargetProfileInput
} from './request-target-profile-view-model.ts'

type FormatTime = (value: number | string | undefined) => string
type ShortenProfileId = (profileId: string) => string

export type DesktopProfileSelectionProfile<TAcceptMessage = unknown> = {
  acceptMessage?: TAcceptMessage
  alias: string
  avatar?: {
    imageUri?: string
    initials: string
    label: string
    tone: string
  }
  canRemove?: boolean
  homeActionEnabled: boolean
  homeActionLabel: string
  messageActionEnabled: boolean
  messageActionLabel: string
  profileId: string
  recentCopy?: string
  recentTitle: string
  relationshipState: string
  revokeActionLabel?: string
  shortProfileId: string
  sourceLabel: string
  statusLabel: string
  trustedAtLabel: string
}

export type DesktopSelectedProfileView<TAcceptMessage = unknown> =
  DesktopProfileSelectionProfile<TAcceptMessage> & ProfileRecentPostsViewModel

export type DesktopProfileSelectionPeople<
  TBlockedContact = unknown,
  TMessageRequest = unknown,
  TOutgoingRequest = unknown,
  TProfile extends DesktopProfileSelectionProfile = DesktopProfileSelectionProfile
> = {
  blockedContacts: TBlockedContact[]
  messageRequests: TMessageRequest[]
  outgoingRequests: TOutgoingRequest[]
  profileDetails?: TProfile[]
  trustedContacts: TProfile[]
}

export type DesktopProfileRequestTarget = RequestTargetProfileInput | null
type DesktopProfileSelectionKind = 'profile_detail' | 'request_target'
type DesktopProfileSelectionValue<TProfile extends DesktopProfileSelectionProfile> =
  | TProfile
  | RequestTargetProfileInput

export function createDesktopProfileSelectionViewModel<
  TBlockedContact,
  TMessageRequest,
  TOutgoingRequest,
  TProfile extends DesktopProfileSelectionProfile
>({
  activeHomeOwnerProfileId,
  formatTime,
  people,
  profileRecentPostCache,
  profileRequestTarget = null,
  selectedProfileId,
  shortenProfileId,
  treeholePosts = []
}: {
  activeHomeOwnerProfileId?: string
  formatTime: FormatTime
  people: DesktopProfileSelectionPeople<
    TBlockedContact,
    TMessageRequest,
    TOutgoingRequest,
    TProfile
  >
  profileRecentPostCache?: ProfileRecentPostCache
  profileRequestTarget?: DesktopProfileRequestTarget
  selectedProfileId?: string
  shortenProfileId: ShortenProfileId
  treeholePosts?: ProfileRecentTreeholePost[]
}): {
  people: Omit<
    DesktopProfileSelectionPeople<TBlockedContact, TMessageRequest, TOutgoingRequest, TProfile>,
    'profileDetails' | 'trustedContacts'
  > & {
    profileDetails: Array<TProfile & ProfileRecentPostsViewModel>
    trustedContacts: Array<TProfile & ProfileRecentPostsViewModel>
  }
  selectedProfile: DesktopSelectedProfileView<TProfile['acceptMessage']> | null
} {
  const trustedContacts = people.trustedContacts.map((profile) =>
    withDesktopProfileRecentPosts({
      activeHomeOwnerProfileId,
      formatTime,
      profile,
      profileRecentPostCache,
      treeholePosts
    })
  )
  const profileDetails = (people.profileDetails || people.trustedContacts).map((profile) =>
    withDesktopProfileRecentPosts({
      activeHomeOwnerProfileId,
      formatTime,
      profile,
      profileRecentPostCache,
      treeholePosts
    })
  )
  const selectedSource = selectProfileSelectionSource<
    DesktopProfileSelectionKind,
    DesktopProfileSelectionValue<TProfile & ProfileRecentPostsViewModel>
  >({
    groups: [
      { kind: 'profile_detail', values: profileDetails },
      { kind: 'request_target', values: profileRequestTarget ? [profileRequestTarget] : [] }
    ],
    selectedProfileId
  })

  return {
    people: {
      ...people,
      profileDetails,
      trustedContacts
    },
    selectedProfile:
      selectedSource?.kind === 'profile_detail'
        ? (selectedSource.value as TProfile & ProfileRecentPostsViewModel)
        : createDesktopRequestTargetProfileViewModel({
            profileRequestTarget: selectedSource?.value as RequestTargetProfileInput | undefined,
            selectedProfileId,
            shortenProfileId
          })
  }
}

function createDesktopRequestTargetProfileViewModel({
  profileRequestTarget,
  selectedProfileId,
  shortenProfileId
}: {
  profileRequestTarget?: DesktopProfileRequestTarget
  selectedProfileId?: string
  shortenProfileId: ShortenProfileId
}): DesktopSelectedProfileView | null {
  const profile = createRequestTargetProfileViewModel({
    requestTarget: profileRequestTarget,
    selectedProfileId,
    shortenProfileId
  })
  if (!profile) return null

  return {
    alias: profile.displayName,
    avatar: profile.avatar,
    canRemove: profile.canRemove,
    homeActionEnabled: profile.enterHomeEnabled,
    homeActionLabel: profile.enterHomeLabel,
    messageActionEnabled: profile.messageEnabled,
    messageActionLabel: profile.messageLabel,
    profileId: profile.profileId,
    recentCopy: profile.recentCopy,
    recentPosts: [],
    recentTitle: profile.recentTitle,
    relationshipState: profile.relationshipState,
    revokeActionLabel: profile.revokeLabel,
    shortProfileId: profile.shortProfileId,
    sourceLabel: profile.sourceLabel,
    statusLabel: profile.statusLabel,
    trustedAtLabel: profile.trustedAtLabel
  }
}

function withDesktopProfileRecentPosts<TProfile extends DesktopProfileSelectionProfile>({
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
}): TProfile & ProfileRecentPostsViewModel {
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
