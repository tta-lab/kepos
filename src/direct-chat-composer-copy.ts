import {
  canSendFriendRequestFromRelationshipState,
  type ProfileRelationshipState
} from './profile-relationship-state.ts'

export type DirectChatComposerCopyInput = {
  relationshipState?: ProfileRelationshipState | null
  threadLabel?: string | null
}

export type DirectChatComposerCopy = {
  placeholder: string
  sendLabel: string
}

export function getDirectChatComposerCopy({
  relationshipState,
  threadLabel
}: DirectChatComposerCopyInput = {}): DirectChatComposerCopy {
  if (relationshipState && canSendFriendRequestFromRelationshipState(relationshipState)) {
    return {
      placeholder: 'Write an intro for this friend request',
      sendLabel: 'Send request'
    }
  }

  const cleanThreadLabel = threadLabel?.trim()

  return {
    placeholder: cleanThreadLabel ? `Message ${cleanThreadLabel}` : 'Write a private message',
    sendLabel: 'Send message'
  }
}
