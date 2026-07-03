import { getContact, type ContactBook } from './contact-book.ts'
import {
  canSendFriendRequestFromRelationshipState,
  resolveProfileRelationshipStateFromBook,
  shouldBlockChatSendForRelationshipState,
  type ProfileRelationshipState
} from './profile-relationship-state.ts'
import { formatProfileFriendRequestDeliveryState } from './profile-friend-request-delivery.ts'
import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'

type ProfileRequestTarget = {
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
  avatarUri?: string
  displayName?: string
  profileId: string
}

export type FriendRequestTargetRelationshipState = Extract<
  ProfileRelationshipState,
  | 'blocked'
  | 'ignored'
  | 'incoming_request'
  | 'outgoing_request'
  | 'removed'
  | 'request_target'
  | 'trusted'
>

export type FriendRequestTargetViewModel = {
  avatar: ProfileAvatarViewModel
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
  avatarUri?: string
  canOpenProfile: boolean
  canSendRequest: boolean
  copy: string
  displayName: string
  profileId: string
  relationshipState: FriendRequestTargetRelationshipState
  shortProfileId: string
  statusLabel: string
}

export function shouldBlockChatSendForFriendRequestTarget({
  relationshipState
}: Pick<FriendRequestTargetViewModel, 'relationshipState'>): boolean {
  return shouldBlockChatSendForRelationshipState(relationshipState)
}

export function createFriendRequestTargetViewModel({
  contactBook,
  resolveAvatarMediaUri = null,
  shortenProfileId = (profileId) => profileId,
  target
}: {
  contactBook?: ContactBook | null
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  shortenProfileId?: (profileId: string) => string
  target: ProfileRequestTarget
}): FriendRequestTargetViewModel {
  const contact = contactBook ? getContact(contactBook, target.profileId) : null
  const displayName =
    contact?.alias || contact?.displayNameSnapshot || target.displayName || 'Profile'
  const avatarMediaSnapshot = contact?.avatarMediaSnapshot || target.avatarMediaSnapshot
  const avatarUri = contact?.avatarUriSnapshot || target.avatarUri
  const avatar = createProfileAvatarViewModel({
    avatarMediaSnapshot,
    avatarUri,
    displayName,
    profileId: target.profileId,
    resolveAvatarMediaUri
  })
  const relationshipState = resolveProfileRelationshipStateFromBook({
    book: contactBook,
    profileId: target.profileId
  })

  if (relationshipState === 'trusted') {
    return createView({
      avatar,
      avatarMediaSnapshot,
      avatarUri,
      canSendRequest: false,
      copy: 'Open their profile from Contacts.',
      displayName,
      relationshipState: 'trusted',
      shortProfileId: shortenProfileId(target.profileId),
      statusLabel: 'Already friends',
      target
    })
  }

  if (relationshipState === 'removed') {
    return createView({
      avatar,
      avatarMediaSnapshot,
      avatarUri,
      canSendRequest: false,
      copy: 'You removed this friend. Use Allow requests from Contacts before sending again.',
      displayName,
      relationshipState: 'removed',
      shortProfileId: shortenProfileId(target.profileId),
      statusLabel: 'Removed',
      target
    })
  }

  if (relationshipState === 'ignored') {
    return createView({
      avatar,
      avatarMediaSnapshot,
      avatarUri,
      canSendRequest: false,
      copy: 'You ignored this request. Use Allow requests from Contacts before sending again.',
      displayName,
      relationshipState: 'ignored',
      shortProfileId: shortenProfileId(target.profileId),
      statusLabel: 'Ignored',
      target
    })
  }

  if (relationshipState === 'outgoing_request') {
    const request = contactBook?.outgoingRequestsByProfileId.get(target.profileId)
    return createView({
      avatar,
      avatarMediaSnapshot,
      avatarUri,
      canSendRequest: false,
      copy: 'Your request is pending. Wait for them to accept.',
      displayName,
      relationshipState: 'outgoing_request',
      shortProfileId: shortenProfileId(target.profileId),
      statusLabel: formatProfileFriendRequestDeliveryState(request?.deliveryState),
      target
    })
  }

  if (relationshipState === 'incoming_request') {
    return createView({
      avatar,
      avatarMediaSnapshot,
      avatarUri,
      canSendRequest: false,
      copy: 'They already sent you a request. Accept it from Contacts.',
      displayName,
      relationshipState: 'incoming_request',
      shortProfileId: shortenProfileId(target.profileId),
      statusLabel: 'Request waiting',
      target
    })
  }

  return createView({
    avatar,
    avatarMediaSnapshot,
    avatarUri,
    canSendRequest: true,
    copy: 'Write a friend request to introduce yourself.',
    displayName,
    relationshipState: 'request_target',
    shortProfileId: shortenProfileId(target.profileId),
    statusLabel: 'Friend request',
    target
  })
}

function createView({
  avatar,
  avatarMediaSnapshot,
  avatarUri,
  canSendRequest,
  copy,
  displayName,
  relationshipState,
  shortProfileId,
  statusLabel,
  target
}: Omit<FriendRequestTargetViewModel, 'canOpenProfile' | 'profileId'> & {
  target: ProfileRequestTarget
}): FriendRequestTargetViewModel {
  return {
    avatar,
    ...(avatarMediaSnapshot ? { avatarMediaSnapshot } : {}),
    ...(avatarUri ? { avatarUri } : {}),
    canOpenProfile: true,
    canSendRequest: canSendRequest && canSendFriendRequestFromRelationshipState(relationshipState),
    copy,
    displayName,
    profileId: target.profileId,
    relationshipState,
    shortProfileId,
    statusLabel
  }
}
