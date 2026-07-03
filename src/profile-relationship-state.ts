export type ProfileRelationshipState =
  | 'blocked'
  | 'ignored'
  | 'incoming_request'
  | 'outgoing_request'
  | 'removed'
  | 'request_target'
  | 'trusted'

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

export function canAllowRequestsForRelationshipState(
  relationshipState: ProfileRelationshipState
): boolean {
  return relationshipState === 'ignored' || relationshipState === 'removed'
}
