import {
  canSendFriendRequestFromRelationshipState,
  type ProfileRelationshipState
} from './profile-relationship-state.ts'

export type DirectChatEmptyCopyInput = {
  relationshipState?: ProfileRelationshipState | null
}

export function getDirectChatEmptyCopy({
  relationshipState
}: DirectChatEmptyCopyInput = {}): string {
  if (relationshipState && canSendFriendRequestFromRelationshipState(relationshipState)) {
    return 'Write an intro to send this friend request.'
  }

  return 'Choose a trusted contact and send the first message.'
}
