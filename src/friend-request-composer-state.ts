import { normalizeComposerText } from './composer-text.ts'
import {
  canSendFriendRequestFromRelationshipState,
  type ProfileRelationshipState
} from './profile-relationship-state.ts'

export type FriendRequestComposerTarget = {
  copy?: string
  displayName?: string
  profileId: string
  relationshipState?: ProfileRelationshipState
  shortProfileId?: string
} | null

export type FriendRequestComposerStateInput = {
  draft?: unknown
  recipientProfileId?: string | null
  requestTarget?: FriendRequestComposerTarget
}

export type FriendRequestComposerState = {
  canSend: boolean
  copy: string
  isVisible: boolean
  placeholder: string
  profileId: string
  sendLabel: string
  text: string
  title: string
}

export function createFriendRequestComposerState({
  draft,
  recipientProfileId,
  requestTarget
}: FriendRequestComposerStateInput = {}): FriendRequestComposerState {
  const text = normalizeComposerText(draft)
  const profileId = requestTarget?.profileId?.trim() || ''
  const selectedProfileId = recipientProfileId?.trim() || ''
  const isVisible = Boolean(
    profileId &&
    profileId === selectedProfileId &&
    requestTarget?.relationshipState &&
    canSendFriendRequestFromRelationshipState(requestTarget.relationshipState)
  )
  const displayName =
    requestTarget?.displayName?.trim() ||
    requestTarget?.shortProfileId?.trim() ||
    (profileId ? 'this profile' : 'this person')

  return {
    canSend: isVisible && Boolean(text),
    copy: requestTarget?.copy || 'Write a short request before this becomes a Chat.',
    isVisible,
    placeholder: 'Write a short friend request',
    profileId: selectedProfileId,
    sendLabel: 'Send request',
    text,
    title: `Add ${displayName}`
  }
}
