import { getContact, isContactRevoked, isContactTrusted, type ContactBook } from './contact-book.ts'
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
  homeDescriptor?: Record<string, unknown>
  profileId: string
}

export type FriendRequestTargetRelationshipState =
  | 'blocked'
  | 'incoming_request'
  | 'new'
  | 'outgoing_request'
  | 'trusted'

export type FriendRequestTargetViewModel = {
  avatar: ProfileAvatarViewModel
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
  avatarUri?: string
  canOpenProfile: boolean
  canSendRequest: boolean
  copy: string
  displayName: string
  homeDescriptor?: Record<string, unknown>
  profileId: string
  relationshipState: FriendRequestTargetRelationshipState
  shortProfileId: string
  statusLabel: string
}

export function shouldBlockChatSendForFriendRequestTarget({
  relationshipState
}: Pick<FriendRequestTargetViewModel, 'relationshipState'>): boolean {
  return (
    relationshipState === 'blocked' ||
    relationshipState === 'incoming_request' ||
    relationshipState === 'outgoing_request'
  )
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

  if (contactBook && isContactTrusted(contactBook, target.profileId)) {
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

  if (contactBook && isContactRevoked(contactBook, target.profileId)) {
    return createView({
      avatar,
      avatarMediaSnapshot,
      avatarUri,
      canSendRequest: false,
      copy: 'You removed this friend. Use Allow requests from Contacts before sending again.',
      displayName,
      relationshipState: 'blocked',
      shortProfileId: shortenProfileId(target.profileId),
      statusLabel: 'Removed',
      target
    })
  }

  if (contact?.requestIgnoredAt !== undefined && contact.requestIgnoredAt !== null) {
    return createView({
      avatar,
      avatarMediaSnapshot,
      avatarUri,
      canSendRequest: false,
      copy: 'You ignored this request. Use Allow requests from Contacts before sending again.',
      displayName,
      relationshipState: 'blocked',
      shortProfileId: shortenProfileId(target.profileId),
      statusLabel: 'Ignored',
      target
    })
  }

  if (contactBook?.outgoingRequestsByProfileId?.has(target.profileId)) {
    const request = contactBook.outgoingRequestsByProfileId.get(target.profileId)
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

  if (contactBook?.pendingRequestsByProfileId?.has(target.profileId)) {
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
    copy: 'Write an intro in Chat to send a friend request.',
    displayName,
    relationshipState: 'new',
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
    canSendRequest,
    copy,
    displayName,
    ...(target.homeDescriptor ? { homeDescriptor: target.homeDescriptor } : {}),
    profileId: target.profileId,
    relationshipState,
    shortProfileId,
    statusLabel
  }
}
