export type ProfileRelationshipState =
  | 'blocked'
  | 'ignored'
  | 'incoming_request'
  | 'outgoing_request'
  | 'removed'
  | 'request_target'
  | 'trusted'

export type ProfileRelationshipContactSnapshot = {
  requestIgnoredAt?: number | null
  revokedAt?: number | null
  trustedAt?: number | null
}

export type ProfileRelationshipBookSnapshot = {
  contactsByProfileId?: Map<string, ProfileRelationshipContactSnapshot>
  outgoingRequestsByProfileId?: Map<string, unknown>
  pendingRequestsByProfileId?: Map<string, unknown>
}

export type StoredContactRelationshipState = Extract<
  ProfileRelationshipState,
  'ignored' | 'removed' | 'trusted'
>

export type ContactBookRelationshipState = Extract<
  ProfileRelationshipState,
  'ignored' | 'incoming_request' | 'outgoing_request' | 'removed' | 'request_target' | 'trusted'
>

export function inferStoredContactRelationshipState(
  contact: ProfileRelationshipContactSnapshot
): StoredContactRelationshipState {
  if (hasTimestamp(contact.revokedAt)) return 'removed'
  if (hasTimestamp(contact.requestIgnoredAt)) return 'ignored'
  return 'trusted'
}

export function resolveProfileRelationshipStateFromBook({
  book,
  fallbackState = 'request_target',
  profileId
}: {
  book?: ProfileRelationshipBookSnapshot | null
  fallbackState?: ContactBookRelationshipState
  profileId?: string | null
}): ContactBookRelationshipState {
  const cleanProfileId = profileId?.trim()
  if (!book || !cleanProfileId) return fallbackState

  const contact = book.contactsByProfileId?.get(cleanProfileId)
  if (contact && hasTimestamp(contact.trustedAt) && !hasTimestamp(contact.revokedAt)) {
    return 'trusted'
  }
  if (contact && hasTimestamp(contact.revokedAt)) return 'removed'
  if (contact && hasTimestamp(contact.requestIgnoredAt)) return 'ignored'
  if (book.outgoingRequestsByProfileId?.has(cleanProfileId)) return 'outgoing_request'
  if (book.pendingRequestsByProfileId?.has(cleanProfileId)) return 'incoming_request'

  return fallbackState
}

export function canSendFriendRequestFromRelationshipState(
  relationshipState: ProfileRelationshipState
): boolean {
  return relationshipState === 'request_target'
}

export function shouldBlockChatSendForRelationshipState(
  relationshipState: ProfileRelationshipState
): boolean {
  return (
    relationshipState === 'blocked' ||
    relationshipState === 'ignored' ||
    relationshipState === 'incoming_request' ||
    relationshipState === 'outgoing_request' ||
    relationshipState === 'removed'
  )
}

export function isTrustedRelationshipState(relationshipState: ProfileRelationshipState): boolean {
  return relationshipState === 'trusted'
}

export function canRespondToFriendRequestForRelationshipState(
  relationshipState?: ProfileRelationshipState | null
): boolean {
  return relationshipState === 'incoming_request'
}

export function canAllowRequestsForRelationshipState(
  relationshipState?: ProfileRelationshipState | null
): boolean {
  return relationshipState === 'ignored' || relationshipState === 'removed'
}

function hasTimestamp(value: number | null | undefined): boolean {
  return value !== undefined && value !== null
}
